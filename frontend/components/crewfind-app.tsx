"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import {
  Check,
  Clock3,
  Copy,
  Info,
  LoaderCircle,
  LogOut,
  MessageCircle,
  Moon,
  Search,
  Send,
  Sun,
  User,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/backend/supabase/browser-client";
import { Brand } from "@/frontend/components/brand";
import { GameSelector } from "@/frontend/components/game-selector";
import { QueueSelector } from "@/frontend/components/queue-selector";
import { RankSelect } from "@/frontend/components/rank-select";
import { RatingSelect } from "@/frontend/components/rating-select";
import { DEMO_NAMES } from "@/frontend/config/demo";
import { readableError } from "@/frontend/lib/error-messages";
import type { ChatMessage, Member, StatusPayload, View } from "@/frontend/types/crewfind";
import {
  CS2_MAPS,
  CS2_RATING_BANDS,
  GAME_CONFIGS,
  GAME_ROUTES,
  LOL_ROLES,
  optionLabel,
  rankNameFor,
  rankSystemFor,
  ranksFor,
  selectionLabel,
  type GameId,
} from "@/shared/game-config";
import { createInitialSearchInput, searchSchema, type SearchInput } from "@/shared/validation";

type CrewFindAppProps = { game: GameId };

function normalizeMembers(members: Member[] | undefined) {
  return (members ?? []).map((member) => ({
    ...member,
    displayName: member.displayName ?? member.riotId ?? "Oyuncu",
  }));
}

export function CrewFindApp({ game }: CrewFindAppProps) {
  const router = useRouter();
  const config = GAME_CONFIGS[game];
  const [view, setView] = useState<View>("home");
  const [form, setForm] = useState<SearchInput>(() => createInitialSearchInput(game));
  const [identityName, setIdentityName] = useState("");
  const [identityDetail, setIdentityDetail] = useState(game === "cs2" ? "" : "TR1");
  const [openRankSelect, setOpenRankSelect] = useState<string | null>(null);
  const [openTopbarSelect, setOpenTopbarSelect] = useState<"game" | "queue" | null>(null);
  const [logoHighlight, setLogoHighlight] = useState<"crew" | "find">("crew");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [error, setError] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(30);
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState("");
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [needsCaptcha, setNeedsCaptcha] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [activePlayerCount, setActivePlayerCount] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const resumeChecked = useRef(false);

  const selectedQueue = form.queueTypes[0] ?? config.defaultQueue;
  const rankOptions = useMemo(() => ranksFor(game, selectedQueue), [game, selectedQueue]);
  const displayName = game === "cs2"
    ? identityName.trim() || identityDetail.trim()
    : `${identityName.trim()}#${identityDetail.trim()}`;
  const contactValue = game === "cs2" ? identityDetail.trim() : displayName;
  const demoMode =
    (process.env.NEXT_PUBLIC_DEMO_MODE ?? "true").trim().toLowerCase() !== "false" ||
    !hasSupabaseConfig();
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const turnstileFlag = process.env.NEXT_PUBLIC_TURNSTILE_ENABLED;
  const turnstileEnabled = Boolean(turnstileSiteKey) &&
    (turnstileFlag === undefined || turnstileFlag.trim().toLowerCase() === "true");

  useEffect(() => {
    setForm(createInitialSearchInput(game));
    setIdentityName("");
    setIdentityDetail(game === "cs2" ? "" : game === "league-of-legends" ? "TR1" : "TR1");
    setOpenRankSelect(null);
    setOpenTopbarSelect(null);
  }, [game]);

  const applyTheme = useCallback((nextTheme: "light" | "dark") => {
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    localStorage.setItem("crewfind-theme", nextTheme);
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("crewfind-theme") === "dark" ? "dark" : "light";
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, [applyTheme]);

  useEffect(() => {
    if (demoMode || !turnstileEnabled) {
      setNeedsCaptcha(false);
      setAuthReady(true);
      return;
    }
    let active = true;
    void getSupabaseBrowserClient().auth.getSession().then(({ data }) => {
      if (!active) return;
      setNeedsCaptcha(!data.session);
      setAuthReady(true);
    });
    return () => { active = false; };
  }, [demoMode, turnstileEnabled]);

  const cleanupTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(() => cleanupTimers, [cleanupTimers]);

  const applyStatus = useCallback((payload: StatusPayload) => {
    if (payload.game && payload.game !== game) {
      router.replace(GAME_ROUTES[payload.game]);
      return;
    }
    if (payload.search) {
      setForm((current) => ({ ...current, ...payload.search, game: payload.game ?? current.game }));
    }
    if (payload.notice) setNotice(payload.notice);
    if (payload.status === "searching") setView("searching");
    if (payload.status === "proposed") {
      setProposalId(payload.proposalId ?? null);
      setMembers(normalizeMembers(payload.members));
      if (payload.expiresAt) {
        setSeconds(Math.max(0, Math.ceil((new Date(payload.expiresAt).getTime() - Date.now()) / 1000)));
      }
      setView("proposal");
    }
    if (payload.status === "lobby") {
      setLobbyId(payload.lobbyId ?? null);
      setMembers(normalizeMembers(payload.members));
      setView("lobby");
    }
    if (payload.status === "idle") {
      setView("home");
      setLogoHighlight("crew");
    }
  }, [game, router]);

  useEffect(() => {
    if (demoMode || !authReady || resumeChecked.current) return;
    resumeChecked.current = true;
    let active = true;
    void getSupabaseBrowserClient().auth.getSession().then(async ({ data }) => {
      if (!active || !data.session) return;
      const { data: status, error: statusError } = await getSupabaseBrowserClient().rpc("get_my_status");
      if (!active) return;
      if (statusError) setError(statusError.message);
      else if (status) applyStatus(status as StatusPayload);
    });
    return () => { active = false; };
  }, [applyStatus, authReady, demoMode]);

  useEffect(() => {
    if (demoMode || view !== "home") return;
    let active = true;
    const refreshCount = async () => {
      const { data, error: countError } = await getSupabaseBrowserClient().rpc("get_active_player_count");
      const count = Number(data);
      if (active && !countError && Number.isInteger(count) && count >= 0) setActivePlayerCount(count);
    };
    void refreshCount();
    const interval = setInterval(() => void refreshCount(), 15_000);
    return () => { active = false; clearInterval(interval); };
  }, [demoMode, view]);

  useEffect(() => {
    if (view !== "searching") return;
    const interval = setInterval(() => setSearchSeconds((value) => value + 1), 1_000);
    return () => clearInterval(interval);
  }, [view]);

  useEffect(() => {
    if (view !== "proposal") return;
    const interval = setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1_000);
    return () => clearInterval(interval);
  }, [view]);

  useEffect(() => {
    if (demoMode || !["searching", "proposal", "lobby"].includes(view)) return;
    const poll = async () => {
      const { data, error: statusError } = await getSupabaseBrowserClient().rpc("get_my_status");
      if (statusError) setError(statusError.message);
      else if (data) applyStatus(data as StatusPayload);
    };
    void poll();
    const interval = setInterval(() => void poll(), 1_500);
    return () => clearInterval(interval);
  }, [applyStatus, demoMode, view]);

  useEffect(() => {
    if (demoMode || view !== "lobby" || !lobbyId) return;
    const client = getSupabaseBrowserClient();
    void client.from("messages").select("id, player_id, riot_id, body, created_at")
      .eq("lobby_id", lobbyId).order("created_at")
      .then(({ data }) => setMessages((data as ChatMessage[]) ?? []));
    const channel = client.channel(`lobby:${lobbyId}`).on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `lobby_id=eq.${lobbyId}` },
      (payload) => setMessages((current) => [...current, payload.new as ChatMessage]),
    ).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [demoMode, lobbyId, view]);

  const makeDemoMembers = useCallback(() => {
    const missing = form.targetSize - form.partySize;
    const others: Member[] = Array.from({ length: missing }, (_, index) => ({
      playerId: `demo-${index}`,
      displayName: game === "cs2" ? `SteamOyuncu${index + 1}` : DEMO_NAMES[index],
      contactValue: game === "cs2" ? `12345${index}` : DEMO_NAMES[index],
      game,
      rankSystem: form.rankSystem,
      rank: game === "cs2" && selectedQueue === "premier"
        ? Math.min(50_000, form.rank + (index % 2 ? 500 : -500))
        : Math.min(rankOptions.length - 1, Math.max(0, form.rank + (index % 2 ? 1 : -1))),
      partySize: 1,
      roles: game === "league-of-legends" ? [LOL_ROLES[(form.roles.length + index) % LOL_ROLES.length].value] : [],
      accepted: index === 0,
    }));
    return [{
      playerId: "me",
      displayName,
      contactValue,
      game,
      rankSystem: form.rankSystem,
      rank: form.rank,
      partySize: form.partySize,
      roles: form.roles,
      accepted: null,
      isMe: true,
    }, ...others];
  }, [contactValue, displayName, form, game, rankOptions.length, selectedQueue]);

  function updateQueueFilters(filters: { servers: string[]; queueTypes: string[]; maps: string[] }) {
    const nextQueue = filters.queueTypes[0] ?? config.defaultQueue;
    const nextRankSystem = rankSystemFor(game, nextQueue);
    setForm((current) => {
      if (current.rankSystem === nextRankSystem) return { ...current, ...filters };
      if (game === "cs2" && nextQueue === "competitive") {
        return { ...current, ...filters, rankSystem: nextRankSystem, rank: 7, minRank: 4, maxRank: 17 };
      }
      if (game === "cs2") {
        return { ...current, ...filters, rankSystem: nextRankSystem, rank: 9_500, minRank: 5_000, maxRank: 50_000 };
      }
      if (game === "league-of-legends" && nextQueue === "solo-duo") {
        return { ...current, ...filters, rankSystem: nextRankSystem, partySize: 1, targetSize: 2, roles: current.roles.slice(0, 1) };
      }
      if (game === "league-of-legends") {
        return { ...current, ...filters, rankSystem: nextRankSystem, targetSize: 5 };
      }
      return { ...current, ...filters, rankSystem: nextRankSystem };
    });
  }

  function updatePartySize(partySize: number) {
    setForm((current) => ({
      ...current,
      partySize,
      targetSize: 5,
      roles: game === "league-of-legends"
        ? current.roles.slice(0, partySize)
        : current.roles,
    }));
  }

  async function startSearch(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    const payload = { ...form, displayName, contactValue };
    const parsed = searchSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Bilgileri kontrol et.");
      return;
    }
    setLogoHighlight("find");
    setBusy(true);
    setSearchSeconds(0);
    if (demoMode) {
      timers.current.push(setTimeout(() => {
        setView("searching");
        setBusy(false);
        timers.current.push(setTimeout(() => {
          setMembers(makeDemoMembers());
          setProposalId("demo-proposal");
          setView("proposal");
        }, 2_800));
      }, 200));
      return;
    }
    try {
      const client = getSupabaseBrowserClient();
      const { data: sessionData } = await client.auth.getSession();
      if (!sessionData.session) {
        setNeedsCaptcha(true);
        if (turnstileEnabled && !captchaToken) throw new Error("Güvenlik doğrulamasını tamamla.");
        const { error: authError } = await client.auth.signInAnonymously(
          turnstileEnabled ? { options: { captchaToken } } : undefined,
        );
        if (authError) throw authError;
        setNeedsCaptcha(false);
        setCaptchaToken("");
      }
      const { data, error: queueError } = await client.rpc("enqueue_and_attempt_match", {
        p_riot_id: payload.displayName,
        p_rank: payload.rank,
        p_party_size: payload.partySize,
        p_min_rank: payload.minRank,
        p_max_rank: payload.maxRank,
        p_servers: payload.servers,
        p_queue_types: payload.queueTypes,
        p_target_size: payload.targetSize,
        p_context: {
          game: payload.game,
          rankSystem: payload.rankSystem,
          contactValue: payload.contactValue,
          roles: payload.roles,
          maps: payload.maps,
        },
      });
      if (queueError) throw queueError;
      applyStatus(data as StatusPayload);
    } catch (caught) {
      setError(readableError(caught));
      setView("home");
      setLogoHighlight("crew");
    } finally {
      setBusy(false);
    }
  }

  async function respond(accepted: boolean) {
    setBusy(true);
    if (demoMode) {
      if (!accepted) {
        setView("home"); setLogoHighlight("crew"); setMembers([]); setBusy(false); return;
      }
      setMembers((current) => current.map((member) => ({ ...member, accepted: true })));
      timers.current.push(setTimeout(() => {
        setLobbyId("demo-lobby");
        setMessages([{ id: "welcome", player_id: "system", body: "Takım hazır. Oyuncu bilgilerini kopyalayıp oyunda buluşabilirsiniz.", created_at: new Date().toISOString() }]);
        setView("lobby"); setBusy(false);
      }, 700));
      return;
    }
    const { data, error: responseError } = await getSupabaseBrowserClient().rpc("respond_to_proposal", {
      p_proposal_id: proposalId,
      p_accept: accepted,
    });
    if (responseError) setError(responseError.message);
    else applyStatus(data as StatusPayload);
    setBusy(false);
  }

  async function leave() {
    cleanupTimers();
    if (!demoMode) await getSupabaseBrowserClient().rpc("leave_current");
    setView("home"); setLogoHighlight("crew"); setNotice(""); setMembers([]); setMessages([]);
    setProposalId(null); setLobbyId(null);
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const body = message.trim();
    if (!body || body.length > 500) return;
    setMessage("");
    if (demoMode) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), player_id: "me", body, created_at: new Date().toISOString(), riot_id: displayName }]);
      return;
    }
    const { error: sendError } = await getSupabaseBrowserClient().rpc("send_lobby_message", { p_lobby_id: lobbyId, p_body: body });
    if (sendError) setError(sendError.message);
  }

  async function copyContact(member: Member) {
    const value = game === "cs2" ? member.contactValue ?? member.displayName : member.displayName;
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(value);
    setTimeout(() => setCopied(""), 1_200);
  }

  const representedPlayers = useMemo(() => members.reduce((total, member) => total + member.partySize, 0), [members]);
  const currentPlayerId = useMemo(() => members.find((member) => member.isMe)?.playerId ?? "me", [members]);
  const acceptedByMe = members.some((member) => member.isMe && member.accepted === true);
  const rankLabel = (value: number, memberRankSystem = form.rankSystem) => {
    const queue = memberRankSystem === "cs2-competitive" ? "competitive"
      : memberRankSystem === "cs2-premier" ? "premier" : selectedQueue;
    return rankNameFor(game, queue, value);
  };

  return (
    <main className="app-shell bg-[var(--bg)] text-[var(--text-primary)] dark:bg-[var(--bg)] dark:text-[var(--text-primary)]">
      <header className="topbar">
        <Brand highlight={logoHighlight} />
        <div className="topbar-right">
          <GameSelector disabled={view !== "home"} open={openTopbarSelect === "game"} onOpenChange={(open) => { setOpenTopbarSelect(open ? "game" : null); if (open) setOpenRankSelect(null); }} />
          <QueueSelector disabled={view !== "home"} game={game} servers={form.servers} queueTypes={form.queueTypes} maps={form.maps} onChange={updateQueueFilters} open={openTopbarSelect === "queue"} onOpenChange={(open) => { setOpenTopbarSelect(open ? "queue" : null); if (open) setOpenRankSelect(null); }} />
          <button type="button" className="theme-toggle" aria-label={theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç"} onClick={() => { setOpenTopbarSelect(null); setOpenRankSelect(null); const next = theme === "dark" ? "light" : "dark"; setTheme(next); applyTheme(next); }}>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {view === "home" ? (
        <section className="home-section">
          <div className="hero-copy">
            <div className="eyebrow">Takım bulmanın kısa yolu</div>
            <h1>{config.heroTitle}</h1>
            <p>{config.heroDescription}</p>
            {activePlayerCount !== null ? <p className="active-player-count">Şu an <strong>{activePlayerCount}</strong> oyuncu arıyor</p> : null}
          </div>
          <form className="search-form" onSubmit={startSearch}>
            {game === "cs2" ? (
              <div className="form-row identity-row">
                <label className="field"><span>Steam görünen adı</span><div className={`riot-input ${error ? "has-error" : identityName ? "is-valid" : ""}`}><User size={15} /><input value={identityName} onChange={(event) => setIdentityName(event.target.value.slice(0, 32))} placeholder="Oyuncu adı" autoComplete="off" /></div></label>
                <label className="field"><span>Arkadaş kodu <small>(isteğe bağlı)</small></span><div className="riot-input"><Users size={15} /><input inputMode="numeric" value={identityDetail} onChange={(event) => setIdentityDetail(event.target.value.replace(/\D/g, "").slice(0, 12))} placeholder="12345678" autoComplete="off" /></div></label>
              </div>
            ) : (
              <div className="field"><div className={`riot-input ${error ? "has-error" : identityName ? "is-valid" : ""}`}><User size={15} /><input value={identityName} onChange={(event) => setIdentityName(event.target.value.replace(/#/g, "").slice(0, 16))} placeholder="OyuncuAdı" autoComplete="off" aria-label="Riot kullanıcı adı" /><div className="riot-tag"><span>#</span><input value={identityDetail} onChange={(event) => setIdentityDetail(event.target.value.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 5))} placeholder="TR1" aria-label="Riot etiketi" autoComplete="off" /></div></div></div>
            )}

            {game === "cs2" && selectedQueue === "premier" ? (
              <div className="form-row rating-row">
                <RatingSelect id="rating" label={form.partySize > 1 ? "Grubun en yüksek ratingi" : "CS Rating"} value={form.rank} bands={CS2_RATING_BANDS} open={openRankSelect === "rating"} onOpenChange={(id) => { setOpenRankSelect(id); if (id) setOpenTopbarSelect(null); }} onChange={(rank) => setForm((current) => ({ ...current, rank, minRank: Math.min(current.minRank, rank), maxRank: 50_000 }))} />
                <RatingSelect id="min-rating" label="Min. rating" value={form.minRank} bands={CS2_RATING_BANDS} max={form.rank} open={openRankSelect === "min-rating"} onOpenChange={(id) => { setOpenRankSelect(id); if (id) setOpenTopbarSelect(null); }} onChange={(minRank) => setForm((current) => ({ ...current, minRank, maxRank: 50_000 }))} />
              </div>
            ) : (
              <div className="form-row">
                <RankSelect id="rank" label={form.partySize > 1 ? "Grubun en yüksek rankı" : "Rankın"} value={form.rank} ranks={rankOptions} open={openRankSelect === "rank"} onOpenChange={(id) => { setOpenRankSelect(id); if (id) setOpenTopbarSelect(null); }} onChange={(rank) => setForm((current) => ({ ...current, rank, minRank: Math.min(current.minRank, rank), maxRank: rankOptions.length - 1 }))} />
                <RankSelect id="min-rank" label="Min. rank" value={form.minRank} ranks={rankOptions} max={form.rank} open={openRankSelect === "min-rank"} onOpenChange={(id) => { setOpenRankSelect(id); if (id) setOpenTopbarSelect(null); }} onChange={(minRank) => setForm((current) => ({ ...current, minRank, maxRank: rankOptions.length - 1 }))} />
              </div>
            )}

            {game === "league-of-legends" && selectedQueue === "solo-duo" ? <p className="solo-queue-note">Solo/Duo için 1 takım arkadaşı aranır.</p> : <div className="field"><span>Kaç kişisiniz?</span><div className="party-picker">{[1, 2, 3, 4].map((size) => <button type="button" key={size} className={form.partySize === size ? "selected" : ""} onClick={() => updatePartySize(size)}>{form.partySize === size ? `${size} kişi` : size}</button>)}</div></div>}

            {game === "league-of-legends" ? (
              <div className="field"><span>Takımınızdaki roller</span><div className="role-picker">{LOL_ROLES.map((role) => { const selected = form.roles.includes(role.value); const soloQueue = selectedQueue === "solo-duo"; const full = form.roles.length >= form.partySize; return <button type="button" key={role.value} className={selected ? "selected" : ""} disabled={!soloQueue && !selected && full} onClick={() => setForm((current) => ({ ...current, roles: soloQueue ? [role.value] : current.roles.includes(role.value) ? current.roles.filter((value) => value !== role.value) : [...current.roles, role.value] }))}>{role.label}{selected ? <Check size={14} /> : null}</button>; })}</div><small className="field-help">{form.roles.length}/{form.partySize} rol seçildi</small></div>
            ) : null}

            {game === "league-of-legends" && selectedQueue === "solo-duo" ? null : <div className="field"><span>Kaç kişi arıyorsunuz?</span><div className="party-picker search-count-picker">{[1, 2, 3, 4].map((requested) => { const unavailable = requested > 5 - form.partySize; return <button type="button" key={requested} className={form.targetSize - form.partySize === requested ? "selected" : ""} disabled={unavailable} onClick={() => setForm((current) => ({ ...current, targetSize: current.partySize + requested }))}>{form.targetSize - form.partySize === requested ? `${requested} kişi` : requested}</button>; })}</div></div>}

            {game === "cs2" && selectedQueue === "competitive" ? <p className="filter-summary">{selectionLabel(CS2_MAPS, form.maps, "Harita seçilmedi")}</p> : null}
            {!demoMode && turnstileEnabled && turnstileSiteKey && needsCaptcha ? <div className="turnstile-wrap"><Turnstile siteKey={turnstileSiteKey} onSuccess={setCaptchaToken} onExpire={() => setCaptchaToken("")} onError={() => setError("Güvenlik doğrulaması yüklenemedi. Sayfayı yenile.")} options={{ appearance: "interaction-only", theme, size: "flexible" }} /></div> : null}
            {error ? <div className="error-message"><X size={15} /> {error}</div> : null}
            <button className="primary-button" disabled={busy || !authReady || (needsCaptcha && !captchaToken)}>{busy ? <LoaderCircle className="spin" size={19} /> : <Search size={19} />}{busy ? "Aranıyor..." : "Oyuncu ara"}</button>
          </form>
        </section>
      ) : null}

      {view === "searching" ? <section className="center-stage"><div className="searching-panel"><div className="matchmaking-badge"><Users size={34} /></div><span className="step-kicker">Eşleştirme sürüyor</span><h2>Takım arkadaşların aranıyor</h2><p>{rankLabel(form.minRank)} ve üzerindeki uygun oyunculara bakıyoruz.</p>{notice ? <div className="search-notice"><Info size={15} />{notice}</div> : null}<div className="search-stats"><div><span>Geçen süre</span><strong>{String(Math.floor(searchSeconds / 60)).padStart(2, "0")}:{String(searchSeconds % 60).padStart(2, "0")}</strong></div><div><span>Aranan</span><strong>{form.targetSize - form.partySize} oyuncu</strong></div><div><span>Sunucu</span><strong>{selectionLabel(config.servers, form.servers, "Sunucu")}</strong></div></div><button className="ghost-button" onClick={leave}><X size={17} /> Aramayı iptal et</button></div></section> : null}

      {view === "proposal" ? <section className="center-stage"><div className="status-card proposal-card"><div className="proposal-top"><div className="match-icon"><Check size={28} /></div><div><span className="step-kicker">Eşleşme bulundu</span><h2>Bu takıma hazır mısın?</h2></div><div className="countdown"><Clock3 size={18} /><strong>{seconds}</strong><span>sn</span></div></div><div className="squad-list">{members.map((member) => <div className="squad-member" key={member.playerId}><div className="avatar">{member.displayName.charAt(0).toUpperCase()}</div><div className="member-main"><strong>{member.displayName}</strong><span>{rankLabel(member.rank, member.rankSystem)} · {member.partySize === 1 ? "Solo" : `${member.partySize} kişilik grup`}</span></div>{member.isMe ? <span className={`you-pill ${member.accepted ? "ready" : ""}`}>{member.accepted ? <Check size={14} /> : null}{member.accepted ? "Sen · Hazır" : "Sen"}</span> : member.accepted ? <span className="accepted"><Check size={15} /> Hazır</span> : <span className="waiting"><LoaderCircle className="spin" size={15} /> Bekleniyor</span>}</div>)}</div><p className="proposal-note">Temsil edilen toplam oyuncu: <strong>{representedPlayers}/{form.targetSize}</strong></p>{error ? <div className="error-message"><X size={15} /> {error}</div> : null}<div className="proposal-actions"><button className="reject-button" disabled={busy || acceptedByMe} onClick={() => respond(false)}><X size={18} /> Reddet</button><button className={`accept-button ${acceptedByMe ? "confirmed" : ""}`} disabled={busy || acceptedByMe} onClick={() => respond(true)}>{busy ? <LoaderCircle className="spin" size={18} /> : <Check size={18} />}{acceptedByMe ? "Onaylandı" : "Kabul et"}</button></div></div></section> : null}

      {view === "lobby" ? <section className="lobby-layout"><div className="lobby-main"><div className="lobby-heading"><div><span className="live-dot"><span /> Lobi hazır</span><h2>Takım tamamlandı</h2><p>{game === "cs2" ? "Steam bilgilerini" : "Riot ID’leri"} kopyala, oyuncuları ekle ve oyuna geç.</p></div><button className="ghost-button" onClick={leave}><LogOut size={17} /> Lobiden çık</button></div><div className="member-grid">{members.map((member) => { const copyValue = game === "cs2" ? member.contactValue ?? member.displayName : member.displayName; const copyLabel = game === "cs2" && member.contactValue ? "Arkadaş kodunu kopyala" : game === "cs2" ? "Steam adını kopyala" : "Riot ID’yi kopyala"; return <article className="player-card" key={member.playerId}><div className="player-card-top"><div className="avatar large">{member.displayName.charAt(0).toUpperCase()}</div>{member.isMe ? <span className="you-pill">Sen</span> : null}</div><strong>{member.displayName}</strong><span>{rankLabel(member.rank, member.rankSystem)}</span><div className="card-meta"><Users size={14} /> {member.partySize === 1 ? "Solo" : `${member.partySize} kişiyi temsil ediyor`}</div><button onClick={() => copyContact(member)} disabled={!copyValue}>{copied === copyValue ? <Check size={15} /> : <Copy size={15} />}{copied === copyValue ? "Kopyalandı" : copyLabel}</button></article>; })}</div></div><aside className="chat-panel"><div className="chat-heading"><div><MessageCircle size={19} /><strong>Takım sohbeti</strong></div><span>{members.length} temsilci</span></div><div className="messages">{messages.map((item) => item.player_id === "system" ? <div className="system-message" key={item.id}>{item.body}</div> : (() => { const own = item.player_id === currentPlayerId || item.player_id === "me"; const name = item.riot_id ?? (own ? displayName : "Oyuncu"); return <div className={`message ${own ? "mine" : ""}`} key={item.id}><span>{own ? `Sen · ${name}` : name}</span><p>{item.body}</p><time>{new Date(item.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</time></div>; })())}</div><form className="message-form" onSubmit={sendMessage}><input value={message} onChange={(event) => setMessage(event.target.value.slice(0, 500))} placeholder="Mesajını yaz..." /><button aria-label="Gönder"><Send size={18} /></button></form></aside></section> : null}
    </main>
  );
}
