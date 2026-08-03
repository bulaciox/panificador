import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useStrengths(from: string, to: string, enabled: boolean) {
  return useQuery({
    queryKey: ["strengths", from, to],
    queryFn: () => api.strengths(from, to),
    enabled,
  });
}

export function useStrengthActions() {
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["strengths"] });
    queryClient.invalidateQueries({ queryKey: ["counts"] });
  };

  const create = useMutation({
    mutationFn: (input: { text: string; label?: string | null; date?: string }) =>
      api.createStrength(input),
    onSuccess: refresh,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { text?: string; label?: string } }) =>
      api.updateStrength(id, input),
    onSuccess: refresh,
  });

  const remove = useMutation({ mutationFn: api.deleteStrength, onSuccess: refresh });

  return { create, update, remove };
}

export type StrengthActions = ReturnType<typeof useStrengthActions>;
