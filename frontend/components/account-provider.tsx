"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/backend/supabase/browser-client";
import { AUTH_TERMS_STORAGE_KEY } from "@/frontend/lib/auth-flow";
import { TERMS_VERSION, type AccountOverview } from "@/frontend/types/account";

type AccountContextValue = {
  user: User | null;
  overview: AccountOverview | null;
  loading: boolean;
  isPermanent: boolean;
  refresh: () => Promise<void>;
};

const AccountContext = createContext<AccountContextValue | null>(null);

function profileSeed(user: User) {
  const metadata = user.user_metadata ?? {};
  return String(
    metadata.full_name ?? metadata.name ?? metadata.user_name ?? metadata.preferred_username ?? user.email?.split("@")[0] ?? "oyuncu",
  );
}

function profileAvatar(user: User) {
  const metadata = user.user_metadata ?? {};
  return String(metadata.avatar_url ?? metadata.picture ?? "");
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [overview, setOverview] = useState<AccountOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!hasSupabaseConfig()) {
      setUser(null);
      setOverview(null);
      setLoading(false);
      return;
    }
    const client = getSupabaseBrowserClient();
    const { data } = await client.auth.getUser();
    const nextUser = data.user ?? null;
    setUser(nextUser);
    if (!nextUser || nextUser.is_anonymous) {
      setOverview(null);
      setLoading(false);
      return;
    }
    const { data: current, error } = await client.rpc("get_account_overview");
    if (!error && current?.username) {
      setOverview(current as AccountOverview);
      localStorage.removeItem(AUTH_TERMS_STORAGE_KEY);
      setLoading(false);
      return;
    }
    const pendingTerms = localStorage.getItem(AUTH_TERMS_STORAGE_KEY);
    const acceptedTermsVersion = pendingTerms === `${nextUser.id}:${TERMS_VERSION}`
      ? TERMS_VERSION
      : String(nextUser.user_metadata?.terms_version ?? "");
    if (error || acceptedTermsVersion !== TERMS_VERSION) {
      setOverview(null);
      setLoading(false);
      return;
    }
    const { data: initialized, error: initializeError } = await client.rpc("ensure_account_profile", {
      p_seed: profileSeed(nextUser),
      p_avatar_url: profileAvatar(nextUser),
      p_terms_version: TERMS_VERSION,
    });
    setOverview(initializeError ? null : initialized as AccountOverview);
    if (!initializeError) localStorage.removeItem(AUTH_TERMS_STORAGE_KEY);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    if (!hasSupabaseConfig()) return;
    const { data } = getSupabaseBrowserClient().auth.onAuthStateChange(() => {
      queueMicrotask(() => void refresh());
    });
    return () => data.subscription.unsubscribe();
  }, [refresh]);

  const value = useMemo<AccountContextValue>(() => ({
    user,
    overview,
    loading,
    isPermanent: Boolean(user && !user.is_anonymous),
    refresh,
  }), [loading, overview, refresh, user]);

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const value = useContext(AccountContext);
  if (!value) throw new Error("useAccount, AccountProvider içinde kullanılmalı.");
  return value;
}
