"use client";

import { Check, KeyRound, Link2, LoaderCircle, LogIn, Plus, Shield, Trash2, UserRound, X } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import type { UserIdentity } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/backend/supabase/browser-client";
import { Brand } from "@/frontend/components/brand";
import { useAccount } from "@/frontend/components/account-provider";
import { buildAuthCallbackUrl } from "@/frontend/lib/auth-flow";
import { readableError } from "@/frontend/lib/error-messages";
import { createInitialSearchInput } from "@/shared/validation";

type RiotGame = "valorant" | "league-of-legends";

const RIOT_ID_PATTERN = /^[^#]{3,16}#[\p{L}\p{N}]{3,5}$/u;

function defaultPreference(game: RiotGame) {
  const { displayName: _displayName, contactValue: _contactValue, ...preference } = createInitialSearchInput(game);
  return preference;
}

const providerLabels: Record<string, string> = { google: "Google", discord: "Discord", email: "E-posta", "custom:riot": "Riot" };

export function AccountPage() {
  const { overview, isPermanent, loading, refresh } = useAccount();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [addingRiotAccount, setAddingRiotAccount] = useState(false);
  const [newRiotId, setNewRiotId] = useState("");
  const [newRiotGames, setNewRiotGames] = useState<RiotGame[]>(["valorant"]);
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

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
    if (password.length < 8 || password.length > 72) { setError("Parola 8-72 karakter olmalı."); return; }
    setBusy("password");
    const { error: passwordError } = await getSupabaseBrowserClient().auth.updateUser({ password });
    setBusy("");
    if (passwordError) setError(readableError(passwordError));
    else { localStorage.removeItem("crewfind-needs-password"); setPassword(""); setMessage("Parola kaydedildi."); }
  }

  async function linkGoogle() {
    setBusy("google"); setError("");
    const { error: linkError } = await getSupabaseBrowserClient().auth.linkIdentity({
      provider: "google",
      options: { redirectTo: buildAuthCallbackUrl(window.location.origin, "oauth-link", "/hesabim") },
    });
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

  function toggleNewRiotGame(game: RiotGame) {
    setNewRiotGames((current) => current.includes(game)
      ? current.length === 1 ? current : current.filter((item) => item !== game)
      : [...current, game]);
  }

  async function addRiotAccount(event: FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    const riotId = newRiotId.trim();
    if (!RIOT_ID_PATTERN.test(riotId)) { setError("Riot ID'yi OyuncuAdı#TR1 biçiminde gir."); return; }
    setBusy("riot-add");
    let accountId: string | null = null;
    for (const game of newRiotGames) {
      const { data, error: saveError } = await getSupabaseBrowserClient().rpc("save_riot_account", {
        p_account_id: accountId,
        p_riot_id: riotId,
        p_game: game,
        p_preferences: defaultPreference(game),
      });
      if (saveError) {
        setBusy("");
        setError(readableError(saveError));
        await refresh();
        return;
      }
      accountId = data as string;
    }
    setBusy("");
    setAddingRiotAccount(false);
    setNewRiotId("");
    setNewRiotGames(["valorant"]);
    setMessage("Riot hesabı eklendi.");
    await refresh();
  }

  if (loading) return <main className="account-page-shell"><LoaderCircle className="spin" size={24} /></main>;
  if (!isPermanent || !overview) return <main className="account-page-shell"><div className="account-page-top"><Link href="/valorant"><Brand /></Link></div><section className="account-empty"><LogIn size={24} /><h1>Önce giriş yap</h1><p>Kalıcı profil ve kayıtlı Riot hesapları için ana sayfadaki giriş menüsünü kullan.</p><Link href="/valorant">Ana sayfaya dön</Link></section></main>;

  return <main className="account-page-shell"><div className="account-page-top"><Link href="/valorant"><Brand /></Link><Link href="/valorant">Aramaya dön</Link></div><header className="account-page-heading"><span className="step-kicker">HESABIM</span><h1>Profil ve oyun hesapları</h1><p>Giriş yöntemlerini ve tek tıkla kullanacağın Riot profillerini yönet.</p></header>{error ? <p className="auth-feedback error"><X size={14} />{error}</p> : null}{message ? <p className="auth-feedback success"><Check size={14} />{message}</p> : null}<div className="account-settings-grid"><section className="account-settings-section"><div className="settings-title"><UserRound size={18} /><div><h2>CrewFind profili</h2><p>Lobide Riot ID’nin altında gösterilir.</p></div></div><form className="settings-form" onSubmit={saveUsername}><label><span>Benzersiz kullanıcı adı</span><div><UserRound size={15} /><input value={username} minLength={3} maxLength={20} pattern="[A-Za-z0-9_ÇĞİÖŞÜçğıöşü]+" onChange={(event) => setUsername(event.target.value.replace(/[^\p{L}\p{N}_]/gu, ""))} /></div></label><button disabled={busy === "username"}>{busy === "username" ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}Kaydet</button></form></section><section className="account-settings-section"><div className="settings-title"><Link2 size={18} /><div><h2>Giriş yöntemleri</h2><p>En az bir yöntem hesabında kalır.</p></div></div><div className="provider-list">{identities.map((identity) => <span key={identity.id}><Shield size={15} />{providerLabels[identity.provider] ?? identity.provider}{identities.length > 1 ? <button type="button" aria-label={`${identity.provider} bağlantısını kaldır`} onClick={() => void unlinkProvider(identity)}><X size={12} /></button> : <Check size={14} />}</span>)}{googleEnabled && !overview.providers.includes("google") ? <button disabled={Boolean(busy)} onClick={() => void linkGoogle()}>Google bağla</button> : null}</div><form className="settings-form password-form" onSubmit={setAccountPassword}><label><span>Parola belirle veya değiştir</span><div><KeyRound size={15} /><input type="password" minLength={8} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="En az 8 karakter" /></div></label><button disabled={busy === "password" || !password}>{busy === "password" ? <LoaderCircle className="spin" size={15} /> : <KeyRound size={15} />}Parolayı kaydet</button></form></section></div><section className="riot-account-section"><div className="riot-account-heading"><div className="settings-title"><Shield size={18} /><div><h2>Kayıtlı Riot hesapları</h2><p>RSO onayına kadar bu kayıtlar kullanıcı beyanıdır.</p></div></div><button type="button" className="riot-account-add-trigger" disabled={overview.riotAccounts.length >= 10 || Boolean(busy)} onClick={() => { setAddingRiotAccount((current) => !current); setError(""); setMessage(""); }}><Plus size={14} />Hesap ekle</button></div>{addingRiotAccount ? <form className="riot-account-add-form" onSubmit={addRiotAccount}><label><span>Riot ID</span><div><UserRound size={15} /><input value={newRiotId} onChange={(event) => setNewRiotId(event.target.value.replace(/\s/g, "").slice(0, 22))} placeholder="OyuncuAdı#TR1" autoComplete="off" /></div></label><div className="riot-game-picker" aria-label="Hesabın kullanılacağı oyunlar">{(["valorant", "league-of-legends"] as RiotGame[]).map((game) => <button type="button" key={game} className={newRiotGames.includes(game) ? "selected" : ""} aria-pressed={newRiotGames.includes(game)} onClick={() => toggleNewRiotGame(game)}>{game === "valorant" ? "VALORANT" : "League of Legends"}</button>)}</div><div className="riot-account-add-actions"><button type="button" onClick={() => { setAddingRiotAccount(false); setNewRiotId(""); }}>Vazgeç</button><button type="submit" disabled={busy === "riot-add"}>{busy === "riot-add" ? <LoaderCircle className="spin" size={15} /> : <Plus size={15} />}Ekle</button></div></form> : null}{overview.riotAccounts.length ? <div className="riot-account-list">{overview.riotAccounts.map((account) => <article key={account.id}><div><strong>{account.riotId}</strong><span>{account.verificationStatus === "verified" ? "Doğrulanmış" : "Kullanıcı beyanı"}</span></div><div className="riot-account-games">{account.preferences.map((preference) => <span key={preference.game}>{preference.game === "valorant" ? "VALORANT" : "League of Legends"}</span>)}</div><button type="button" aria-label={`${account.riotId} hesabını sil`} disabled={busy === account.id} onClick={() => void deleteRiotAccount(account.id)}>{busy === account.id ? <LoaderCircle className="spin" size={15} /> : <Trash2 size={15} />}</button></article>)}</div> : <div className="account-empty compact"><Shield size={20} /><p>Henüz Riot hesabı yok. İlk arama başarıyla başlayınca otomatik kaydedilir veya buradan eklenir.</p></div>}</section><section className="danger-zone"><div><strong>Hesabı sil</strong><p>CrewFind profili ve kayıtlı Riot hesapları kalıcı olarak kaldırılır.</p></div><button type="button" disabled={busy === "account-delete"} onClick={() => void deleteAccount()}>{busy === "account-delete" ? <LoaderCircle className="spin" size={15} /> : <Trash2 size={15} />}Hesabı sil</button></section></main>;
}
