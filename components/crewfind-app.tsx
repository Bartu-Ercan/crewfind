"use client";

import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  LoaderCircle,
  LogOut,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase";
import { RANKS, rankName } from "@/lib/ranks";
import { searchSchema, type SearchInput } from "@/lib/validation";

type View = "home" | "searching" | "proposal" | "lobby";

type Member = {
  playerId: string;
  riotId: string;
  rank: number;
  partySize: number;
  accepted?: boolean | null;
  isMe?: boolean;
};

type ChatMessage = {
  id: string;
  player_id: string;
  body: string;
  created_at: string;
  riot_id?: string;
};

type StatusPayload = {
  status: "idle" | "searching" | "proposed" | "lobby";
  proposalId?: string;
  lobbyId?: string;
  expiresAt?: string;
  members?: Member[];
};

const DEMO_NAMES = ["Kuzey#TR01", "Vortex#EUW", "Mira#ACE", "Nyx#0007"];

function readableError(caught: unknown) {
  const message =
    caught instanceof Error
      ? caught.message
      : typeof caught === "object" &&
          caught !== null &&
          "message" in caught &&
          typeof caught.message === "string"
        ? caught.message
        : "";

  if (
    message.includes("enqueue_and_attempt_match") ||
    message.includes("Could not find the function")
  ) {
    return "Supabase kurulumu eksik: CrewFind migration dosyasını SQL Editor’da çalıştır.";
  }

  if (
    message.toLowerCase().includes("captcha") ||
    message.includes("captcha_token")
  ) {
    return "Turnstile doğrulaması eksik. Vercel site key ve Supabase secret key ayarlarını kontrol et.";
  }

  if (message.includes("one_active_queue_per_player")) {
    return "Eski kuyruk kaydı yeni aramayı engelliyor. Supabase queue index onarım migration’ını çalıştır.";
  }

  return message || "Havuza girilemedi.";
}

function Brand() {
  return (
    <div className="brand" aria-label="CrewFind">
      <span className="brand-mark">
        <span />
        <span />
      </span>
      <span>CrewFind</span>
    </div>
  );
}

function RankSelect({
  label,
  value,
  onChange,
  min = 0,
  max = RANKS.length - 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="select-wrap">
        <select value={value} onChange={(event) => onChange(Number(event.target.value))}>
          {RANKS.map((rank, index) =>
            index >= min && index <= max ? (
              <option key={rank} value={index}>
                {rank}
              </option>
            ) : null,
          )}
        </select>
        <ChevronDown size={17} />
      </div>
    </label>
  );
}

export function CrewFindApp() {
  const [view, setView] = useState<View>("home");
  const [form, setForm] = useState<SearchInput>({
    riotId: "",
    rank: 10,
    minRank: 6,
    maxRank: 14,
    partySize: 1,
  });
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
  const inputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const demoMode =
    (process.env.NEXT_PUBLIC_DEMO_MODE ?? "true").trim().toLowerCase() !== "false" ||
    !hasSupabaseConfig();
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const turnstileFlag = process.env.NEXT_PUBLIC_TURNSTILE_ENABLED;
  const turnstileEnabled =
    Boolean(turnstileSiteKey) &&
    (turnstileFlag === undefined ||
      turnstileFlag.trim().toLowerCase() === "true");

  const cleanupTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => cleanupTimers, [cleanupTimers]);

  useEffect(() => {
    if (view !== "searching") return;
    const interval = setInterval(() => setSearchSeconds((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, [view]);

  useEffect(() => {
    if (view !== "proposal") return;
    setSeconds(30);
    const interval = setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          clearInterval(interval);
          if (demoMode) {
            setView("searching");
            setMembers([]);
          }
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [view, demoMode]);

  const makeDemoMembers = useCallback(() => {
    const missing = 5 - form.partySize;
    const others: Member[] = Array.from({ length: missing }, (_, index) => ({
      playerId: `demo-${index}`,
      riotId: DEMO_NAMES[index],
      rank: Math.min(RANKS.length - 1, Math.max(0, form.rank + (index % 2 ? 1 : -1))),
      partySize: 1,
      accepted: index === 0,
    }));
    return [
      {
        playerId: "me",
        riotId: form.riotId,
        rank: form.rank,
        partySize: form.partySize,
        accepted: null,
        isMe: true,
      },
      ...others,
    ];
  }, [form]);

  const applyStatus = useCallback((payload: StatusPayload) => {
    if (payload.status === "searching") setView("searching");
    if (payload.status === "proposed") {
      setProposalId(payload.proposalId ?? null);
      setMembers(payload.members ?? []);
      if (payload.expiresAt) {
        setSeconds(
          Math.max(0, Math.ceil((new Date(payload.expiresAt).getTime() - Date.now()) / 1000)),
        );
      }
      setView("proposal");
    }
    if (payload.status === "lobby") {
      setLobbyId(payload.lobbyId ?? null);
      setMembers(payload.members ?? []);
      setView("lobby");
    }
    if (payload.status === "idle") setView("home");
  }, []);

  useEffect(() => {
    if (demoMode || !["searching", "proposal"].includes(view)) return;
    const poll = async () => {
      const client = getSupabaseBrowserClient();
      const { data, error: statusError } = await client.rpc("get_my_status");
      if (statusError) setError(statusError.message);
      else if (data) applyStatus(data as StatusPayload);
    };
    void poll();
    const interval = setInterval(poll, 1500);
    return () => clearInterval(interval);
  }, [applyStatus, demoMode, view]);

  useEffect(() => {
    if (demoMode || view !== "lobby" || !lobbyId) return;
    const client = getSupabaseBrowserClient();
    void client
      .from("messages")
      .select("id, player_id, riot_id, body, created_at")
      .eq("lobby_id", lobbyId)
      .order("created_at")
      .then(({ data }) => setMessages((data as ChatMessage[]) ?? []));

    const channel = client
      .channel(`lobby:${lobbyId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `lobby_id=eq.${lobbyId}` },
        (payload) => setMessages((current) => [...current, payload.new as ChatMessage]),
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [demoMode, lobbyId, view]);

  async function startSearch(event: FormEvent) {
    event.preventDefault();
    setError("");
    const parsed = searchSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Bilgileri kontrol et.");
      return;
    }
    if (form.rank < form.minRank || form.rank > form.maxRank) {
      setError("Kendi rankın seçtiğin aralığın içinde olmalı.");
      return;
    }

    setBusy(true);
    setSearchSeconds(0);
    if (demoMode) {
      setView("searching");
      timers.current.push(
        setTimeout(() => {
          setMembers(makeDemoMembers());
          setProposalId("demo-proposal");
          setView("proposal");
        }, 2800),
      );
      setBusy(false);
      return;
    }

    try {
      const client = getSupabaseBrowserClient();
      const { data: sessionData } = await client.auth.getSession();
      if (!sessionData.session) {
        if (turnstileEnabled && !captchaToken) {
          throw new Error("Güvenlik doğrulamasını tamamla.");
        }
        const { error: authError } = await client.auth.signInAnonymously(
          turnstileEnabled ? { options: { captchaToken } } : undefined,
        );
        if (authError) throw authError;
      }
      const { data, error: queueError } = await client.rpc("enqueue_and_attempt_match", {
        p_riot_id: form.riotId.trim(),
        p_rank: form.rank,
        p_party_size: form.partySize,
        p_min_rank: form.minRank,
        p_max_rank: form.maxRank,
      });
      if (queueError) throw queueError;
      applyStatus(data as StatusPayload);
    } catch (caught) {
      setError(readableError(caught));
      setView("home");
    } finally {
      setBusy(false);
    }
  }

  async function respond(accepted: boolean) {
    setBusy(true);
    if (demoMode) {
      if (!accepted) {
        setView("home");
        setMembers([]);
        setBusy(false);
        return;
      }
      setMembers((current) =>
        current.map((member) => ({ ...member, accepted: true })),
      );
      timers.current.push(
        setTimeout(() => {
          setLobbyId("demo-lobby");
          setMessages([
            {
              id: "welcome",
              player_id: "system",
              body: "Takım hazır. Riot ID’lerinizi kopyalayıp oyunda buluşabilirsiniz.",
              created_at: new Date().toISOString(),
            },
          ]);
          setView("lobby");
          setBusy(false);
        }, 700),
      );
      return;
    }

    const client = getSupabaseBrowserClient();
    const { data, error: responseError } = await client.rpc("respond_to_proposal", {
      p_proposal_id: proposalId,
      p_accept: accepted,
    });
    if (responseError) setError(responseError.message);
    else applyStatus(data as StatusPayload);
    setBusy(false);
  }

  async function leave() {
    cleanupTimers();
    if (!demoMode) {
      const client = getSupabaseBrowserClient();
      await client.rpc("leave_current");
    }
    setView("home");
    setMembers([]);
    setMessages([]);
    setProposalId(null);
    setLobbyId(null);
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const body = message.trim();
    if (!body || body.length > 500) return;
    setMessage("");
    if (demoMode) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          player_id: "me",
          body,
          created_at: new Date().toISOString(),
          riot_id: form.riotId,
        },
      ]);
      return;
    }
    const client = getSupabaseBrowserClient();
    const { error: sendError } = await client.rpc("send_lobby_message", {
      p_lobby_id: lobbyId,
      p_body: body,
    });
    if (sendError) setError(sendError.message);
  }

  async function copyRiotId(riotId: string) {
    await navigator.clipboard.writeText(riotId);
    setCopied(riotId);
    setTimeout(() => setCopied(""), 1200);
  }

  const representedPlayers = useMemo(
    () => members.reduce((total, member) => total + member.partySize, 0),
    [members],
  );
  const currentPlayerId = useMemo(
    () => members.find((member) => member.isMe)?.playerId ?? "me",
    [members],
  );

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <Brand />
        <div className="topbar-right">
          {demoMode && <span className="demo-pill">Demo modu</span>}
          <span className="region-pill"><span /> EU · Competitive</span>
        </div>
      </header>

      {view === "home" && (
        <section className="home-grid">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={14} /> Takım bulmanın kısa yolu</div>
            <h1>Eksik oyuncuyu bul.<br /><em>Oyuna dön.</em></h1>
            <p>
              İlanlar arasında kaybolmadan, rankına uygun oyuncularla saniyeler içinde eşleş.
            </p>
            <div className="trust-row">
              <span><Zap size={16} /> Hızlı eşleşme</span>
              <span><ShieldCheck size={16} /> Geçici lobiler</span>
              <span><MessageCircle size={16} /> Anlık sohbet</span>
            </div>
          </div>

          <form className="search-card" onSubmit={startSearch}>
            <div className="card-heading">
              <div>
                <span className="step-kicker">Hemen başla</span>
                <h2>Takımını tamamla</h2>
              </div>
              <div className="five-stack">
                {[0, 1, 2, 3, 4].map((dot) => <span key={dot} className={dot < form.partySize ? "active" : ""} />)}
              </div>
            </div>

            <label className="field">
              <span>Riot ID</span>
              <div className="riot-input">
                <input
                  ref={inputRef}
                  value={form.riotId}
                  onChange={(event) => setForm({ ...form, riotId: event.target.value })}
                  placeholder="OyuncuAdı#TR1"
                  autoComplete="off"
                />
                <span>Doğrulanmamış</span>
              </div>
            </label>

            <div className="form-row">
              <RankSelect
                label="Rankın"
                value={form.rank}
                onChange={(rank) =>
                  setForm({
                    ...form,
                    rank,
                    minRank: Math.min(form.minRank, rank),
                    maxRank: Math.max(form.maxRank, rank),
                  })
                }
              />
              <label className="field">
                <span>Kaç kişisiniz?</span>
                <div className="party-picker">
                  {[1, 2, 3, 4].map((size) => (
                    <button
                      type="button"
                      key={size}
                      className={form.partySize === size ? "selected" : ""}
                      onClick={() => setForm({ ...form, partySize: size })}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </label>
            </div>

            <div className="range-block">
              <span className="range-title">Kabul ettiğin rank aralığı</span>
              <div className="form-row">
                <RankSelect
                  label="Minimum"
                  value={form.minRank}
                  max={form.rank}
                  onChange={(minRank) => setForm({ ...form, minRank })}
                />
                <RankSelect
                  label="Maksimum"
                  value={form.maxRank}
                  min={form.rank}
                  onChange={(maxRank) => setForm({ ...form, maxRank })}
                />
              </div>
            </div>

            {!demoMode && turnstileEnabled && turnstileSiteKey && (
              <div className="turnstile-wrap">
                <Turnstile
                  siteKey={turnstileSiteKey}
                  onSuccess={setCaptchaToken}
                  onExpire={() => setCaptchaToken("")}
                  options={{ theme: "dark", size: "flexible" }}
                />
              </div>
            )}
            {error && <div className="error-message"><X size={15} /> {error}</div>}
            <button className="primary-button" disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={19} /> : <Search size={19} />}
              Oyuncu ara
              <span>{5 - form.partySize} kişi eksik</span>
            </button>
            <p className="fine-print">Devam ederek Riot ID ve rank bilgilerinin kullanıcı beyanı olduğunu kabul edersin.</p>
          </form>
        </section>
      )}

      {view === "searching" && (
        <section className="center-stage">
          <div className="status-card searching-card">
            <div className="radar">
              <span className="radar-ring ring-one" />
              <span className="radar-ring ring-two" />
              <span className="radar-ring ring-three" />
              <div className="radar-core"><Users size={29} /></div>
            </div>
            <span className="step-kicker">Eşleştirme sürüyor</span>
            <h2>Takım arkadaşların aranıyor</h2>
            <p>{rankName(form.minRank)} – {rankName(form.maxRank)} arasındaki oyunculara bakıyoruz.</p>
            <div className="search-stats">
              <div><span>Geçen süre</span><strong>{String(Math.floor(searchSeconds / 60)).padStart(2, "0")}:{String(searchSeconds % 60).padStart(2, "0")}</strong></div>
              <div><span>Aranan</span><strong>{5 - form.partySize} oyuncu</strong></div>
              <div><span>Bölge</span><strong>EU</strong></div>
            </div>
            <button className="ghost-button" onClick={leave}><ArrowLeft size={17} /> Aramayı iptal et</button>
          </div>
        </section>
      )}

      {view === "proposal" && (
        <section className="center-stage">
          <div className="status-card proposal-card">
            <div className="proposal-top">
              <div className="match-icon"><Check size={28} /></div>
              <div>
                <span className="step-kicker">Eşleşme bulundu</span>
                <h2>Bu takıma hazır mısın?</h2>
              </div>
              <div className="countdown"><Clock3 size={18} /><strong>{seconds}</strong><span>sn</span></div>
            </div>
            <div className="squad-list">
              {members.map((member) => (
                <div className="squad-member" key={member.playerId}>
                  <div className="avatar">{member.riotId.charAt(0).toUpperCase()}</div>
                  <div className="member-main">
                    <strong>{member.riotId}</strong>
                    <span>{rankName(member.rank)} · {member.partySize === 1 ? "Solo" : `${member.partySize} kişilik grup`}</span>
                  </div>
                  {member.isMe ? (
                    <span className="you-pill">Sen</span>
                  ) : member.accepted ? (
                    <span className="accepted"><Check size={15} /> Hazır</span>
                  ) : (
                    <span className="waiting"><LoaderCircle className="spin" size={15} /> Bekleniyor</span>
                  )}
                </div>
              ))}
            </div>
            <p className="proposal-note">Temsil edilen toplam oyuncu: <strong>{representedPlayers}/5</strong></p>
            {error && <div className="error-message"><X size={15} /> {error}</div>}
            <div className="proposal-actions">
              <button className="reject-button" disabled={busy} onClick={() => respond(false)}><X size={18} /> Reddet</button>
              <button className="accept-button" disabled={busy} onClick={() => respond(true)}>
                {busy ? <LoaderCircle className="spin" size={18} /> : <Check size={18} />} Kabul et
              </button>
            </div>
          </div>
        </section>
      )}

      {view === "lobby" && (
        <section className="lobby-layout">
          <div className="lobby-main">
            <div className="lobby-heading">
              <div>
                <span className="live-dot"><span /> Lobi hazır</span>
                <h2>Takım tamamlandı</h2>
                <p>Riot ID’leri kopyala, arkadaşlık isteğini gönder ve oyuna geç.</p>
              </div>
              <button className="ghost-button" onClick={leave}><LogOut size={17} /> Lobiden çık</button>
            </div>

            <div className="member-grid">
              {members.map((member) => (
                <article className="player-card" key={member.playerId}>
                  <div className="player-card-top">
                    <div className="avatar large">{member.riotId.charAt(0).toUpperCase()}</div>
                    {member.isMe && <span className="you-pill">Sen</span>}
                  </div>
                  <strong>{member.riotId}</strong>
                  <span>{rankName(member.rank)}</span>
                  <div className="card-meta"><Users size={14} /> {member.partySize === 1 ? "Solo" : `${member.partySize} kişiyi temsil ediyor`}</div>
                  <button onClick={() => copyRiotId(member.riotId)}>
                    {copied === member.riotId ? <Check size={15} /> : <Copy size={15} />}
                    {copied === member.riotId ? "Kopyalandı" : "Riot ID’yi kopyala"}
                  </button>
                </article>
              ))}
            </div>
          </div>

          <aside className="chat-panel">
            <div className="chat-heading">
              <div><MessageCircle size={19} /><strong>Takım sohbeti</strong></div>
              <span>{members.length} temsilci</span>
            </div>
            <div className="messages">
              {messages.map((item) => {
                if (item.player_id === "system") {
                  return <div className="system-message" key={item.id}>{item.body}</div>;
                }

                const isOwnMessage = item.player_id === currentPlayerId || item.player_id === "me";
                const displayName = item.riot_id ?? (isOwnMessage && form.riotId ? form.riotId : "Oyuncu");

                return (
                  <div className={`message ${isOwnMessage ? "mine" : ""}`} key={item.id}>
                    <span>{isOwnMessage ? `Sen · ${displayName}` : displayName}</span>
                    <p>{item.body}</p>
                    <time>{new Date(item.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</time>
                  </div>
                );
              })}
            </div>
            <form className="message-form" onSubmit={sendMessage}>
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value.slice(0, 500))}
                placeholder="Mesajını yaz..."
                aria-label="Mesaj"
              />
              <button aria-label="Gönder"><Send size={18} /></button>
            </form>
          </aside>
        </section>
      )}

      <footer>
        <span>© 2026 CrewFind</span>
        <p>Riot Games ile bağlantılı veya Riot Games tarafından desteklenen bir hizmet değildir.</p>
        <nav><a href="#">Gizlilik</a><a href="#">Koşullar</a></nav>
      </footer>
    </main>
  );
}
