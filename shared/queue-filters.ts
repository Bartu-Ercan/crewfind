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

export function queueTypeLabel(queueType: QueueType) {
  return QUEUE_TYPES.find((option) => option.value === queueType)?.label ?? "Rekabetçi";
}

export function serverSelectionLabel(servers: ValorantServer[]) {
  const labels = servers.map(serverLabel);
  return labels.length <= 2 ? labels.join(" + ") : `${labels.length} sunucu`;
}

export function queueSelectionLabel(queueTypes: QueueType[]) {
  const labels = queueTypes.map(queueTypeLabel);
  return labels.length === 1 ? labels[0] : "Tüm kuyruklar";
}

export function queueLabel(servers: ValorantServer[], queueTypes: QueueType[]) {
  return `${serverSelectionLabel(servers)} · ${queueSelectionLabel(queueTypes)}`;
}
