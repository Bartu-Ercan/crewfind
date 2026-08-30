"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/backend/supabase/browser-client";
import {
  AUTH_MODAL_MODE_STORAGE_KEY,
  AUTH_NEEDS_PASSWORD_STORAGE_KEY,
  AUTH_PENDING_INTENT_STORAGE_KEY,
  callbackNeedsPassword,
  parseAuthCallbackIntent,
  sanitizeAuthNext,
} from "@/frontend/lib/auth-flow";

export default function AuthCallbackPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    const complete = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const intent = parseAuthCallbackIntent(url.searchParams.get("intent"));
      const next = sanitizeAuthNext(url.searchParams.get("next"));
      if (!intent) {
        setError("Giriş isteği geçersiz.");
        return;
      }
      const expectedIntent = localStorage.getItem(AUTH_PENDING_INTENT_STORAGE_KEY);
      if (!code && expectedIntent !== intent) {
        setError("Giriş bağlantısı geçersiz veya süresi dolmuş.");
        return;
      }
      const client = getSupabaseBrowserClient();
      const { data: { session }, error: sessionError } = await client.auth.getSession();
      const codeWasConsumed = !new URL(window.location.href).searchParams.has("code");
      if (sessionError || !session || session.user.is_anonymous || !codeWasConsumed) {
        setError("Giriş bağlantısı geçersiz veya süresi dolmuş.");
        return;
      }
      if (callbackNeedsPassword(intent)) {
        sessionStorage.setItem(AUTH_MODAL_MODE_STORAGE_KEY, "set-password");
        localStorage.setItem(AUTH_NEEDS_PASSWORD_STORAGE_KEY, "true");
      }
      localStorage.removeItem(AUTH_PENDING_INTENT_STORAGE_KEY);
      window.location.replace(next);
    };
    void complete();
  }, []);

  return <main className="legal-shell auth-callback"><LoaderCircle className="spin" size={24} /><h1>{error || "Hesabın hazırlanıyor"}</h1>{error ? <a href="/valorant">Ana sayfaya dön</a> : null}</main>;
}
