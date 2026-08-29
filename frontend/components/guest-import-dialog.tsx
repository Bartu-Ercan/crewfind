"use client";

import { Check, LoaderCircle, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/backend/supabase/browser-client";
import { useAccount } from "@/frontend/components/account-provider";
import { readGuestAccounts, removeGuestAccounts } from "@/frontend/lib/guest-accounts";
import type { GuestRiotAccount } from "@/frontend/types/account";

export function GuestImportDialog() {
  const { isPermanent, overview, refresh } = useAccount();
  const [accounts, setAccounts] = useState<GuestRiotAccount[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [closed, setClosed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isPermanent || !overview || closed) return;
    const local = readGuestAccounts();
    setAccounts(local);
    setSelected(local.map((account) => account.id));
  }, [closed, isPermanent, overview]);

  if (!isPermanent || !overview || !accounts.length || closed) return null;

  async function importSelected() {
    setBusy(true);
    setError("");
    const imported: string[] = [];
    for (const account of accounts.filter((item) => selected.includes(item.id))) {
      const { error: saveError } = await getSupabaseBrowserClient().rpc("save_riot_account", {
        p_account_id: null,
        p_riot_id: account.riotId,
        p_game: account.game,
        p_preferences: account.preference,
      });
      if (saveError && !saveError.message.toLocaleLowerCase("tr-TR").includes("zaten")) {
        setError("Bazı profiller aktarılamadı. Geçerli rank ve filtreleri kontrol et.");
        break;
      }
      imported.push(account.id);
    }
    if (imported.length) removeGuestAccounts(imported);
    await refresh();
    setBusy(false);
    if (imported.length === selected.length) setClosed(true);
  }

  return <div className="modal-backdrop"><section className="import-dialog" role="dialog" aria-modal="true" aria-labelledby="import-title"><button className="modal-close" type="button" aria-label="Kapat" onClick={() => setClosed(true)}><X size={16} /></button><div className="import-icon"><Upload size={20} /></div><span className="step-kicker">MİSAFİR PROFİLLERİ</span><h2 id="import-title">Hesabına aktar</h2><p>Bu tarayıcıda kaydettiğin profillerden istediklerini CrewFind hesabına taşı.</p><div className="import-list">{accounts.map((account) => <label key={account.id}><input type="checkbox" checked={selected.includes(account.id)} onChange={() => setSelected((current) => current.includes(account.id) ? current.filter((id) => id !== account.id) : [...current, account.id])} /><span><strong>{account.riotId}</strong><small>{account.game === "valorant" ? "VALORANT" : "League of Legends"}</small></span>{selected.includes(account.id) ? <Check size={16} /> : null}</label>)}</div>{error ? <p className="auth-feedback error"><X size={14} />{error}</p> : null}<div className="import-actions"><button type="button" className="ghost-button" onClick={() => setClosed(true)}>Şimdi değil</button><button type="button" className="primary-button" disabled={busy || !selected.length} onClick={() => void importSelected()}>{busy ? <LoaderCircle className="spin" size={16} /> : <Upload size={16} />}Seçilenleri aktar</button></div></section></div>;
}
