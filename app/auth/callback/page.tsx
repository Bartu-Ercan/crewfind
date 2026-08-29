"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/backend/supabase/browser-client";
import { TERMS_VERSION } from "@/frontend/types/account";

export default function AuthCallbackPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    const complete = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const next = url.searchParams.get("next")?.startsWith("/") ? url.searchParams.get("next")! : "/valorant";
      const client = getSupabaseBrowserClient();
      if (code) {
        const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
        if (exchangeError) { setError("Giriş bağlantısı geçersiz veya süresi dolmuş."); return; }
      }
      localStorage.setItem("crewfind-auth-terms", TERMS_VERSION);
      window.location.replace(next);
    };
    void complete();
  }, []);

  return <main className="legal-shell auth-callback"><LoaderCircle className="spin" size={24} /><h1>{error || "Hesabın hazırlanıyor"}</h1>{error ? <a href="/valorant">Ana sayfaya dön</a> : null}</main>;
}
