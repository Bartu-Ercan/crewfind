import { GUEST_ACCOUNTS_STORAGE_KEY, type GuestRiotAccount } from "../types/account";

type GuestAccountStore = { version: 1; accounts: GuestRiotAccount[] };

export function readGuestAccounts(): GuestRiotAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(GUEST_ACCOUNTS_STORAGE_KEY) ?? "null") as GuestAccountStore | null;
    if (parsed?.version !== 1 || !Array.isArray(parsed.accounts)) return [];
    return parsed.accounts.filter((account) => account?.id && account?.riotId && account?.preference);
  } catch {
    return [];
  }
}

export function writeGuestAccounts(accounts: GuestRiotAccount[]) {
  const value: GuestAccountStore = { version: 1, accounts: accounts.slice(0, 10) };
  localStorage.setItem(GUEST_ACCOUNTS_STORAGE_KEY, JSON.stringify(value));
}

export function upsertGuestAccount(account: GuestRiotAccount) {
  const accounts = readGuestAccounts();
  const normalized = account.riotId.trim().toLocaleLowerCase("tr-TR");
  const existing = accounts.findIndex((item) =>
    item.game === account.game && item.riotId.trim().toLocaleLowerCase("tr-TR") === normalized,
  );
  const idCollision = existing < 0 && accounts.some((item) => item.id === account.id);
  const saved = {
    ...account,
    id: existing >= 0
      ? accounts[existing].id
      : idCollision
        ? crypto.randomUUID()
        : account.id,
  };
  const remaining = accounts.filter((_, index) => index !== existing);
  writeGuestAccounts([saved, ...remaining]);
  return saved;
}

export function removeGuestAccounts(ids: string[]) {
  const removed = new Set(ids);
  writeGuestAccounts(readGuestAccounts().filter((account) => !removed.has(account.id)));
}
