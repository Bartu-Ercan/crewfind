"use client";

import { Check, KeyRound, Link2, LoaderCircle, LogIn, Shield, Trash2, UserRound, X } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import type { UserIdentity } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/backend/supabase/browser-client";
import { Brand } from "@/frontend/components/brand";
import { useAccount } from "@/frontend/components/account-provider";
import { readableError } from "@/frontend/lib/error-messages";

const providerLabels: Record<string, string> = { google: "Google", discord: "Discord", email: "E-posta", "custom:riot": "Riot" };

export function AccountPage() {
  const { overview, isPermanent, loading, refresh } = useAccount();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
  const discordEnabled = process.env.NEXT_PUBLIC_DISCORD_AUTH_ENABLED === "true";

  useEffect(() => { if (overview?.username) setUsername(overview.username); }, [overview?.username]);
  useEffect(() => {
    if (!isPermanent) return;
    void getSupabaseBrowserClient().auth.getUserIdentities().then(({ data }) => setIdentities(data?.identities ?? []));
  }, [isPermanent, overview?.providers]);

  async function saveUsername(event: FormEvent) {
    event.preventDefault(); setBusy("username"); setError(""); setMessage("");
    const { error: updateError } = await getSupabaseBrowserClient().rpc("update_my_username", { p_username: username.trim() });
    setBusy("");
    if (updateError) setError(readableError(updateError));
    else { setMessage("Kullanıcı adı güncellendi."); await refresh(); }
  }

  async function setAccountPassword(event: FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    if (password.length < 10 || password.length > 72) { setError("Parola 10-72 karakter olmalı."); return; }
    setBusy("password");
    const { error: passwordError } = await getSupabaseBrowserClient().auth.updateUser({ password });
    setBusy("");
    if (passwordError) setError(readableError(passwordError));
    else { localStorage.removeItem("crewfind-needs-password"); setPassword(""); setMessage("Parola kaydedildi."); }
  }

  async function linkProvider(provider: "google" | "discord") {
    setBusy(provider); setError("");
    const { error: linkError } = await getSupabaseBrowserClient().auth.linkIdentity({ provider, options: { redirectTo: `${window.location.origin}/auth/callback?next=/hesabim` } });
    if (linkError) { setBusy(""); setError(readableError(linkError)); }
  }

  async function unlinkProvider(identity: UserIdentity) {
    if (identities.length <= 1) { setError("Hesabında en az bir giriş yöntemi kalmalı."); return; }
    setBusy(identity.id); setError("");
    const { error: unlinkError } = await getSupabaseBrowserClient().auth.unlinkIdentity(identity);
    setBusy("");
    if (unlinkError) setError(readableError(unlinkError));
    else { await refresh(); setIdentities((current) => current.filter((item) => item.id !== identity.id)); }
  }

  async function deleteAccount() {
    if (!window.confirm("CrewFind hesabın ve kayıtlı profillerin kalıcı olarak silinecek. Devam edilsin mi?")) return;
    setBusy("account-delete"); setError("");
    const { data } = await getSupabaseBrowserClient().auth.getSession();
    const response = await fetch("/api/account", { method: "DELETE", headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` } });
    const result = await response.json().catch(() => null);
    setBusy("");
    if (response.ok) { await getSupabaseBrowserClient().auth.signOut(); window.location.replace("/valorant"); return; }
    setError(result?.code === "REAUTH_REQUIRED" ? "Hesabı silmeden önce çıkış yapıp tekrar giriş yap." : "Hesap silinemedi.");
  }

  async function deleteRiotAccount(id: string) {
    if (!window.confirm("Bu Riot hesabını ve kayıtlı tercihlerini silmek istiyor musun?")) return;
    setBusy(id); setError("");
    const { error: deleteError } = await getSupabaseBrowserClient().rpc("delete_riot_account", { p_account_id: id });
    setBusy("");
    if (deleteError) setError(readableError(deleteError)); else await refresh();
  }

  if (loading) return <main className="account-page-shell"><LoaderCircle className="spin" size={24} /></main>;
  if (!isPermanent || !overview) return <main className="account-page-shell"><div className="account-page-top"><Link href="/valorant"><Brand /></Link></div><section className="account-empty"><LogIn size={24} /><h1>Önce giriş yap</h1><p>Kalıcı profil ve kayıtlı Riot hesapları için ana sayfadaki giriş menüsünü kullan.</p><Link href="/valorant">Ana sayfaya dön</Link></section></main>;

  return <main className="account-page-shell"><div className="account-page-top"><Link href="/valorant"><Brand /></Link><Link href="/valorant">Aramaya dön</Link></div><header className="account-page-heading"><span className="step-kicker">HESABIM</span><h1>Profil ve oyun hesapları</h1><p>Giriş yöntemlerini ve tek tıkla kullanacağın Riot profillerini yönet.</p></header>{error ? <p className="auth-feedback error"><X size={14} />{error}</p> : null}{message ? <p className="auth-feedback success"><Check size={14} />{message}</p> : null}<div className="account-settings-grid"><section className="account-settings-section"><div className="settings-title"><UserRound size={18} /><div><h2>CrewFind profili</h2><p>Lobide Riot ID’nin altında gösterilir.</p></div></div><form className="settings-form" onSubmit={saveUsername}><label><span>Benzersiz kullanıcı adı</span><div><UserRound size={15} /><input value={username} minLength={3} maxLength={20} pattern="[A-Za-z0-9_ÇĞİÖŞÜçğıöşü]+" onChange={(event) => setUsername(event.target.value.replace(/[^\p{L}\p{N}_]/gu, ""))} /></div></label><button disabled={busy === "username"}>{busy === "username" ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}Kaydet</button></form></section><section className="account-settings-section"><div className="settings-title"><Link2 size={18} /><div><h2>Giriş yöntemleri</h2><p>En az bir yöntem hesabında kalır.</p></div></div><div className="provider-list">{identities.map((identity) => <span key={identity.id}><Shield size={15} />{providerLabels[identity.provider] ?? identity.provider}{identities.length > 1 ? <button type="button" aria-label={`${identity.provider} bağlantısını kaldır`} onClick={() => void unlinkProvider(identity)}><X size={12} /></button> : <Check size={14} />}</span>)}{googleEnabled && !overview.providers.includes("google") ? <button disabled={Boolean(busy)} onClick={() => void linkProvider("google")}>Google bağla</button> : null}{discordEnabled && !overview.providers.includes("discord") ? <button disabled={Boolean(busy)} onClick={() => void linkProvider("discord")}>Discord bağla</button> : null}</div><form className="settings-form password-form" onSubmit={setAccountPassword}><label><span>Parola belirle veya değiştir</span><div><KeyRound size={15} /><input type="password" minLength={10} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="En az 10 karakter" /></div></label><button disabled={busy === "password" || !password}>{busy === "password" ? <LoaderCircle className="spin" size={15} /> : <KeyRound size={15} />}Parolayı kaydet</button></form></section></div><section className="riot-account-section"><div className="settings-title"><Shield size={18} /><div><h2>Kayıtlı Riot hesapları</h2><p>RSO onayına kadar bu kayıtlar kullanıcı beyanıdır.</p></div></div>{overview.riotAccounts.length ? <div className="riot-account-list">{overview.riotAccounts.map((account) => <article key={account.id}><div><strong>{account.riotId}</strong><span>{account.verificationStatus === "verified" ? "Doğrulanmış" : "Kullanıcı beyanı"}</span></div><div className="riot-account-games">{account.preferences.map((preference) => <span key={preference.game}>{preference.game === "valorant" ? "VALORANT" : "League of Legends"}</span>)}</div><button type="button" aria-label={`${account.riotId} hesabını sil`} disabled={busy === account.id} onClick={() => void deleteRiotAccount(account.id)}>{busy === account.id ? <LoaderCircle className="spin" size={15} /> : <Trash2 size={15} />}</button></article>)}</div> : <div className="account-empty compact"><Shield size={20} /><p>Henüz Riot hesabı kaydetmedin. VALORANT veya LoL arama ekranından ilk profilini kaydet.</p></div>}</section><section className="danger-zone"><div><strong>Hesabı sil</strong><p>CrewFind profili ve kayıtlı Riot hesapları kalıcı olarak kaldırılır.</p></div><button type="button" disabled={busy === "account-delete"} onClick={() => void deleteAccount()}>{busy === "account-delete" ? <LoaderCircle className="spin" size={15} /> : <Trash2 size={15} />}Hesabı sil</button></section></main>;
}
