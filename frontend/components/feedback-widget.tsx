"use client";

import { Check, LoaderCircle, MessageSquareText, Send, X } from "lucide-react";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/backend/supabase/browser-client";

type FeedbackKind = "suggestion" | "bug" | "other";

const FOCUSABLE = [
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const kinds: Array<{ value: FeedbackKind; label: string }> = [
  { value: "suggestion", label: "Öneri" },
  { value: "bug", label: "Hata" },
  { value: "other", label: "Diğer" },
];

export function FeedbackWidget({ sourcePath }: { sourcePath: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>("suggestion");
  const [message, setMessage] = useState("");
  const [replyEmail, setReplyEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const headingId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? dialogRef.current)?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, [open]);

  function close() {
    if (busy) return;
    setOpen(false);
    if (sent) {
      setKind("suggestion");
      setMessage("");
      setReplyEmail("");
      setSent(false);
    }
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (message.trim().length < 10) {
      setError("Mesajın en az 10 karakter olmalı.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (hasSupabaseConfig()) {
        const { data } = await getSupabaseBrowserClient().auth.getSession();
        if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
      }
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers,
        body: JSON.stringify({ kind, message, replyEmail, sourcePath, website: "" }),
      });
      if (response.status === 429) {
        setError("Çok sık gönderim yaptın. Biraz bekleyip tekrar dene.");
        return;
      }
      if (!response.ok) {
        setError("Mesaj gönderilemedi. Tekrar dene.");
        return;
      }
      setSent(true);
    } catch {
      setError("Bağlantı kurulamadı. Tekrar dene.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="feedback-footer">
        <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
          <MessageSquareText size={15} />
          Fikir ve öneri
        </button>
      </div>
      {open ? (
        <div className="feedback-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <section
            ref={dialogRef}
            className="feedback-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            aria-describedby={descriptionId}
            tabIndex={-1}
          >
            <button type="button" className="modal-close" aria-label="Kapat" onClick={close}><X size={16} /></button>
            {sent ? (
              <div className="feedback-success" aria-live="polite">
                <span><Check size={20} /></span>
                <div>
                  <strong>Mesajın alındı</strong>
                  <p>Beta sürümünü geliştirmemize katkın için teşekkürler.</p>
                </div>
                <button type="button" onClick={close}>Kapat</button>
              </div>
            ) : (
              <>
                <span className="step-kicker">CREWFIND BETA</span>
                <h2 id={headingId}>Fikrini paylaş</h2>
                <p id={descriptionId}>Önerini veya karşılaştığın sorunu doğrudan ilet.</p>
                <form className="feedback-form" onSubmit={submit}>
                  <div className="feedback-kinds" role="group" aria-label="Geri bildirim türü">
                    {kinds.map((item) => (
                      <button
                        type="button"
                        key={item.value}
                        className={kind === item.value ? "selected" : ""}
                        aria-pressed={kind === item.value}
                        onClick={() => setKind(item.value)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <label>
                    <span>Mesajın</span>
                    <textarea
                      required
                      minLength={10}
                      maxLength={2000}
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder="Ne düşünüyorsun?"
                    />
                    <small>{message.length}/2000</small>
                  </label>
                  <label>
                    <span>E-posta <small>(isteğe bağlı)</small></span>
                    <input
                      type="email"
                      maxLength={254}
                      value={replyEmail}
                      onChange={(event) => setReplyEmail(event.target.value)}
                      placeholder="Yanıt almak istersen"
                      autoComplete="email"
                    />
                  </label>
                  <label className="feedback-honeypot" aria-hidden="true">
                    <span>Website</span>
                    <input name="website" tabIndex={-1} autoComplete="off" />
                  </label>
                  <div aria-live="polite">
                    {error ? <p className="auth-feedback error"><X size={14} />{error}</p> : null}
                  </div>
                  <div className="feedback-actions">
                    <span>E-posta yalnız yanıt vermek için kullanılır.</span>
                    <button type="submit" disabled={busy || message.trim().length < 10}>
                      {busy ? <LoaderCircle className="spin" size={15} /> : <Send size={15} />}
                      {busy ? "Gönderiliyor" : "Gönder"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
