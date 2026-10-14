import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

/** Datos de productividad (tareas completadas por día, heatmap mensual y desglose semanal) para Análisis. */
export function useAnalytics(enabled: boolean, from?: string, to?: string) {
  return useQuery({
    queryKey: ["analytics", from ?? "default", to ?? "default"],
    queryFn: () => api.analytics(from, to),
    enabled,
  });
}

/** Tareas que llevan tiempo creadas sin completarse. */
export function useStale(enabled: boolean) {
  return useQuery({
    queryKey: ["stale"],
    queryFn: () => api.stale(),
    enabled,
  });
}
