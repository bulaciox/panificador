import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

/** Datos de productividad (tareas completadas por día) para la vista de Análisis. */
export function useAnalytics(from: string, to: string, enabled: boolean) {
  return useQuery({
    queryKey: ["analytics", from, to],
    queryFn: () => api.analytics(from, to),
    enabled,
  });
}
