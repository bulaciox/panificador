export const Priority = {
  None: 0,
  Low: 1,
  Medium: 2,
  High: 3,
} as const;

export type PriorityValue = (typeof Priority)[keyof typeof Priority];

export interface Task {
  id: string;
  title: string;
  notes: string | null;
  scheduledDate: string;
  completedOn: string | null;
  priority: PriorityValue;
  isArchived: boolean;
  hiddenOn: string | null;
  folderId: string | null;
  parentId: string | null;
  sortOrder: number;
  isCompleted: boolean;
  /** Viene de un día anterior y sigue pendiente. */
  carriedOver: boolean;
  daysCarried: number;
  /** Se completó justo el día que se está mirando. */
  completedOnViewedDay: boolean;
  children: Task[];
}

export interface Day {
  date: string;
  tasks: Task[];
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  pending: number;
}

/** 1 = cumplido, 2 = saltado (mantiene el color pero no sube la racha). */
export const HabitState = { Done: 1, Skipped: 2 } as const;

export type HabitStateValue = (typeof HabitState)[keyof typeof HabitState];

export interface HabitDay {
  date: string;
  state: HabitStateValue | null;
  /** Días encadenados hasta ese día: decide la intensidad del color. */
  streak: number;
}

export interface Habit {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  weekCount: number;
  monthCount: number;
  yearCount: number;
  days: HabitDay[];
}

export interface StrengthNote {
  id: string;
  text: string;
  label: string | null;
  date: string;
  createdAt: string;
}

export interface StrengthDay {
  date: string;
  notes: StrengthNote[];
}

export interface StrengthLabel {
  name: string;
  count: number;
}

export interface StrengthFeed {
  days: StrengthDay[];
  labels: StrengthLabel[];
  todayCount: number;
}

export interface Counts {
  today: number;
  upcoming: number;
  archived: number;
}

export interface CreateTaskInput {
  title: string;
  scheduledDate?: string;
  priority?: PriorityValue;
  parentId?: string | null;
  folderId?: string | null;
  notes?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  notes?: string;
  priority?: PriorityValue;
  scheduledDate?: string;
}

export interface AuthStatus {
  /** Hay contraseña configurada en el servidor. */
  required: boolean;
  authenticated: boolean;
}

/** Aviso global de sesión caducada: lo escucha App para volver a pedir la contraseña. */
let unauthorizedHandler: (() => void) | null = null;

export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });

  // 401 en cualquier llamada = la cookie ya no vale; no aplica al propio login.
  if (response.status === 401 && !path.startsWith("/api/auth/")) {
    unauthorizedHandler?.();
  }

  if (!response.ok) {
    const detail = await response.text();
    // El backend responde { "error": "..." }; se saca el mensaje para poder mostrarlo tal cual.
    let message = detail;
    try {
      const parsed = JSON.parse(detail);
      if (typeof parsed?.error === "string") message = parsed.error;
    } catch {
      // cuerpo no JSON: se usa el texto crudo
    }
    throw new Error(message || `${response.status} ${response.statusText}`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });

export const api = {
  authStatus: () => request<AuthStatus>("/api/auth/status"),

  login: (password: string) => post<{ authenticated: boolean }>("/api/auth/login", { password }),

  logout: () => post<void>("/api/auth/logout"),

  day: (date: string) => request<Day>(`/api/days/${date}`),

  upcoming: () => request<Day[]>("/api/upcoming"),

  counts: () => request<Counts>("/api/counts"),

  hidden: (date: string) => request<Task[]>(`/api/days/${date}/hidden`),

  archive: () => request<Task[]>("/api/archive"),

  folders: () => request<Folder[]>("/api/folders"),

  folderTasks: (id: string) => request<Task[]>(`/api/folders/${id}/tasks`),

  createFolder: (name: string, color: string) =>
    post<Folder>("/api/folders", { name, color }),

  updateFolder: (id: string, input: { name?: string; color?: string }) =>
    request<Folder>(`/api/folders/${id}`, { method: "PATCH", body: JSON.stringify(input) }),

  deleteFolder: (id: string) => request<void>(`/api/folders/${id}`, { method: "DELETE" }),

  setFolder: (id: string, folderId: string | null) =>
    post<Task>(`/api/tasks/${id}/folder`, { folderId }),

  habits: (from: string, to: string) =>
    request<Habit[]>(`/api/habits?from=${from}&to=${to}`),

  createHabit: (name: string, color: string) =>
    post<Habit>("/api/habits", { name, color }),

  updateHabit: (id: string, input: { name?: string; color?: string }) =>
    request<void>(`/api/habits/${id}`, { method: "PATCH", body: JSON.stringify(input) }),

  deleteHabit: (id: string) => request<void>(`/api/habits/${id}`, { method: "DELETE" }),

  /** Un clic recorre los estados: sin marcar → cumplido → saltado → sin marcar. */
  cycleHabitDay: (id: string, date: string) =>
    post<void>(`/api/habits/${id}/entries`, { date }),

  reorderHabits: (orderedIds: string[]) =>
    post<void>("/api/habits/reorder", { orderedIds }),

  strengths: (from: string, to: string) =>
    request<StrengthFeed>(`/api/strengths?from=${from}&to=${to}`),

  createStrength: (input: { text: string; label?: string | null; date?: string }) =>
    post<StrengthNote>("/api/strengths", input),

  updateStrength: (id: string, input: { text?: string; label?: string }) =>
    request<StrengthNote>(`/api/strengths/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  deleteStrength: (id: string) =>
    request<void>(`/api/strengths/${id}`, { method: "DELETE" }),

  create: (input: CreateTaskInput) => post<Task>("/api/tasks", input),

  update: (id: string, input: UpdateTaskInput) =>
    request<Task>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(input) }),

  complete: (id: string, date: string) => post<Task>(`/api/tasks/${id}/complete`, { date }),

  uncomplete: (id: string, date: string) => post<Task>(`/api/tasks/${id}/uncomplete`, { date }),

  archiveTask: (id: string) => post<void>(`/api/tasks/${id}/archive`),

  unarchive: (id: string, date: string) => post<Task>(`/api/tasks/${id}/unarchive`, { date }),

  hide: (id: string, date: string) => post<void>(`/api/tasks/${id}/hide`, { date }),

  unhide: (id: string) => post<void>(`/api/tasks/${id}/unhide`),

  reorder: (orderedIds: string[]) => post<void>("/api/tasks/reorder", { orderedIds }),

  remove: (id: string) => request<void>(`/api/tasks/${id}`, { method: "DELETE" }),
};
