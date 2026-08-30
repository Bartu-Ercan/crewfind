"use client";

import { Check, ChevronUp, UserRound } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import type { SavedRiotAccount } from "@/frontend/types/account";

export type SelectableRiotAccount = Pick<SavedRiotAccount, "id" | "riotId" | "verificationStatus" | "lastUsedAt" | "preferences"> & { local?: boolean };

export function SavedAccountPicker({ accounts, selectedId, disabled, onSelect }: {
  accounts: SelectableRiotAccount[];
  selectedId: string | null;
  disabled: boolean;
  onSelect: (account: SelectableRiotAccount) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const pendingFocusIndex = useRef<number | null>(null);
  const selectedIndex = Math.max(0, accounts.findIndex((account) => account.id === selectedId));

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent | FocusEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeWithEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open || pendingFocusIndex.current === null) return;
    optionRefs.current[pendingFocusIndex.current]?.focus();
    pendingFocusIndex.current = null;
  }, [open]);

  if (!accounts.length) return null;

  function openAndFocus(index: number) {
    if (open) {
      optionRefs.current[index]?.focus();
      return;
    }
    pendingFocusIndex.current = index;
    setOpen(true);
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openAndFocus(selectedIndex);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openAndFocus(accounts.length - 1);
    }
  }

  function handleOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      optionRefs.current[(index + direction + accounts.length) % accounts.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      optionRefs.current[event.key === "Home" ? 0 : accounts.length - 1]?.focus();
    }
  }

  return (
    <div className="absolute -top-[21px] left-[18px] z-30" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-6 items-center gap-1.5 rounded-t-[9px] rounded-b-[3px] border border-b-0 border-[var(--border)] bg-[var(--surface)] px-2.5 text-[10px] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--accent)_36%,transparent)] disabled:opacity-50 motion-reduce:transition-none"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={handleTriggerKeyDown}
      >
        <UserRound aria-hidden="true" size={12} />
        Kayıtlı hesaplar
        <ChevronUp aria-hidden="true" size={11} className={`transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Kayıtlı Riot hesapları"
          className="absolute bottom-[calc(100%+6px)] left-0 max-h-[min(240px,42dvh)] w-[min(300px,calc(100vw-32px))] origin-bottom-left overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5 animate-[account-popover-in_140ms_ease-out] motion-reduce:animate-none"
        >
          {accounts.map((account, index) => {
            const selected = account.id === selectedId;
            return (
              <button
                ref={(node) => { optionRefs.current[index] = node; }}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                key={account.id}
                className={`flex h-10 w-full items-center gap-2 rounded-xl border-0 px-3 text-left text-xs font-semibold transition-colors ${selected ? "bg-[var(--accent-soft)] text-[var(--text-primary)]" : "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"}`}
                onClick={() => {
                  onSelect(account);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                onKeyDown={(event) => handleOptionKeyDown(event, index)}
              >
                <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{account.riotId}</span>
                {selected ? <Check aria-hidden="true" size={14} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
