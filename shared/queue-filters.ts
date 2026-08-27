export const VALORANT_SERVERS = [
  { value: "frankfurt", label: "Frankfurt" },
  { value: "paris", label: "Paris" },
  { value: "london", label: "London" },
  { value: "istanbul", label: "İstanbul" },
  { value: "stockholm", label: "Stockholm" },
  { value: "warsaw", label: "Warsaw" },
] as const;

export const QUEUE_TYPES = [
  { value: "competitive", label: "Rekabetçi" },
  { value: "unrated", label: "Derecesiz" },
] as const;

export type ValorantServer = (typeof VALORANT_SERVERS)[number]["value"];
export type QueueType = (typeof QUEUE_TYPES)[number]["value"];

export function serverLabel(server: ValorantServer) {
  return VALORANT_SERVERS.find((option) => option.value === server)?.label ?? "Frankfurt";
}

export function queueLabel(server: ValorantServer, queueType: QueueType) {
  const selectedServerLabel = serverLabel(server);
  const queueTypeLabel = QUEUE_TYPES.find((option) => option.value === queueType)?.label ?? "Rekabetçi";
  return `${selectedServerLabel} · ${queueTypeLabel}`;
}
