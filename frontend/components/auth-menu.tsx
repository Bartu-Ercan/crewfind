"use client";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Check, ChevronDown, KeyRound, LoaderCircle, LogIn, Mail, ShieldCheck, UserRound, X } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/backend/supabase/browser-client";
import { useAccount } from "@/frontend/components/account-provider";
import {
  AUTH_MODAL_MODE_STORAGE_KEY,
  AUTH_NEEDS_PASSWORD_STORAGE_KEY,
  AUTH_OAUTH_TERMS_PENDING_STORAGE_KEY,
  AUTH_PENDING_INTENT_STORAGE_KEY,
  AUTH_TERMS_STORAGE_KEY,
  buildAuthCallbackUrl,
} from "@/frontend/lib/auth-flow";
import { isEmailAlreadyRegisteredError, readableError } from "@/frontend/lib/error-messages";
import { TERMS_VERSION } from "@/frontend/types/account";

type AuthMode = "login" | "register" | "reset" | "set-password";

function GoogleMark() {
  return (
    <svg className="google-mark" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.716v2.259h2.909c1.702-1.567 2.684-3.874 2.684-6.616Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.179l-2.909-2.259c-.806.54-1.836.859-3.047.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.963 10.707A5.42 5.42 0 0 1 3.682 9c0-.593.102-1.17.281-1.707V4.961H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.039l3.007-2.332Z" />
      <path fill="#EA4335" d="M9 3.579c1.322 0 2.508.454 3.441 1.346l2.581-2.581C13.464.892 11.43 0 9 0A9 9 0 0 0 .956 4.961l3.007 2.332C4.672 5.164 6.656 3.579 9 3.579Z" />
    </svg>
  );
}

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe:not([tabindex='-1'])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function AuthMenu({ disabled, theme }: { disabled: boolean; theme: "light" | "dark" }) {
  const { user, overview, isPermanent, loading, refresh } = useAccount();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [emailFlowStarted, setEmailFlowStarted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const headingId = useId();
  const descriptionId = useId();
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const turnstileEnabled = Boolean(turnstileSiteKey) && process.env.NEXT_PUBLIC_TURNSTILE_ENABLED !== "false";
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
  const socialEnabled = googleEnabled;
  const authModalOpen = open && (!isPermanent || mode === "set-password");
  const signedPopoverOpen = open && isPermanent && Boolean(overview) && mode !== "set-password";
  const anonymousEmailUpgrade = mode === "register" && Boolean(user?.is_anonymous);
  const passwordVisible = mode === "login" || mode === "set-password" || (mode === "register" && !user?.is_anonymous);
  const captchaRequired = turnstileEnabled && (mode === "login" || mode === "reset" || (mode === "register" && !user?.is_anonymous));
  const captchaVisible = captchaRequired && emailFlowStarted;

  useEffect(() => {
    const shouldSetPassword = sessionStorage.getItem(AUTH_MODAL_MODE_STORAGE_KEY) === "set-password"
      || localStorage.getItem(AUTH_NEEDS_PASSWORD_STORAGE_KEY) === "true"
      || user?.user_metadata?.needs_password === true;
    if (!shouldSetPassword) return;
    sessionStorage.removeItem(AUTH_MODAL_MODE_STORAGE_KEY);
    setMode("set-password");
    setOpen(true);
  }, [user]);

  useEffect(() => {
    if (!signedPopoverOpen) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [signedPopoverOpen]);

  useEffect(() => {
    if (!authModalOpen) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? dialogRef.current)?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, [authModalOpen]);

  function resetFeedback() {
    setError("");
    setMessage("");
  }

  function resetCaptcha() {
    setCaptchaToken("");
    turnstileRef.current?.reset();
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setPassword("");
    setAccepted(false);
    setEmailFlowStarted(false);
    resetFeedback();
    resetCaptcha();
  }

  function closeAuthModal() {
    setOpen(false);
    setBusy(false);
    switchMode("login");
  }

  function callbackUrl(intent: "oauth-login" | "oauth-link" | "email-confirm" | "email-link" | "password-recovery") {
    localStorage.setItem(AUTH_PENDING_INTENT_STORAGE_KEY, intent);
    return buildAuthCallbackUrl(window.location.origin, intent, window.location.pathname);
  }

  async function social() {
    resetFeedback();
    setEmailFlowStarted(false);
    resetCaptcha();
    setBusy(true);
    localStorage.setItem(AUTH_OAUTH_TERMS_PENDING_STORAGE_KEY, TERMS_VERSION);
    const client = getSupabaseBrowserClient();
    const shouldLink = mode === "register" && Boolean(user?.is_anonymous);
    const result = shouldLink
      ? await client.auth.linkIdentity({ provider: "google", options: { redirectTo: callbackUrl("oauth-link") } })
      : await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callbackUrl("oauth-login") } });
    if (result.error) {
      localStorage.removeItem(AUTH_PENDING_INTENT_STORAGE_KEY);
      localStorage.removeItem(AUTH_OAUTH_TERMS_PENDING_STORAGE_KEY);
      setError(result.error.message.toLowerCase().includes("already")
        ? "Bu kimlik mevcut bir CrewFind hesabına bağlı. Giriş ekranını kullan."
        : readableError(result.error));
      setBusy(false);
    }
  }

  async function submitEmail(event: FormEvent) {
    event.preventDefault();
    resetFeedback();
    if (captchaRequired && !captchaToken) {
      setEmailFlowStarted(true);
      setError("Güvenlik kontrolü hazırlanıyor. Bir saniye sonra tekrar dene.");
      return;
    }
    if (passwordVisible && (password.length < 8 || password.length > 72)) {
      setError("Parola 8-72 karakter olmalı.");
      return;
    }
    if (mode === "register" && !accepted) {
      setError("Gizlilik ve kullanım koşullarını kabul et.");
      return;
    }

    setBusy(true);
    const client = getSupabaseBrowserClient();
    try {
      if (mode === "set-password") {
        const { error: passwordError } = await client.auth.updateUser({
          password,
          data: { needs_password: false },
        });
        if (passwordError) setError(readableError(passwordError));
        else {
          localStorage.removeItem(AUTH_NEEDS_PASSWORD_STORAGE_KEY);
          setMessage("Parolan oluşturuldu.");
          await refresh();
          setOpen(false);
          setMode("login");
        }
        return;
      }
      if (mode === "reset") {
        const { error: resetError } = await client.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: callbackUrl("password-recovery"),
          captchaToken: captchaToken || undefined,
        });
        if (resetError) {
          localStorage.removeItem(AUTH_PENDING_INTENT_STORAGE_KEY);
          setError(readableError(resetError));
        }
        else setMessage("Adres kayıtlıysa parola yenileme bağlantısı gönderildi.");
        return;
      }
      if (mode === "login") {
        const { error: loginError } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
          options: { captchaToken: captchaToken || undefined },
        });
        if (loginError) setError("E-posta veya parola hatalı.");
        else {
          await refresh();
          setOpen(false);
        }
        return;
      }

      localStorage.setItem(AUTH_TERMS_STORAGE_KEY, TERMS_VERSION);
      if (user?.is_anonymous) {
        const { error: emailError } = await client.auth.updateUser(
          { email: email.trim(), data: { terms_version: TERMS_VERSION, needs_password: true } },
          { emailRedirectTo: callbackUrl("email-link") },
        );
        if (emailError) {
          localStorage.removeItem(AUTH_PENDING_INTENT_STORAGE_KEY);
          localStorage.removeItem(AUTH_TERMS_STORAGE_KEY);
          if (isEmailAlreadyRegisteredError(emailError)) {
            setMode("login");
            setPassword("");
            setAccepted(false);
            setEmailFlowStarted(false);
          }
          setError(readableError(emailError));
        } else {
          setMessage("E-posta doğrulama bağlantısı gönderildi. Bağlantıdan sonra parolanı oluştur.");
        }
        return;
      }
      const { error: registerError } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: callbackUrl("email-confirm"),
          captchaToken: captchaToken || undefined,
          data: { terms_version: TERMS_VERSION, needs_password: false },
        },
      });
      if (registerError) {
        localStorage.removeItem(AUTH_PENDING_INTENT_STORAGE_KEY);
        localStorage.removeItem(AUTH_TERMS_STORAGE_KEY);
        setError(readableError(registerError));
      } else setMessage("Yeni hesapsa doğrulama bağlantısı gönderildi. Gelmediyse adres zaten kayıtlı olabilir.");
    } finally {
      setBusy(false);
      if (captchaRequired) resetCaptcha();
    }
  }

  async function signOut() {
    if (disabled) return;
    await getSupabaseBrowserClient().auth.signOut();
    setOpen(false);
    await refresh();
  }

  const title = mode === "register"
    ? "Hesap oluştur"
    : mode === "reset"
      ? "Parolanı yenile"
      : mode === "set-password"
        ? "Parolanı oluştur"
        : "Tekrar hoş geldin";

  if (loading) return <button className="account-trigger" disabled><LoaderCircle className="spin" size={15} /></button>;

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        className={`account-trigger ${isPermanent ? "signed-in" : ""}`}
        type="button"
        disabled={disabled && !isPermanent}
        aria-expanded={open}
        aria-haspopup={isPermanent ? "menu" : "dialog"}
        aria-label={overview?.username ? `${overview.username} hesap menüsü` : "Giriş menüsü"}
        onClick={() => setOpen((value) => !value)}
      >
        {overview?.avatarUrl ? <span className="account-avatar" style={{ backgroundImage: `url(${overview.avatarUrl})` }} /> : <UserRound size={15} />}
        <span>{overview?.username ?? "Giriş yap"}</span>
        <ChevronDown size={14} className={open ? "open" : ""} />
      </button>
      {signedPopoverOpen && overview ? (
        <div className="account-popover signed-popover" role="menu">
          <div className="account-summary"><span>{overview.username}</span><small>{overview.email ?? "Bağlı hesap"}</small></div>
          <Link href="/hesabim" role="menuitem" onClick={() => setOpen(false)}><UserRound size={15} /> Hesabım</Link>
          <button type="button" role="menuitem" disabled={disabled} onClick={signOut}><LogIn size={15} /> Çıkış yap</button>
          {disabled ? <small className="account-disabled-note">Önce aramayı veya lobiyi sonlandır.</small> : null}
        </div>
      ) : null}
      {authModalOpen ? (
        <div className="auth-modal-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) closeAuthModal(); }}>
          <section
            ref={dialogRef}
            className="account-popover auth-popover auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            aria-describedby={descriptionId}
            tabIndex={-1}
          >
            <div className="auth-heading">
              <div><span>CREWFIND HESABI</span><strong id={headingId}>{title}</strong></div>
              <button type="button" aria-label="Kapat" onClick={closeAuthModal}><X size={16} /></button>
            </div>
            <p id={descriptionId} className="auth-description">
              {mode === "set-password"
                ? "Doğrulanan hesabın için yeni bir parola belirle."
                : anonymousEmailUpgrade
                  ? "Misafir oturumun ve aktif CrewFind kimliğin korunur."
                  : "Misafir olarak devam edebilir veya hesabına giriş yapabilirsin."}
            </p>
            {mode === "login" || mode === "register" ? (
              <div className="auth-mode-switch" aria-label="Giriş işlemi">
                <button type="button" className={mode === "login" ? "selected" : ""} aria-pressed={mode === "login"} onClick={() => switchMode("login")}>Giriş yap</button>
                <button type="button" className={mode === "register" ? "selected" : ""} aria-pressed={mode === "register"} onClick={() => switchMode("register")}>Hesap oluştur</button>
              </div>
            ) : null}
            {mode !== "reset" && mode !== "set-password" && socialEnabled ? (
              <div className="social-auth">
                {googleEnabled ? <button type="button" disabled={busy} onClick={() => void social()}><GoogleMark /> Google ile devam et</button> : null}
                <p className="auth-social-consent">Google ile devam ederek <Link href="/kullanim-kosullari">Kullanım Koşulları</Link>nı ve <Link href="/gizlilik">Gizlilik Politikası</Link>nı kabul edersin.</p>
              </div>
            ) : null}
            {mode !== "reset" && mode !== "set-password" && socialEnabled ? <div className="auth-divider"><span />veya<span /></div> : null}
            <form className="auth-form" onSubmit={submitEmail}>
              {mode !== "set-password" ? <label><span>E-posta</span><div><Mail size={15} /><input type="email" required autoComplete="email" value={email} onFocus={() => setEmailFlowStarted(true)} onChange={(event) => setEmail(event.target.value)} placeholder="mail@ornek.com" /></div></label> : null}
              {passwordVisible ? <label><span>{mode === "set-password" ? "Yeni parola" : "Parola"}</span><div><KeyRound size={15} /><input type="password" required minLength={8} maxLength={72} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onFocus={() => setEmailFlowStarted(true)} onChange={(event) => setPassword(event.target.value)} placeholder="En az 8 karakter" /></div></label> : null}
              {mode === "register" ? <label className="terms-check"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span><Link href="/kullanim-kosullari">Kullanım Koşulları</Link> ve <Link href="/gizlilik">Gizlilik Politikası</Link>nı kabul ediyorum.</span></label> : null}
              {captchaVisible && turnstileSiteKey ? <Turnstile className="turnstile-sentinel" ref={turnstileRef} siteKey={turnstileSiteKey} onSuccess={(token) => { setCaptchaToken(token); setError(""); }} onExpire={() => { setCaptchaToken(""); turnstileRef.current?.reset(); }} onError={() => { setCaptchaToken(""); setError("Güvenlik kontrolü yüklenemedi. Tekrar dene."); window.setTimeout(() => turnstileRef.current?.reset(), 250); }} options={{ action: "email_auth", size: "invisible", tabIndex: -1, responseField: false, theme }} /> : null}
              <div aria-live="polite">
                {error ? <p className="auth-feedback error"><X size={14} />{error}</p> : null}
                {message ? <p className="auth-feedback success"><Check size={14} />{message}</p> : null}
              </div>
              {message && mode === "register" ? <button type="button" className="auth-recovery-link" onClick={() => switchMode("reset")}>E-posta gelmediyse parola bağlantısı iste</button> : null}
              <button className="auth-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <ShieldCheck size={16} />}{mode === "register" ? "Hesap oluştur" : mode === "reset" ? "Bağlantı gönder" : mode === "set-password" ? "Parolayı kaydet" : "Giriş yap"}</button>
            </form>
            {mode !== "set-password" ? <div className="auth-switch">
              {mode === "login" ? <button type="button" onClick={() => switchMode("reset")}>Parolamı unuttum</button> : mode === "reset" ? <button type="button" onClick={() => switchMode("login")}>Giriş ekranına dön</button> : null}
            </div> : null}
            <p className="auth-legal"><Link href="/kullanim-kosullari">Kullanım Koşulları</Link> · <Link href="/gizlilik">Gizlilik Politikası</Link></p>
          </section>
        </div>
      ) : null}
    </div>
  );
}
