export type MatchEntry = {
  id: string;
  game: "valorant" | "league-of-legends" | "cs2";
  rankSystem: string;
  partySize: number;
  targetSize: number;
  rank: number;
  minRank: number;
  maxRank: number;
  servers: string[];
  queueTypes: string[];
  roles: string[];
  maps: string[];
  createdAt: number;
};

export function entriesAreCompatible(a: MatchEntry, b: MatchEntry) {
  return (
    a.rank >= b.minRank &&
    a.rank <= b.maxRank &&
    b.rank >= a.minRank &&
    b.rank <= a.maxRank &&
    a.game === b.game &&
    a.rankSystem === b.rankSystem &&
    a.servers.some((server) => b.servers.includes(server)) &&
    a.queueTypes.some((queueType) => b.queueTypes.includes(queueType)) &&
    a.targetSize === b.targetSize &&
    (a.game !== "league-of-legends" || !a.roles.some((role) => b.roles.includes(role))) &&
    (a.rankSystem !== "cs2-competitive" || a.maps.some((map) => b.maps.includes(map)))
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
    selectedRoles: string[],
    commonMaps: string[],
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
      const nextRoles = [...selectedRoles, ...candidate.roles];
      const nextMaps = selected.length
        ? commonMaps.filter((map) => candidate.maps.includes(map))
        : candidate.maps;
      const rolesAreUnique = new Set(nextRoles).size === nextRoles.length;

      if (
        nextServers.length > 0 &&
        nextQueueTypes.length > 0 &&
        (candidate.game !== "league-of-legends" || rolesAreUnique) &&
        (candidate.rankSystem !== "cs2-competitive" || nextMaps.length > 0) &&
        selected.every((entry) => entriesAreCompatible(entry, candidate))
      ) {
        if (
          walk(
            i + 1,
            [...selected, candidate],
            total + candidate.partySize,
            nextServers,
            nextQueueTypes,
            nextRoles,
            nextMaps,
          )
        ) {
          return true;
        }
      }
    }
    return false;
  }

  walk(0, [], 0, [], [], [], []);
  return best;
}
