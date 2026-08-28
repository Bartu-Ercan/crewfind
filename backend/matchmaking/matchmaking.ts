export type MatchEntry = {
  id: string;
  partySize: number;
  targetSize: number;
  rank: number;
  minRank: number;
  maxRank: number;
  servers: string[];
  queueTypes: string[];
  createdAt: number;
};

export function entriesAreCompatible(a: MatchEntry, b: MatchEntry) {
  return (
    a.rank >= b.minRank &&
    a.rank <= b.maxRank &&
    b.rank >= a.minRank &&
    b.rank <= a.maxRank &&
    a.servers.some((server) => b.servers.includes(server)) &&
    a.queueTypes.some((queueType) => b.queueTypes.includes(queueType)) &&
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

  function walk(
    index: number,
    selected: MatchEntry[],
    total: number,
    commonServers: string[],
    commonQueueTypes: string[],
  ) {
    const targetSize = selected[0]?.targetSize ?? 5;
    if (total === targetSize) {
      best = [...selected];
      return true;
    }
    if (total > targetSize) return false;

    for (let i = index; i < ordered.length; i += 1) {
      const candidate = ordered[i];
      const nextServers = selected.length
        ? commonServers.filter((server) => candidate.servers.includes(server))
        : candidate.servers;
      const nextQueueTypes = selected.length
        ? commonQueueTypes.filter((queueType) => candidate.queueTypes.includes(queueType))
        : candidate.queueTypes;

      if (
        nextServers.length > 0 &&
        nextQueueTypes.length > 0 &&
        selected.every((entry) => entriesAreCompatible(entry, candidate))
      ) {
        if (
          walk(
            i + 1,
            [...selected, candidate],
            total + candidate.partySize,
            nextServers,
            nextQueueTypes,
          )
        ) {
          return true;
        }
      }
    }
    return false;
  }

  walk(0, [], 0, [], []);
  return best;
}
