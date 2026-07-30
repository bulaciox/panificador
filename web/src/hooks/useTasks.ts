import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, type CreateTaskInput, type UpdateTaskInput } from "@/lib/api";

export function useDay(date: string, enabled = true) {
  return useQuery({ queryKey: ["day", date], queryFn: () => api.day(date), enabled });
}

export function useUpcoming(enabled: boolean) {
  return useQuery({ queryKey: ["upcoming"], queryFn: () => api.upcoming(), enabled });
}

export function useHidden(date: string, enabled = true) {
  return useQuery({
    queryKey: ["hidden", date],
    queryFn: () => api.hidden(date),
    enabled,
  });
}

export function useArchive(enabled: boolean) {
  return useQuery({ queryKey: ["archive"], queryFn: () => api.archive(), enabled });
}

export function useFolders() {
  return useQuery({ queryKey: ["folders"], queryFn: () => api.folders() });
}

export function useFolderTasks(id: string | null) {
  return useQuery({
    queryKey: ["folder", id],
    queryFn: () => api.folderTasks(id!),
    enabled: id !== null,
  });
}

export function useCounts() {
  return useQuery({ queryKey: ["counts"], queryFn: () => api.counts() });
}

/**
 * Todas las acciones sobre tareas. Cualquier cambio puede afectar a varias vistas
 * (mover de día, arrastrar, archivar, cambiar de carpeta), así que se refresca todo.
 */
export function useTaskActions(viewedDate: string) {
  const queryClient = useQueryClient();

  const refresh = () => {
    for (const key of ["day", "upcoming", "hidden", "archive", "folder", "folders", "counts"]) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  const create = useMutation({
    mutationFn: (input: CreateTaskInput) =>
      api.create({ scheduledDate: viewedDate, ...input }),
    onSuccess: refresh,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      api.update(id, input),
    onSuccess: refresh,
  });

  const toggleComplete = useMutation({
    mutationFn: ({
      id,
      completed,
      date,
    }: {
      id: string;
      completed: boolean;
      date?: string;
    }) =>
      completed
        ? api.uncomplete(id, date ?? viewedDate)
        : api.complete(id, date ?? viewedDate),
    onSuccess: refresh,
  });

  const setFolder = useMutation({
    mutationFn: ({ id, folderId }: { id: string; folderId: string | null }) =>
      api.setFolder(id, folderId),
    onSuccess: refresh,
  });

  const archive = useMutation({ mutationFn: api.archiveTask, onSuccess: refresh });

  const unarchive = useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) => api.unarchive(id, date),
    onSuccess: refresh,
  });

  const hide = useMutation({
    mutationFn: ({ id, date }: { id: string; date?: string }) =>
      api.hide(id, date ?? viewedDate),
    onSuccess: refresh,
  });

  const unhide = useMutation({ mutationFn: api.unhide, onSuccess: refresh });

  const remove = useMutation({ mutationFn: api.remove, onSuccess: refresh });

  const reorder = useMutation({ mutationFn: api.reorder, onSuccess: refresh });

  return {
    create,
    update,
    toggleComplete,
    setFolder,
    archive,
    unarchive,
    hide,
    unhide,
    remove,
    reorder,
  };
}

export function useFolderActions() {
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["folders"] });
    queryClient.invalidateQueries({ queryKey: ["folder"] });
    queryClient.invalidateQueries({ queryKey: ["day"] });
  };

  const create = useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) =>
      api.createFolder(name, color),
    onSuccess: refresh,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name?: string; color?: string } }) =>
      api.updateFolder(id, input),
    onSuccess: refresh,
  });

  const remove = useMutation({ mutationFn: api.deleteFolder, onSuccess: refresh });

  return { create, update, remove };
}

export type TaskActions = ReturnType<typeof useTaskActions>;
export type FolderActions = ReturnType<typeof useFolderActions>;
