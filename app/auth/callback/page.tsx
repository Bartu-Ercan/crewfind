"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/backend/supabase/browser-client";
import {
  AUTH_MODAL_MODE_STORAGE_KEY,
  AUTH_NEEDS_PASSWORD_STORAGE_KEY,
  AUTH_PENDING_INTENT_STORAGE_KEY,
  consumePendingOAuthTerms,
  callbackNeedsPassword,
  parseAuthCallbackIntent,
  sanitizeAuthNext,
} from "@/frontend/lib/auth-flow";
import { TERMS_VERSION } from "@/frontend/types/account";

export default function AuthCallbackPage() {
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const complete = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const intent = parseAuthCallbackIntent(url.searchParams.get("intent"));
      const next = sanitizeAuthNext(url.searchParams.get("next"));
      if (url.searchParams.has("error") || url.searchParams.has("error_code")) {
        setError("Giriş bağlantısı geçersiz veya süresi dolmuş.");
        return;
      }
      if (!intent) {
        setError("Giriş isteği geçersiz.");
        return;
      }
      if (localStorage.getItem(AUTH_PENDING_INTENT_STORAGE_KEY) !== intent) {
        setError("Giriş isteği bu tarayıcıda başlatılmadı veya geçersiz.");
        return;
      }
      if (!code) {
        setError("Giriş bağlantısı geçersiz veya süresi dolmuş.");
        return;
      }
      const client = getSupabaseBrowserClient();
      const { data: { session }, error: sessionError } = await client.auth.exchangeCodeForSession(code);
      if (sessionError || !session || session.user.is_anonymous) {
        setError("Giriş bağlantısı geçersiz veya süresi dolmuş.");
        return;
      }
      if (callbackNeedsPassword(intent)) {
        sessionStorage.setItem(AUTH_MODAL_MODE_STORAGE_KEY, "set-password");
        localStorage.setItem(AUTH_NEEDS_PASSWORD_STORAGE_KEY, "true");
      }
      consumePendingOAuthTerms(localStorage, intent, TERMS_VERSION, session.user.id);
      localStorage.removeItem(AUTH_PENDING_INTENT_STORAGE_KEY);
      window.location.replace(next);
    };
    void complete();
  }, []);

  return <main className="legal-shell auth-callback"><LoaderCircle className="spin" size={24} /><h1>{error || "Hesabın hazırlanıyor"}</h1>{error ? <a href="/valorant">Ana sayfaya dön</a> : null}</main>;
}
