"use client";

import { Check, ChevronDown, Plus, Save, Shield, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SavedRiotAccount } from "@/frontend/types/account";
import type { GameId } from "@/shared/game-config";

export type SelectableRiotAccount = Pick<SavedRiotAccount, "id" | "riotId" | "verificationStatus" | "lastUsedAt" | "preferences"> & { local?: boolean };

export function SavedAccountPicker({ game, accounts, selectedId, disabled, onSelect, onNew, onSave }: {
  game: Extract<GameId, "valorant" | "league-of-legends">;
  accounts: SelectableRiotAccount[];
  selectedId: string | null;
  disabled: boolean;
  onSelect: (account: SelectableRiotAccount) => void;
  onNew: () => void;
  onSave: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = accounts.find((account) => account.id === selectedId);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return <div className="saved-account-field"><span>Kayıtlı oyun hesabı</span><div className="saved-account-actions"><div className="saved-account-picker" ref={rootRef}><button type="button" className="saved-account-trigger" disabled={disabled} onClick={() => setOpen((value) => !value)}><UserRound size={16} /><span><strong>{selected?.riotId ?? "Yeni Riot hesabı"}</strong><small>{selected ? selected.verificationStatus === "verified" ? "Doğrulanmış" : selected.local ? "Bu tarayıcıda kayıtlı" : "Kullanıcı beyanı" : game === "valorant" ? "VALORANT" : "League of Legends"}</small></span><ChevronDown size={15} className={open ? "open" : ""} /></button>{open ? <div className="saved-account-menu">{accounts.map((account) => <button type="button" key={account.id} className={account.id === selectedId ? "selected" : ""} onClick={() => { onSelect(account); setOpen(false); }}><Shield size={15} /><span><strong>{account.riotId}</strong><small>{account.verificationStatus === "verified" ? "Doğrulanmış" : account.local ? "Yerel profil" : "Kullanıcı beyanı"}</small></span>{account.id === selectedId ? <Check size={15} /> : null}</button>)}<button type="button" onClick={() => { onNew(); setOpen(false); }}><Plus size={15} /><span><strong>Yeni hesap</strong><small>Formu boşalt</small></span></button></div> : null}</div><button type="button" className="save-profile-button" disabled={disabled} onClick={onSave}><Save size={15} /> Profili kaydet</button></div></div>;
}
