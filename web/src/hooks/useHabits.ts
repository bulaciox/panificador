import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useHabits(from: string, to: string, enabled: boolean) {
  return useQuery({
    queryKey: ["habits", from, to],
    queryFn: () => api.habits(from, to),
    enabled,
  });
}

export function useHabitActions(onError: (message: string) => void) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["habits"] });

  const create = useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) =>
      api.createHabit(name, color),
    onSuccess: refresh,
    onError: (error: Error) => onError(error.message),
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name?: string; color?: string } }) =>
      api.updateHabit(id, input),
    onSuccess: refresh,
    onError: (error: Error) => onError(error.message),
  });

  const remove = useMutation({
    mutationFn: api.deleteHabit,
    onSuccess: refresh,
    onError: (error: Error) => onError(error.message),
  });

  // Aquí es donde salta el aviso de "no puedes saltarte más de 2 días seguidos".
  const cycleDay = useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) => api.cycleHabitDay(id, date),
    onSuccess: refresh,
    onError: (error: Error) => onError(error.message),
  });

  return { create, update, remove, cycleDay };
}

export type HabitActions = ReturnType<typeof useHabitActions>;
