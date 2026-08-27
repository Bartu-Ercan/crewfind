export const REGIONS = [
  { value: "eu", label: "Europe" },
  { value: "tr", label: "Türkiye" },
  { value: "na", label: "North America" },
] as const;

export const QUEUE_TYPES = [
  { value: "competitive", label: "Competitive" },
  { value: "unrated", label: "Unrated" },
] as const;

export type Region = (typeof REGIONS)[number]["value"];
export type QueueType = (typeof QUEUE_TYPES)[number]["value"];

export function queueLabel(region: Region, queueType: QueueType) {
  const regionLabel = REGIONS.find((option) => option.value === region)?.label ?? "Europe";
  const queueLabel = QUEUE_TYPES.find((option) => option.value === queueType)?.label ?? "Competitive";
  return `${regionLabel} · ${queueLabel}`;
}
