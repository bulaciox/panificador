import { useEffect, useMemo, useState } from "react";
import { Menu } from "lucide-react";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { AddTaskBar } from "@/components/AddTaskBar";
import { ArchivePanel } from "@/components/ArchivePanel";
import { DayHeader } from "@/components/DayHeader";
import { DayView } from "@/components/DayView";
import { FolderView } from "@/components/FolderView";
import { HabitsView } from "@/components/HabitsView";
import { LoginScreen } from "@/components/LoginScreen";
import { Sidebar, type View } from "@/components/Sidebar";
import { SortToggle } from "@/components/SortToggle";
import { StrengthsView, strengthStreak } from "@/components/StrengthsView";
import { UpcomingView } from "@/components/UpcomingView";
import { Button } from "@/components/ui/button";
import { useHabitActions, useHabits } from "@/hooks/useHabits";
import { useStrengthActions, useStrengths } from "@/hooks/useStrengths";
import {
  useArchive,
  useCounts,
  useDay,
  useFolderActions,
  useFolders,
  useFolderTasks,
  useHidden,
  useTaskActions,
  useUpcoming,
} from "@/hooks/useTasks";
import { api, onUnauthorized } from "@/lib/api";
import { shiftIso, todayIso } from "@/lib/dates";
import { colorDot, FoldersProvider } from "@/lib/folders";
import { cn } from "@/lib/utils";

/**
 * Portería de la app: tema y candado. Mientras haga falta contraseña no se monta el resto,
 * así que no se dispara ninguna consulta a la API antes de tener sesión.
 */
export default function App() {
  const queryClient = useQueryClient();
  const [locked, setLocked] = useState(false);
  const [dark, setDark] = useState(
    () =>
      localStorage.getItem("theme") === "dark" ||
      (localStorage.getItem("theme") === null &&
        window.matchMedia("(prefers-color-scheme: dark)").matches),
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const auth = useQuery({
    queryKey: ["auth"],
    queryFn: () => api.authStatus(),
    staleTime: Infinity,
    retry: false,
  });

  // Si una cookie caduca a media sesión, cualquier 401 devuelve a la pantalla de acceso.
  useEffect(() => {
    onUnauthorized(() => setLocked(true));
    return () => onUnauthorized(null);
  }, []);

  useEffect(() => {
    if (auth.data) setLocked(auth.data.required && !auth.data.authenticated);
  }, [auth.data]);

  const toggleTheme = () => setDark((value) => !value);

  if (auth.isPending) return <div className="min-h-screen bg-background" />;

  if (locked) {
    return (
      <LoginScreen
        onEntered={() => {
          setLocked(false);
          queryClient.invalidateQueries();
        }}
      />
    );
  }

  return <Planner dark={dark} onToggleTheme={toggleTheme} />;
}

function Planner({ dark, onToggleTheme }: { dark: boolean; onToggleTheme: () => void }) {
  const [view, setView] = useState<View>({ kind: "today" });
  const [date, setDate] = useState(todayIso());
  const [menuOpen, setMenuOpen] = useState(false);
  const [habitError, setHabitError] = useState<string | null>(null);
  const [sortByPriority, setSortByPriority] = useState(
    () => localStorage.getItem("sortByPriority") === "true",
  );

  useEffect(() => {
    localStorage.setItem("sortByPriority", String(sortByPriority));
  }, [sortByPriority]);

  // Los avisos de hábitos (p. ej. el límite de días saltados) se van solos.
  useEffect(() => {
    if (!habitError) return;
    const timer = setTimeout(() => setHabitError(null), 5000);
    return () => clearTimeout(timer);
  }, [habitError]);

  const isDay = view.kind === "today";
  const isHabits = view.kind === "habits";
  const isStrengths = view.kind === "strengths";
  // Fuera de la vista de un día, lo que se crea o se completa cuenta como de hoy.
  const viewedDate = isDay ? date : todayIso();

  // Ventana de la rejilla de hábitos: dos semanas que terminan hoy.
  const habitDays = useMemo(() => {
    const today = todayIso();
    return Array.from({ length: 14 }, (_, index) => shiftIso(today, index - 13));
  }, []);

  const habits = useHabits(habitDays[0], habitDays[habitDays.length - 1], isHabits);
  const habitActions = useHabitActions(setHabitError);

  // Ventana de fortalezas: el último mes, para repasar los días anteriores.
  const strengthWindow = useMemo(() => {
    const today = todayIso();
    return { from: shiftIso(today, -29), to: today };
  }, []);

  const strengths = useStrengths(strengthWindow.from, strengthWindow.to, isStrengths);
  const strengthActions = useStrengthActions();

  const folders = useFolders();
  const counts = useCounts();
  const day = useDay(date, isDay);
  const hidden = useHidden(date, isDay);
  const upcoming = useUpcoming(view.kind === "upcoming");
  const archive = useArchive(view.kind === "archive");
  const folderTasks = useFolderTasks(view.kind === "folder" ? view.id : null);
  const actions = useTaskActions(viewedDate);
  const folderActions = useFolderActions();

  const folderList = folders.data ?? [];
  const currentFolder =
    view.kind === "folder" ? folderList.find((item) => item.id === view.id) : undefined;

  const openView = (next: View) => {
    setView(next);
    setMenuOpen(false);
    if (next.kind === "today") setDate(todayIso());
  };

  const showComposer = isDay || view.kind === "folder";

  // El orden solo aplica a listas de tareas: ni el archivo ni los hábitos lo usan.
  const sortToggle = (
    <SortToggle
      sortByPriority={sortByPriority}
      onToggle={() => setSortByPriority((value) => !value)}
    />
  );

  return (
    <FoldersProvider value={folderList}>
      <div className="flex min-h-screen bg-background">
        <Sidebar
          view={view}
          onSelect={openView}
          folders={folderList}
          counts={counts.data}
          folderActions={folderActions}
          dark={dark}
          onToggleTheme={onToggleTheme}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* En escritorio no hay barra superior: los controles viven en la cabecera de cada
              vista. Aquí arriba solo queda lo que el móvil necesita, con la lateral plegada. */}
          <header className="sticky top-0 z-10 flex items-center gap-1 border-b border-border bg-background/85 px-4 py-2 backdrop-blur md:hidden">
            <Button
              variant="ghost"
              size="iconSm"
              title="Menú"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="size-4" />
            </Button>
            <span className="text-[15px] font-semibold tracking-tight">Panificador</span>
          </header>

          <main
            className={cn(
              "mx-auto w-full px-5 pb-24 pt-6",
              // La rejilla de hábitos necesita más ancho que una lista de tareas.
              isHabits ? "max-w-5xl" : "max-w-2xl",
            )}
          >
            {isDay && (
              <DayHeader date={date} onChange={setDate} action={sortToggle} />
            )}

            {view.kind === "upcoming" && (
              <ViewHeader
                title="Futuras"
                subtitle="Lo que has planificado para más adelante."
                action={sortToggle}
              />
            )}

            {view.kind === "archive" && (
              <ViewHeader
                title="Archivo"
                subtitle="Tareas apartadas de la vista. Puedes devolverlas a hoy cuando quieras."
              />
            )}

            {view.kind === "folder" && (
              <ViewHeader
                title={currentFolder?.name ?? "Carpeta"}
                subtitle="Todo lo de esta carpeta, sin importar el día."
                dot={colorDot(currentFolder?.color)}
                action={sortToggle}
              />
            )}

            {isHabits && (
              <ViewHeader
                title="Hábitos"
                subtitle="Cadenas de días, al margen de las tareas. Hoy es la última columna."
              />
            )}

            {isStrengths && (
              <ViewHeader
                title="Fortalezas"
                subtitle={strengthSubtitle(strengthStreak(strengths.data))}
              />
            )}

            {showComposer && (
              <div className="mb-4">
                <AddTaskBar
                  placeholder={
                    currentFolder
                      ? `Añadir a ${currentFolder.name}…`
                      : "Añadir una tarea…"
                  }
                  onAdd={(title, priority) =>
                    actions.create.mutate({
                      title,
                      priority,
                      scheduledDate: viewedDate,
                      folderId: view.kind === "folder" ? view.id : null,
                    })
                  }
                />
              </div>
            )}

            {isDay && (
              <DayView
                day={day.data}
                hidden={hidden.data}
                isLoading={day.isLoading}
                actions={actions}
                sortByPriority={sortByPriority}
              />
            )}

            {view.kind === "upcoming" && (
              <UpcomingView
                days={upcoming.data}
                isLoading={upcoming.isLoading}
                actions={actions}
                sortByPriority={sortByPriority}
                onOpenDay={(value) => {
                  setDate(value);
                  setView({ kind: "today" });
                }}
              />
            )}

            {view.kind === "archive" && (
              <ArchivePanel
                tasks={archive.data}
                isLoading={archive.isLoading}
                actions={actions}
              />
            )}

            {view.kind === "folder" && (
              <FolderView
                tasks={folderTasks.data}
                isLoading={folderTasks.isLoading}
                actions={actions}
                sortByPriority={sortByPriority}
              />
            )}

            {isStrengths && (
              <StrengthsView
                feed={strengths.data}
                isLoading={strengths.isLoading}
                actions={strengthActions}
              />
            )}

            {isHabits && (
              <HabitsView
                habits={habits.data}
                isLoading={habits.isLoading}
                days={habitDays}
                today={todayIso()}
                actions={habitActions}
                error={habitError}
                onDismissError={() => setHabitError(null)}
              />
            )}
          </main>
        </div>
      </div>
    </FoldersProvider>
  );
}

/** El subtítulo de Fortalezas tira de la racha para dar un empujón. */
function strengthSubtitle(streak: number): string {
  if (streak === 0) return "Momentos en los que fuiste fuerte, día a día.";
  if (streak === 1) return "Hoy ya has apuntado algo. Mañana, otra vez.";
  return `${streak} días seguidos apuntando algo. No lo rompas.`;
}

function ViewHeader({
  title,
  subtitle,
  dot,
  action,
}: {
  title: string;
  subtitle: string;
  dot?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="flex items-center gap-2.5 text-[26px] font-semibold tracking-tight">
          {dot && <span className={cn("size-3 shrink-0 rounded-full", dot)} />}
          <span className="truncate">{title}</span>
        </h1>
        <p className="text-[13px] text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
