import {
  Archive,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Hourglass,
} from "lucide-react";

import { TaskCircle } from "@/components/TaskCircle";
import { Button } from "@/components/ui/button";
import type { TaskActions } from "@/hooks/useTasks";
import type {
  Analytics,
  AnalyticsCompletedDay,
  AnalyticsCompletedTask,
  AnalyticsDay,
  Task,
} from "@/lib/api";
import { columnDateLabel, shortDate, staleLabel } from "@/lib/dates";
import { colorDot, useFolderList } from "@/lib/folders";
import { cn } from "@/lib/utils";

interface AnalyticsViewProps {
  data: Analytics | undefined;
  isLoading: boolean;
  today: string;
  staleTasks?: Task[];
  actions?: TaskActions;
}

export function AnalyticsView({
  data,
  isLoading,
  today,
  staleTasks,
  actions,
}: AnalyticsViewProps) {
  if (isLoading && !data) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Cargando análisis…
      </div>
    );
  }

  const monthDays = data?.monthDays ?? [];
  const weekCompletedDays = data?.weekCompletedDays ?? [];
  const weekTotal = weekCompletedDays.reduce((acc, d) => acc + d.tasks.length, 0);
  const oldestPendingTasks = (staleTasks ?? []).slice(0, 5);

  return (
    <div className="space-y-5">
      {/* ── Fila superior: Heatmap compacto (izq) + 4-5 Tareas más antiguas sin completar (dcha) ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
        {/* Heatmap pequeño del mes */}
        <MiniMonthHeatmap
          monthName={data?.monthName ?? "Mes actual"}
          monthDays={monthDays}
          today={today}
        />

        {/* 4-5 tareas más antiguas que todavía no se han completado */}
        <OldestPendingTasksPanel
          tasks={oldestPendingTasks}
          today={today}
          actions={actions}
        />
      </div>

      {/* ── Fila inferior: Tareas de los últimos 5 días en 5 columnas (una por día) ── */}
      <WeeklyColumnsSection
        weekDays={weekCompletedDays.slice(0, 5)}
        weekTotal={weekTotal}
        actions={actions}
      />
    </div>
  );
}

// ─── Heatmap pequeño del mes ──────────────────────────────────────────────────

const MINI_WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

function MiniMonthHeatmap({
  monthName,
  monthDays,
  today,
}: {
  monthName: string;
  monthDays: AnalyticsDay[];
  today: string;
}) {
  const startPadding = (() => {
    if (monthDays.length === 0) return 0;
    const firstDate = monthDays[0].date;
    const [y, m, d] = firstDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return (dt.getDay() + 6) % 7; // Lunes = 0, Domingo = 6
  })();

  const getHeatmapColor = (count: number, isFuture: boolean) => {
    if (isFuture) return "bg-muted/15 border-border/20 text-muted-foreground/30";
    if (count === 0) return "bg-muted/30 border-border/30 text-muted-foreground/50";
    if (count <= 2)
      return "bg-emerald-500/25 border-emerald-500/35 text-emerald-800 dark:text-emerald-300 font-semibold";
    if (count <= 4)
      return "bg-emerald-500/50 border-emerald-500/60 text-emerald-950 dark:text-emerald-100 font-bold";
    return "bg-emerald-600 border-emerald-700 text-white font-bold shadow-xs";
  };

  return (
    <div className="flex w-full flex-col justify-between rounded-2xl border border-border bg-surface p-4 shadow-xs md:w-[270px] md:shrink-0">
      <div>
        {/* Cabecera compacta */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Calendar className="size-3.5 text-accent" />
            <span>{monthName}</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Heatmap
          </span>
        </div>

        {/* Días de la semana */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground/75">
          {MINI_WEEKDAYS.map((wd, i) => (
            <div key={`${wd}-${i}`} className="py-0.5">
              {wd}
            </div>
          ))}
        </div>

        {/* Celdas pequeñas */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startPadding }).map((_, i) => (
            <div key={`mini-pad-${i}`} className="size-7" aria-hidden />
          ))}

          {monthDays.map((day) => {
            const isToday = day.date === today;
            const isFuture = day.date > today;
            const dayNum = parseInt(day.date.split("-")[2], 10);
            const colorClass = getHeatmapColor(day.count, isFuture);

            return (
              <div
                key={day.date}
                className={cn(
                  "flex size-7 items-center justify-center rounded-md border text-[11px] transition-transform hover:scale-110",
                  colorClass,
                  isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                )}
                title={`${day.date}: ${day.count} ${day.count === 1 ? "tarea completada" : "tareas completadas"}`}
              >
                {dayNum}
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda sutil */}
      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground/80">
        <span>Menos</span>
        <div className="flex items-center gap-1">
          <div className="size-2.5 rounded-xs border border-border/40 bg-muted/30" />
          <div className="size-2.5 rounded-xs border border-emerald-500/35 bg-emerald-500/25" />
          <div className="size-2.5 rounded-xs border border-emerald-500/60 bg-emerald-500/50" />
          <div className="size-2.5 rounded-xs border border-emerald-700 bg-emerald-600" />
        </div>
        <span>Más</span>
      </div>
    </div>
  );
}

// ─── Panel derecho: 4-5 tareas más antiguas sin completar ─────────────────────

function OldestPendingTasksPanel({
  tasks,
  today,
  actions,
}: {
  tasks: Task[];
  today: string;
  actions?: TaskActions;
}) {
  const folders = useFolderList();

  return (
    <div className="flex min-w-0 flex-1 flex-col justify-between rounded-2xl border border-border bg-surface p-4 shadow-xs">
      {/* Cabecera */}
      <div className="mb-2 flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-1.5">
          <Hourglass className="size-3.5 text-warning" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Tareas más antiguas sin completar
          </h3>
        </div>
        <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">
          {tasks.length} pendientes
        </span>
      </div>

      {/* Lista de las 4-5 tareas */}
      {tasks.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-8 text-center text-xs text-muted-foreground">
          🎉 ¡Al día! No tienes tareas pendientes antiguas.
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-around divide-y divide-border/50">
          {tasks.map((task) => {
            const folder = folders.find((f) => f.id === task.folderId);

            return (
              <div
                key={task.id}
                className="group -mx-1.5 flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-muted/30"
              >
                {actions && (
                  <TaskCircle
                    completed={task.isCompleted}
                    fresh={task.completedOnViewedDay}
                    onToggle={() =>
                      actions.toggleComplete.mutate({
                        id: task.id,
                        completed: task.isCompleted,
                        date: today,
                      })
                    }
                  />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="truncate text-[12px] font-medium text-foreground"
                      title={task.title}
                    >
                      {task.title}
                    </span>
                    {folder && (
                      <span className="hidden shrink-0 items-center gap-1 text-[10px] text-faded sm:flex">
                        <span
                          className={cn("size-1.5 rounded-full", colorDot(folder.color))}
                        />
                        {folder.name}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Asignada para {shortDate(task.scheduledDate)}
                  </p>
                </div>

                <span
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    task.taskAge >= 30
                      ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                      : task.taskAge >= 14
                        ? "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400"
                        : task.taskAge >= 7
                          ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                          : "bg-muted text-muted-foreground",
                  )}
                  title={`Creada hace ${task.taskAge} días`}
                >
                  <Hourglass className="size-2.5" />
                  {task.taskAge > 0 ? staleLabel(task.taskAge) : "Hoy"}
                </span>

                {actions && (
                  <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="iconSm"
                      className="size-6 p-0"
                      title="Asignar para hoy"
                      onClick={() =>
                        actions.update.mutate({
                          id: task.id,
                          input: { scheduledDate: today },
                        })
                      }
                    >
                      <CalendarDays className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      className="size-6 p-0"
                      title="Mandar al archivo"
                      onClick={() => actions.archive.mutate(task.id)}
                    >
                      <Archive className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tareas de la última semana en 7 columnas ─────────────────────────────────

function WeeklyColumnsSection({
  weekDays,
  weekTotal,
  actions,
}: {
  weekDays: AnalyticsCompletedDay[];
  weekTotal: number;
  actions?: TaskActions;
}) {
  const folders = useFolderList();

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between px-1">
        <h2 className="flex items-center gap-1.5 text-[14px] font-semibold tracking-tight text-foreground">
          <CheckCircle2 className="size-4 text-emerald-500" />
          Tareas completadas en los últimos 5 días
        </h2>
        <span className="text-xs font-medium text-muted-foreground">
          {weekTotal} {weekTotal === 1 ? "tarea en total" : "tareas en total"}
        </span>
      </div>

      {/* Contenedor de 5 columnas */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 md:grid md:grid-cols-5 md:gap-2.5">
        {weekDays.map((dayGroup) => {
          const { title, subtitle } = columnDateLabel(dayGroup.date);
          const hasTasks = dayGroup.tasks.length > 0;

          return (
            <div
              key={dayGroup.date}
              className="flex min-w-[130px] flex-1 flex-col rounded-xl border border-border bg-surface p-2 shadow-2xs md:min-w-0"
            >
              {/* Encabezado de la columna */}
              <div className="mb-2 flex items-center justify-between border-b border-border/60 pb-1.5">
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-bold leading-tight text-foreground">
                    {title}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{subtitle}</p>
                </div>
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums",
                    hasTasks
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-muted text-muted-foreground/60",
                  )}
                >
                  {dayGroup.tasks.length}
                </span>
              </div>

              {/* Lista vertical de tareas en esta columna */}
              <div className="flex flex-1 flex-col space-y-1.5 overflow-y-auto max-h-[260px] pr-0.5">
                {!hasTasks ? (
                  <div className="flex flex-1 items-center justify-center py-6 text-xs text-muted-foreground/40">
                    —
                  </div>
                ) : (
                  dayGroup.tasks.map((task) => (
                    <WeeklyTaskItem
                      key={task.id}
                      task={task}
                      folders={folders}
                      actions={actions}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeeklyTaskItem({
  task,
  folders,
  actions,
}: {
  task: AnalyticsCompletedTask;
  folders: ReturnType<typeof useFolderList>;
  actions?: TaskActions;
}) {
  const folder = folders.find((f) => f.id === task.folderId);

  return (
    <div
      className="group relative flex flex-col rounded-lg border border-border/60 bg-muted/20 p-1.5 transition-colors hover:bg-muted/40"
      title={task.title}
    >
      <div className="flex items-start gap-1.5">
        {actions ? (
          <button
            type="button"
            onClick={() =>
              actions.toggleComplete.mutate({
                id: task.id,
                completed: true,
                date: task.completedOn,
              })
            }
            className="mt-0.5 shrink-0 text-emerald-600 transition-colors hover:text-emerald-700"
            title="Desmarcar"
          >
            <CheckCircle2 className="size-3.5 fill-emerald-100 dark:fill-emerald-950/60" />
          </button>
        ) : (
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
        )}

        <span className="line-clamp-2 text-[11px] font-medium leading-snug text-foreground">
          {task.title}
        </span>
      </div>

      {folder && (
        <div className="mt-1 flex items-center gap-1 pl-5 text-[9px] text-faded">
          <span className={cn("size-1.5 shrink-0 rounded-full", colorDot(folder.color))} />
          <span className="truncate">{folder.name}</span>
        </div>
      )}
    </div>
  );
}
