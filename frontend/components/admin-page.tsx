"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Check, LoaderCircle, RefreshCw, Shield } from "lucide-react";
import { Brand } from "./brand";
import { useAccount } from "./account-provider";
import { getSupabaseBrowserClient } from "@/backend/supabase/browser-client";
import { buildAuthCallbackUrl } from "@/frontend/lib/auth-flow";
import type { SiteControls } from "@/frontend/lib/site-controls";

type AdminUser = { id: string; username: string | null; riotId: string; lastSeenAt: string; permanent: boolean; restrictedUntil: string | null; reason: string | null; admin: boolean };
type Dashboard = {
  updatedAt: string; role: "owner" | "viewer"; controls: SiteControls;
  metrics: { activePlayers: number; matchedPlayers: number; openLobbies: number; permanentAccounts: number; feedbackPending: number };
  games: Array<{ game: string; players: number; representatives: number }>;
  users: AdminUser[];
  feedback: Array<{ id: string; kind: string; message: string; sourcePath: string; deliveryStatus: string; createdAt: string }>;
  audit: Array<{ id: number; action: string; target: string; details: { reason?: string; before?: boolean; after?: boolean; hours?: number }; createdAt: string }>;
  jobs: Array<{ name: string; active: boolean; status: string | null; lastRunAt: string | null }>;
};
const controls = [
  { key: "matchmaking", label: "Yeni aramalar", help: "Kapatıldığında yeni arama başlamaz. Mevcut lobi ve sohbetler devam eder." },
  { key: "feedback", label: "Geri bildirim", help: "Formu ve yeni bildirim gönderimini birlikte açar veya kapatır." },
  { key: "ads", label: "Masaüstü reklamı", help: "Yayın iznidir. AdSense onayı ve sunucu yapılandırması olmadan reklam göstermez." },
] as const;
const gameNames: Record<string, string> = { valorant: "VALORANT", "league-of-legends": "League of Legends", cs2: "Counter-Strike 2" };
const actionNames: Record<string, string> = { set_control: "Sistem ayarı", restrict_user: "Erişim kısıtlandı", unrestrict_user: "Kısıtlama kaldırıldı" };
const deliveryNames: Record<string, string> = { sent: "E-posta iletildi", pending: "Gönderim bekliyor", failed: "E-posta iletilemedi", not_configured: "E-posta yapılandırılmamış" };
function date(value: string | null) { return value ? new Date(value).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : "Henüz yok"; }
function errorMessage(error: { message?: string }) {
  if (error.message?.includes("ADMIN_REAUTH_REQUIRED")) return "Değişiklik için Google ile yeniden doğrula. Yazma yetkisi 15 dakika açık kalır.";
  if (error.message?.includes("ADMIN_FORBIDDEN")) return "Bu hesap yönetim alanına erişemez.";
  if (error.message?.includes("RATE_LIMITED")) return "İstek sınırına ulaşıldı. Bir dakika sonra tekrar dene.";
  return "Yönetim verisi alınamadı. Son başarılı veri korunuyor; tekrar dene.";
}

export function AdminPage() {
  const { user, loading } = useAccount();
  const [data, setData] = useState<Dashboard | null>(null);
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState("24");
  const requestVersion = useRef(0);
  const fetchInFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!user || user.is_anonymous || fetchInFlight.current) return;
    const version = requestVersion.current;
    fetchInFlight.current = true; setFetching(true);
    try {
      const result = await getSupabaseBrowserClient().rpc("admin_dashboard", { p_search: query });
      if (version !== requestVersion.current) return;
      if (result.error) {
        if (result.error.message.includes("ADMIN_FORBIDDEN")) setData(null);
        setError(errorMessage(result.error));
      } else { setData(result.data as Dashboard); setError(""); }
    } catch { if (version === requestVersion.current) setError("Bağlantı kurulamadı. Son veri korunuyor."); }
    finally { fetchInFlight.current = false; setFetching(false); }
  }, [user, query]);

  useEffect(() => {
    setData(null); setError(""); requestVersion.current += 1;
    void refresh();
    const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 15_000);
    return () => { requestVersion.current += 1; clearInterval(timer); };
  }, [refresh]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", localStorage.getItem("crewfind-theme") === "dark");
  }, []);

  async function reauthenticate() {
    setBusy(true); setError("");
    try {
      const { error: authError } = await getSupabaseBrowserClient().auth.signInWithOAuth({ provider: "google", options: {
        redirectTo: buildAuthCallbackUrl(window.location.origin, "oauth-login", "/admin"), queryParams: { prompt: "select_account" },
      } });
      if (authError) setError("Google doğrulaması başlatılamadı.");
    } catch { setError("Google bağlantısı kurulamadı."); }
    finally { setBusy(false); }
  }

  async function action(name: string, payload: Record<string, unknown>) {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await getSupabaseBrowserClient().rpc("admin_action", { p_action: name, p_payload: payload });
      if (result.error) { setError(errorMessage(result.error)); return; }
      setTarget(null); setReason(""); setNotice("Değişiklik kaydedildi ve işlem geçmişine işlendi.");
      await refresh();
    } catch { setError("İşlemin sonucu alınamadı. Tekrar denemeden önce yenileyerek kontrol et."); }
    finally { setBusy(false); }
  }

  function moderate(event: FormEvent) {
    event.preventDefault();
    if (!target || reason.trim().length < 5) return;
    void action(target.restrictedUntil ? "unrestrict_user" : "restrict_user", { userId: target.id, reason: reason.trim(), hours: Number(hours) });
  }

  return <main className="admin-shell">
    <header className="admin-topbar"><Brand /><Link className="ghost-button" href="/valorant"><ArrowLeft size={15} /> Siteye dön</Link></header>
    <div className="admin-heading"><div><span className="step-kicker">Özel alan</span><h1>Kontrol sende.</h1><p>Canlı sistem, kullanıcılar ve beta geri bildirimleri.</p></div><Shield size={28} aria-hidden="true" /></div>
    <div aria-live="polite">{error ? <p className="error-message">{error}</p> : null}{notice ? <p className="admin-notice"><Check size={15} />{notice}</p> : null}</div>
    {loading ? <p>Hesap kontrol ediliyor…</p> : !data ? <section className="admin-section"><h2>Yönetici girişi</h2><p>Yalnız yetkilendirilmiş CrewFind hesabı bu alanı açabilir.</p><button className="ghost-button" disabled={busy || fetching} onClick={reauthenticate}>Google ile doğrula</button>{user ? <button className="ghost-button" disabled={fetching} onClick={() => void refresh()}>Tekrar kontrol et</button> : null}</section> : <>
      <div className="admin-toolbar"><span>Son veri: {date(data.updatedAt)} · 15 saniyede bir yenilenir</span><button className="ghost-button" disabled={fetching || busy} onClick={() => void refresh()}><RefreshCw size={14} />Yenile</button></div>
      <section className="admin-metrics" aria-label="Sistem özeti">
        <div><strong>{data.metrics.activePlayers}</strong><span>Arayan oyuncu</span><small>Arama + süresi dolmamış teklif; grup büyüklüğü dahil.</small></div>
        <div><strong>{data.metrics.matchedPlayers}</strong><span>Toplam eşleşen oyuncu</span><small>Tekil kişi değil; tamamlanan lobilerdeki oyuncu toplamı.</small></div>
        <div><strong>{data.metrics.openLobbies}</strong><span>Açık lobi</span><small>Henüz kapanmamış lobiler.</small></div>
        <div><strong>{data.metrics.permanentAccounts}</strong><span>Kalıcı hesap</span><small>Misafir hesaplar hariç.</small></div>
      </section>
      <section className="admin-section"><div className="admin-section-title"><h2>Sistem kontrolleri</h2><button className="ghost-button" disabled={busy} onClick={reauthenticate}>Yazma yetkisini doğrula</button></div>
        <p>Değişiklikler sunucuda hemen uygulanır. Açık sayfalar en geç 30 saniyede yenilenir.</p>
        {controls.map(({ key, label, help }) => <div className="admin-control" key={key}><div><strong>{label}</strong><p>{help}</p></div><button className="admin-switch" type="button" role="switch" aria-label={label} aria-checked={data.controls[key]} disabled={busy || data.role !== "owner"} onClick={() => { if (window.confirm(`${label} ${data.controls[key] ? "kapatılsın" : "açılsın"} mı?`)) void action("set_control", { key, enabled: !data.controls[key] }); }}>{data.controls[key] ? "Açık" : "Kapalı"}</button></div>)}
      </section>
      <section className="admin-section"><h2>Oyunlar ve sistem sağlığı</h2><div className="admin-game-rows">{Object.entries(gameNames).map(([key, label]) => { const game = data.games.find((g) => g.game === key); return <div key={key}><strong>{label}</strong><span>{game?.players ?? 0} oyuncu · {game?.representatives ?? 0} temsilci</span></div>; })}</div><p>Veritabanı yanıt verdi. Aşağıdaki durumlar son arka plan görevlerine aittir; tüm servislerin kesintisiz çalıştığı anlamına gelmez.</p>{data.jobs.map((job) => <div className="admin-job" key={job.name}><span>{job.name}</span><span>{job.active ? job.status === "succeeded" ? "Başarılı" : job.status ?? "Çalışma bekliyor" : "Kapalı"} · {date(job.lastRunAt)}</span></div>)}</section>
      <section className="admin-section"><h2>Kullanıcılar</h2><p>Son aktif 30 temsilci. E-posta adresleri, IP bilgileri ve özel sohbetler gösterilmez.</p><form className="admin-search" onSubmit={(e) => { e.preventDefault(); setQuery(search.trim()); }}><input aria-label="Kullanıcı ara" placeholder="CrewFind adı, Riot ID veya kullanıcı kimliği" maxLength={100} value={search} onChange={(e) => setSearch(e.target.value)} /><button className="ghost-button" disabled={fetching}>Ara</button></form>
        <div className="admin-users">{data.users.map((item) => <div className="admin-user" key={item.id}><div><strong>{item.username ?? item.riotId}</strong><span>{item.riotId} · {item.permanent ? "Kalıcı hesap" : "Misafir"}</span><small>Son görülme {date(item.lastSeenAt)}{item.restrictedUntil ? ` · Kısıtlı: ${date(item.restrictedUntil)}` : ""}</small></div><button className="ghost-button" disabled={busy || item.admin || data.role !== "owner"} onClick={() => { setTarget(item); setReason(""); }}>{item.admin ? "Yönetici" : item.restrictedUntil ? "Kısıtlamayı kaldır" : "Kısıtla"}</button></div>)}</div>
        {target ? <form className="admin-moderation" onSubmit={moderate}><h3>{target.username ?? target.riotId} · {target.restrictedUntil ? "Kısıtlamayı kaldır" : "Erişimi kısıtla"}</h3><p>Kısıtlama arama ve sohbeti engeller; mevcut eşleşmeden çıkarır. Hesap silinmez.</p><label>İşlem gerekçesi<input required minLength={5} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} /></label>{!target.restrictedUntil ? <label>Süre<select value={hours} onChange={(e) => setHours(e.target.value)}><option value="1">1 saat</option><option value="24">24 saat</option><option value="168">7 gün</option></select></label> : null}<div className="admin-actions"><button className="ghost-button" disabled={busy} type="button" onClick={() => setTarget(null)}>Vazgeç</button><button className="primary-button" disabled={busy || reason.trim().length < 5}>{busy ? <LoaderCircle size={15} className="spin" /> : null}İşlemi onayla</button></div></form> : null}
      </section>
      <section className="admin-section"><h2>Beta geri bildirimleri</h2><p>Son 20 bildirim · {data.metrics.feedbackPending} bildirimin e-postası iletilmemiş. Mesajlar burada korunur.</p>{data.feedback.length ? data.feedback.map((item) => <article className="admin-feedback" key={item.id}><div><strong>{item.kind === "bug" ? "Hata" : item.kind === "suggestion" ? "Öneri" : "Diğer"}</strong><small>{date(item.createdAt)} · {item.sourcePath}</small></div><p>{item.message}</p><small>{deliveryNames[item.deliveryStatus] ?? item.deliveryStatus}</small></article>) : <p>Henüz geri bildirim yok.</p>}</section>
      <section className="admin-section"><h2>İşlem geçmişi</h2><p>Son 30 yönetici değişikliği. Kayıtlar panelden değiştirilemez veya silinemez.</p>{data.audit.length ? data.audit.map((item) => <div className="admin-audit" key={item.id}><strong>{actionNames[item.action] ?? item.action}</strong><span>{controls.find((c) => c.key === item.target)?.label ?? item.target}</span><small>{item.details.reason ?? (item.details.after ? "Açıldı" : "Kapatıldı")} · {date(item.createdAt)}</small></div>) : <p>Henüz yönetici işlemi yok.</p>}</section>
    </>}
  </main>;
}
