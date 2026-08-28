"use client";

import {
  Check,
  Clock3,
  Copy,
  LoaderCircle,
  LogOut,
  MessageCircle,
  Moon,
  Info,
  Search,
  Send,
  Sun,
  User,
  Users,
  X,
} from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/backend/supabase/browser-client";
import { Brand } from "@/frontend/components/brand";
import { GameSelector } from "@/frontend/components/game-selector";
import { QueueSelector } from "@/frontend/components/queue-selector";
import { RankSelect } from "@/frontend/components/rank-select";
import { DEMO_NAMES } from "@/frontend/config/demo";
import { readableError } from "@/frontend/lib/error-messages";
import type { ChatMessage, Member, StatusPayload, View } from "@/frontend/types/crewfind";
import { RANKS, rankName } from "@/shared/ranks";
import { serverSelectionLabel } from "@/shared/queue-filters";
import { searchSchema, type SearchInput } from "@/shared/validation";

export function CrewFindApp() {
  const [view, setView] = useState<View>("home");
  const [form, setForm] = useState<SearchInput>({
    riotId: "",
    rank: 10,
    minRank: 6,
    maxRank: RANKS.length - 1,
    partySize: 1,
    targetSize: 5,
    servers: ["istanbul"],
    queueTypes: ["competitive"],
  });
  const [riotName, setRiotName] = useState("");
  const [riotTag, setRiotTag] = useState("TR1");
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
  const inputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const riotId = useMemo(() => `${riotName.trim()}#${riotTag.trim()}`, [riotName, riotTag]);

  const demoMode =
    (process.env.NEXT_PUBLIC_DEMO_MODE ?? "true").trim().toLowerCase() !== "false" ||
    !hasSupabaseConfig();
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const turnstileFlag = process.env.NEXT_PUBLIC_TURNSTILE_ENABLED;
  const turnstileEnabled =
    Boolean(turnstileSiteKey) &&
    (turnstileFlag === undefined ||
      turnstileFlag.trim().toLowerCase() === "true");

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

    return () => {
      active = false;
    };
  }, [demoMode, turnstileEnabled]);

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
    const missing = form.targetSize - form.partySize;
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
        riotId,
        rank: form.rank,
        partySize: form.partySize,
        accepted: null,
        isMe: true,
      },
      ...others,
    ];
  }, [form, riotId]);

  const applyStatus = useCallback((payload: StatusPayload) => {
    if (payload.notice) setNotice(payload.notice);
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
    if (payload.status === "idle") {
      setView("home");
      setLogoHighlight("crew");
    }
  }, []);

  useEffect(() => {
    if (demoMode || !["searching", "proposal", "lobby"].includes(view)) return;
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
    setNotice("");
    const searchPayload = { ...form, riotId, maxRank: RANKS.length - 1 };
    const parsed = searchSchema.safeParse(searchPayload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Bilgileri kontrol et.");
      return;
    }
    if (form.rank < form.minRank) {
      setError("Kendi rankın minimum ranktan düşük olamaz.");
      return;
    }

    setLogoHighlight("find");
    setBusy(true);
    setSearchSeconds(0);
    if (demoMode) {
      timers.current.push(
        setTimeout(() => {
          setView("searching");
          setBusy(false);
          timers.current.push(
            setTimeout(() => {
              setMembers(makeDemoMembers());
              setProposalId("demo-proposal");
              setView("proposal");
            }, 2800),
          );
        }, 200),
      );
      return;
    }

    try {
      const client = getSupabaseBrowserClient();
      const { data: sessionData } = await client.auth.getSession();
      if (!sessionData.session) {
        setNeedsCaptcha(true);
        if (turnstileEnabled && !captchaToken) {
          throw new Error("Güvenlik doğrulamasını tamamla.");
        }
        const { error: authError } = await client.auth.signInAnonymously(
          turnstileEnabled ? { options: { captchaToken } } : undefined,
        );
        if (authError) throw authError;
        setNeedsCaptcha(false);
        setCaptchaToken("");
      }
      const { data, error: queueError } = await client.rpc("enqueue_and_attempt_match", {
        p_riot_id: searchPayload.riotId.trim(),
        p_rank: form.rank,
        p_party_size: form.partySize,
        p_min_rank: form.minRank,
        p_max_rank: searchPayload.maxRank,
        p_servers: form.servers,
        p_queue_types: form.queueTypes,
        p_target_size: form.targetSize,
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
        setView("home");
        setLogoHighlight("crew");
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
    setLogoHighlight("crew");
    setNotice("");
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
          riot_id: riotId,
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
  const acceptedByMe = members.some((member) => member.isMe && member.accepted === true);

  return (
    <main className="app-shell bg-[var(--bg)] text-[var(--text-primary)] dark:bg-[var(--bg)] dark:text-[var(--text-primary)]">
      <header className="topbar">
        <Brand highlight={logoHighlight} />
        <div className="topbar-right">
          <GameSelector
            open={openTopbarSelect === "game"}
            onOpenChange={(open) => {
              setOpenTopbarSelect(open ? "game" : null);
              if (open) setOpenRankSelect(null);
            }}
          />
          <QueueSelector
            servers={form.servers}
            queueTypes={form.queueTypes}
            onChange={(filters) => setForm((current) => ({ ...current, ...filters }))}
            open={openTopbarSelect === "queue"}
            onOpenChange={(open) => {
              setOpenTopbarSelect(open ? "queue" : null);
              if (open) setOpenRankSelect(null);
            }}
          />
          <button
            type="button"
            className="theme-toggle"
            aria-label={theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç"}
            onClick={() => {
              setOpenTopbarSelect(null);
              setOpenRankSelect(null);
              const nextTheme = theme === "dark" ? "light" : "dark";
              setTheme(nextTheme);
              applyTheme(nextTheme);
            }}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {view === "home" && (
        <section className="home-section">
          <div className="hero-copy">
            <div className="eyebrow">Takım bulmanın kısa yolu</div>
            <h1>Eksik oyuncuyu bul.</h1>
            <p>
              Rankına uygun oyuncularla saniyeler içinde eşleş.
            </p>
          </div>

          <form className="search-form" onSubmit={startSearch}>
            <div className="field">
              <div className={`riot-input ${error ? "has-error" : riotName ? "is-valid" : ""}`}>
                <User size={15} aria-hidden="true" />
                <input
                  ref={inputRef}
                  value={riotName}
                  onChange={(event) => setRiotName(event.target.value.replace(/#/g, "").slice(0, 16))}
                  placeholder="OyuncuAdı"
                  autoComplete="off"
                  aria-label="Riot kullanıcı adı"
                  aria-invalid={Boolean(error)}
                />
                <div className="riot-tag">
                  <span>#</span>
                  <input
                    value={riotTag}
                    onChange={(event) =>
                      setRiotTag(event.target.value.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 5))
                    }
                    placeholder="TR1"
                    aria-label="Riot etiketi"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <RankSelect
                id="rank"
                label="Rankın"
                value={form.rank}
                open={openRankSelect === "rank"}
                onOpenChange={(id) => {
                  setOpenRankSelect(id);
                  if (id) setOpenTopbarSelect(null);
                }}
                onChange={(rank) =>
                  setForm({
                    ...form,
                    rank,
                    minRank: Math.min(form.minRank, rank),
                    maxRank: RANKS.length - 1,
                  })
                }
              />
              <RankSelect
                id="min-rank"
                label="Min. rank"
                value={form.minRank}
                max={form.rank}
                open={openRankSelect === "min-rank"}
                onOpenChange={(id) => {
                  setOpenRankSelect(id);
                  if (id) setOpenTopbarSelect(null);
                }}
                onChange={(minRank) => setForm({ ...form, minRank, maxRank: RANKS.length - 1 })}
              />
            </div>

            <div className="field">
              <span>Kaç kişisiniz?</span>
              <div className="party-picker">
                {[1, 2, 3, 4].map((size) => (
                  <button
                    type="button"
                    key={size}
                    className={form.partySize === size ? "selected" : ""}
                    onClick={() => setForm({ ...form, partySize: size, targetSize: 5 })}
                  >
                    {form.partySize === size ? `${size} kişi` : size}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <span>Kaç kişi arıyorsunuz?</span>
              <div className="party-picker search-count-picker">
                {[1, 2, 3, 4].map((requestedPlayers) => {
                  const unavailable = requestedPlayers > 5 - form.partySize;
                  return (
                    <button
                      type="button"
                      key={requestedPlayers}
                      className={
                        form.targetSize - form.partySize === requestedPlayers ? "selected" : ""
                      }
                      disabled={unavailable}
                      aria-label={`${requestedPlayers} kişi ara${unavailable ? ", kullanılamaz" : ""}`}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          targetSize: current.partySize + requestedPlayers,
                        }))
                      }
                    >
                      {form.targetSize - form.partySize === requestedPlayers
                        ? `${requestedPlayers} kişi`
                        : requestedPlayers}
                    </button>
                  );
                })}
              </div>
            </div>

            {!demoMode && turnstileEnabled && turnstileSiteKey && needsCaptcha && (
              <div className="turnstile-wrap">
                <Turnstile
                  siteKey={turnstileSiteKey}
                  onSuccess={setCaptchaToken}
                  onExpire={() => setCaptchaToken("")}
                  onError={() => setError("Güvenlik doğrulaması yüklenemedi. Sayfayı yenile.")}
                  options={{ appearance: "interaction-only", theme, size: "flexible" }}
                />
              </div>
            )}
            {error && <div className="error-message"><X size={15} /> {error}</div>}
            <button
              className="primary-button"
              disabled={busy || !authReady || (needsCaptcha && !captchaToken)}
            >
              {busy ? <LoaderCircle className="spin" size={19} /> : <Search size={19} />}
              {busy ? "Aranıyor..." : "Oyuncu ara"}
            </button>
          </form>
        </section>
      )}

      {view === "searching" && (
        <section className="center-stage">
          <div className="searching-panel">
            <div className="matchmaking-badge"><Users size={34} /></div>
            <span className="step-kicker">Eşleştirme sürüyor</span>
            <h2>Takım arkadaşların aranıyor</h2>
            <p>{rankName(form.minRank)} ve üzerindeki uygun oyunculara bakıyoruz.</p>
            {notice ? (
              <div className="search-notice" role="status" aria-live="polite">
                <Info size={15} aria-hidden="true" />
                {notice}
              </div>
            ) : null}
            <div className="search-stats">
              <div><span>Geçen süre</span><strong>{String(Math.floor(searchSeconds / 60)).padStart(2, "0")}:{String(searchSeconds % 60).padStart(2, "0")}</strong></div>
              <div><span>Aranan</span><strong>{form.targetSize - form.partySize} oyuncu</strong></div>
              <div><span>Sunucu</span><strong>{serverSelectionLabel(form.servers)}</strong></div>
            </div>
            <button className="ghost-button" onClick={leave}><X size={17} /> Aramayı iptal et</button>
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
                    <span className={`you-pill ${member.accepted ? "ready" : ""}`}>
                      {member.accepted ? <Check size={14} aria-hidden="true" /> : null}
                      {member.accepted ? "Sen · Hazır" : "Sen"}
                    </span>
                  ) : member.accepted ? (
                    <span className="accepted"><Check size={15} /> Hazır</span>
                  ) : (
                    <span className="waiting"><LoaderCircle className="spin" size={15} /> Bekleniyor</span>
                  )}
                </div>
              ))}
            </div>
            <p className="proposal-note">Temsil edilen toplam oyuncu: <strong>{representedPlayers}/{form.targetSize}</strong></p>
            {error && <div className="error-message"><X size={15} /> {error}</div>}
            <div className="proposal-actions">
              <button className="reject-button" disabled={busy || acceptedByMe} onClick={() => respond(false)}><X size={18} /> Reddet</button>
              <button
                className={`accept-button ${acceptedByMe ? "confirmed" : ""}`}
                disabled={busy || acceptedByMe}
                onClick={() => respond(true)}
              >
                {busy ? <LoaderCircle className="spin" size={18} /> : <Check size={18} />}
                {acceptedByMe ? "Onaylandı" : "Kabul et"}
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
                const displayName = item.riot_id ?? (isOwnMessage && riotName ? riotId : "Oyuncu");

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

    </main>
  );
}
