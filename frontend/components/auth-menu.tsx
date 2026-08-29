"use client";

import { Check, ChevronDown, KeyRound, LoaderCircle, LogIn, Mail, ShieldCheck, UserRound, X } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { getSupabaseBrowserClient } from "@/backend/supabase/browser-client";
import { useAccount } from "@/frontend/components/account-provider";
import { TERMS_VERSION } from "@/frontend/types/account";
import { readableError } from "@/frontend/lib/error-messages";

type AuthMode = "login" | "register" | "reset";

export function AuthMenu({ disabled, theme }: { disabled: boolean; theme: "light" | "dark" }) {
  const { user, overview, isPermanent, loading, refresh } = useAccount();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const turnstileEnabled = Boolean(turnstileSiteKey) && process.env.NEXT_PUBLIC_TURNSTILE_ENABLED !== "false";
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
  const discordEnabled = process.env.NEXT_PUBLIC_DISCORD_AUTH_ENABLED === "true";
  const socialEnabled = googleEnabled || discordEnabled;

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  function resetFeedback() {
    setError("");
    setMessage("");
  }

  async function social(provider: "google" | "discord") {
    resetFeedback();
    setBusy(true);
    const client = getSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`;
    localStorage.setItem("crewfind-auth-terms", TERMS_VERSION);
    const result = user?.is_anonymous
      ? await client.auth.linkIdentity({ provider, options: { redirectTo } })
      : await client.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (result.error) {
      setError(result.error.message.includes("already")
        ? "Bu kimlik mevcut bir CrewFind hesabına bağlı. Önce mevcut hesaba giriş yap."
        : readableError(result.error));
      setBusy(false);
    }
  }

  async function submitEmail(event: FormEvent) {
    event.preventDefault();
    resetFeedback();
    if (turnstileEnabled && !captchaToken) {
      setError("Güvenlik doğrulamasını tamamla.");
      return;
    }
    if (mode !== "reset" && (password.length < 10 || password.length > 72)) {
      setError("Parola 10-72 karakter olmalı.");
      return;
    }
    if (mode === "register" && !accepted) {
      setError("Gizlilik ve kullanım koşullarını kabul et.");
      return;
    }
    setBusy(true);
    const client = getSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`;
    if (mode === "reset") {
      localStorage.setItem("crewfind-needs-password", "true");
      const { error: resetError } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
        captchaToken: captchaToken || undefined,
      });
      setBusy(false);
      if (resetError) setError(readableError(resetError));
      else setMessage("Şifre yenileme bağlantısı gönderildi.");
      return;
    }
    if (mode === "login") {
      const { error: loginError } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
        options: { captchaToken: captchaToken || undefined },
      });
      setBusy(false);
      if (loginError) setError("E-posta veya parola hatalı.");
      else {
        await refresh();
        setOpen(false);
      }
      return;
    }
    localStorage.setItem("crewfind-auth-terms", TERMS_VERSION);
    if (user?.is_anonymous) {
      const { error: emailError } = await client.auth.updateUser({ email: email.trim() }, { emailRedirectTo: redirectTo });
      if (!emailError) localStorage.setItem("crewfind-needs-password", "true");
      setBusy(false);
      if (emailError) setError(readableError(emailError));
      else setMessage("E-posta doğrulama bağlantısı gönderildi. Doğrulamadan sonra Hesabım sayfasından parolanı belirle.");
      return;
    }
    const { error: registerError } = await client.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: redirectTo, captchaToken: captchaToken || undefined, data: { terms_version: TERMS_VERSION } },
    });
    setBusy(false);
    if (registerError) setError(readableError(registerError));
    else setMessage("Doğrulama bağlantısı gönderildi.");
  }

  async function signOut() {
    if (disabled) return;
    await getSupabaseBrowserClient().auth.signOut();
    setOpen(false);
    await refresh();
  }

  if (loading) return <button className="account-trigger" disabled><LoaderCircle className="spin" size={15} /></button>;

  return (
    <div className="account-menu" ref={rootRef}>
      <button className={`account-trigger ${isPermanent ? "signed-in" : ""}`} type="button" aria-expanded={open} aria-label={overview?.username ? `${overview.username} hesap menüsü` : "Giriş menüsü"} onClick={() => setOpen((value) => !value)}>
        {overview?.avatarUrl ? <span className="account-avatar" style={{ backgroundImage: `url(${overview.avatarUrl})` }} /> : <UserRound size={15} />}
        <span>{overview?.username ?? "Giriş"}</span>
        <ChevronDown size={14} className={open ? "open" : ""} />
      </button>
      {open && isPermanent && overview ? (
        <div className="account-popover signed-popover">
          <div className="account-summary"><span>{overview.username}</span><small>{overview.email ?? "Bağlı hesap"}</small></div>
          <Link href="/hesabim" onClick={() => setOpen(false)}><UserRound size={15} /> Hesabım</Link>
          <button type="button" disabled={disabled} onClick={signOut}><LogIn size={15} /> Çıkış yap</button>
          {disabled ? <small className="account-disabled-note">Önce aramayı veya lobiyi sonlandır.</small> : null}
        </div>
      ) : null}
      {open && !isPermanent ? (
        <div className="account-popover auth-popover">
          <div className="auth-heading"><div><span>CREWFIND HESABI</span><strong>{mode === "register" ? "Hesap oluştur" : mode === "reset" ? "Parolanı yenile" : "Tekrar hoş geldin"}</strong></div><button type="button" aria-label="Kapat" onClick={() => setOpen(false)}><X size={16} /></button></div>
          {mode !== "reset" && socialEnabled ? <div className="social-auth">{googleEnabled ? <button type="button" disabled={busy} onClick={() => void social("google")}><span className="provider-letter">G</span> Google ile devam et</button> : null}{discordEnabled ? <button type="button" disabled={busy} onClick={() => void social("discord")}><span className="provider-letter">D</span> Discord ile devam et</button> : null}</div> : null}
          {mode !== "reset" && socialEnabled ? <div className="auth-divider"><span />veya<span /></div> : null}
          <form className="auth-form" onSubmit={submitEmail}>
            <label><span>E-posta</span><div><Mail size={15} /><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="mail@ornek.com" /></div></label>
            {mode !== "reset" ? <label><span>Parola</span><div><KeyRound size={15} /><input type="password" required minLength={10} maxLength={72} autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="En az 10 karakter" /></div></label> : null}
            {mode === "register" ? <label className="terms-check"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span><Link href="/kullanim-kosullari">Kullanım Koşulları</Link> ve <Link href="/gizlilik">Gizlilik Politikası</Link>nı kabul ediyorum.</span></label> : null}
            {turnstileEnabled && turnstileSiteKey ? <Turnstile siteKey={turnstileSiteKey} onSuccess={setCaptchaToken} onExpire={() => setCaptchaToken("")} options={{ appearance: "interaction-only", theme, size: "flexible" }} /> : null}
            {error ? <p className="auth-feedback error"><X size={14} />{error}</p> : null}
            {message ? <p className="auth-feedback success"><Check size={14} />{message}</p> : null}
            <button className="auth-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <ShieldCheck size={16} />}{mode === "register" ? "Hesap oluştur" : mode === "reset" ? "Bağlantı gönder" : "Giriş yap"}</button>
          </form>
          <div className="auth-switch">
            {mode === "login" ? <><button type="button" onClick={() => { setMode("register"); resetFeedback(); }}>Hesap oluştur</button><button type="button" onClick={() => { setMode("reset"); resetFeedback(); }}>Parolamı unuttum</button></> : <button type="button" onClick={() => { setMode("login"); resetFeedback(); }}>Giriş ekranına dön</button>}
          </div>
          <p className="auth-legal">Devam ederek CrewFind sözleşmelerini kabul etmiş olursun.</p>
        </div>
      ) : null}
    </div>
  );
}
