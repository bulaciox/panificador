import { Priority, type PriorityValue } from "./api";

export interface PriorityMeta {
  value: PriorityValue;
  label: string;
  short: string;
  text: string;
  dot: string;
}

export const PRIORITY_META: Record<PriorityValue, PriorityMeta> = {
  [Priority.High]: {
    value: Priority.High,
    label: "Prioridad alta",
    short: "Alta",
    text: "text-danger",
    dot: "bg-danger",
  },
  [Priority.Medium]: {
    value: Priority.Medium,
    label: "Prioridad media",
    short: "Media",
    text: "text-warning",
    dot: "bg-warning",
  },
  [Priority.Low]: {
    value: Priority.Low,
    label: "Prioridad baja",
    short: "Baja",
    text: "text-accent",
    dot: "bg-accent",
  },
  [Priority.None]: {
    value: Priority.None,
    label: "Sin prioridad",
    short: "Ninguna",
    text: "text-muted-foreground",
    dot: "bg-faded",
  },
};

export const PRIORITY_ORDER: PriorityValue[] = [
  Priority.High,
  Priority.Medium,
  Priority.Low,
  Priority.None,
];
