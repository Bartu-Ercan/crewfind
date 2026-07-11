export type MatchEntry = {
  id: string;
  partySize: number;
  rank: number;
  minRank: number;
  maxRank: number;
  createdAt: number;
};

export function entriesAreCompatible(a: MatchEntry, b: MatchEntry) {
  return (
    a.rank >= b.minRank &&
    a.rank <= b.maxRank &&
    b.rank >= a.minRank &&
    b.rank <= a.maxRank
  );
}

export function findBestFive(entries: MatchEntry[]) {
  const ordered = [...entries].sort(
    (a, b) =>
      Number(b.partySize > 1) - Number(a.partySize > 1) ||
      b.partySize - a.partySize ||
      a.createdAt - b.createdAt,
  );

  let best: MatchEntry[] | null = null;

  function walk(index: number, selected: MatchEntry[], total: number) {
    if (total === 5) {
      best = [...selected];
      return true;
    }
    if (total > 5) return false;

    for (let i = index; i < ordered.length; i += 1) {
      const candidate = ordered[i];
      if (selected.every((entry) => entriesAreCompatible(entry, candidate))) {
        if (walk(i + 1, [...selected, candidate], total + candidate.partySize)) {
          return true;
        }
      }
    }
    return false;
  }

  walk(0, [], 0);
  return best;
}
