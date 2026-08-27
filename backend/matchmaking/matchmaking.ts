export type MatchEntry = {
  id: string;
  partySize: number;
  targetSize: number;
  rank: number;
  minRank: number;
  maxRank: number;
  server: string;
  queueType: string;
  createdAt: number;
};

export function entriesAreCompatible(a: MatchEntry, b: MatchEntry) {
  return (
    a.rank >= b.minRank &&
    a.rank <= b.maxRank &&
    b.rank >= a.minRank &&
    b.rank <= a.maxRank &&
    a.server === b.server &&
    a.queueType === b.queueType &&
    a.targetSize === b.targetSize
  );
}

export function findBestFive(entries: MatchEntry[]): MatchEntry[] | null {
  const ordered = [...entries].sort(
    (a, b) =>
      Number(b.partySize > 1) - Number(a.partySize > 1) ||
      b.partySize - a.partySize ||
      a.createdAt - b.createdAt,
  );

  let best: MatchEntry[] | null = null;

  function walk(index: number, selected: MatchEntry[], total: number) {
    const targetSize = selected[0]?.targetSize ?? 5;
    if (total === targetSize) {
      best = [...selected];
      return true;
    }
    if (total > targetSize) return false;

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
