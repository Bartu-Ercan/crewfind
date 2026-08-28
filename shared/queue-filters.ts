import { VALORANT_QUEUES, VALORANT_SERVERS } from "@/shared/game-config";

export { VALORANT_SERVERS };
export const QUEUE_TYPES = VALORANT_QUEUES;

export type ValorantServer = string;
export type QueueType = string;

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
