/**
 * Panel de agenda que se desliza desde la derecha.
 * Responsive: superpuesto en móvil, acoplado como columna en escritorio (lg+).
 */
import { X } from "lucide-react";

import { AgendaTimeline } from "@/components/AgendaTimeline";
import { PlanPill } from "@/components/PlanMenu";
import { Button } from "@/components/ui/button";
import { useElementSize } from "@/hooks/useElementSize";
import type { TaskActions } from "@/hooks/useTasks";
import type { Day, Task } from "@/lib/api";
import { formatTime } from "@/lib/agenda";
import { cn } from "@/lib/utils";

interface AgendaPanelProps {
  open: boolean;
  onClose: () => void;
  day: Day | undefined;
  viewedDate: string;
  today: string;
  actions: TaskActions;
}

export function AgendaPanel({
  open,
  onClose,
  day,
  viewedDate,
  today,
  actions,
}: AgendaPanelProps) {
  const { ref: scrollRef, height: viewportHeight } = useElementSize<HTMLDivElement>();
  const tasks = day?.tasks ?? [];
  const planned = tasks.filter((t) => t.parentId === null && t.plannedStart != null);
  // "Sin hora" solo lista lo asignado a este día; las arrastradas de días
  // anteriores no forman parte del plan de hoy (aunque aparezcan en la lista).
  const unplanned = tasks.filter(
    (t) =>
      t.parentId === null &&
      t.plannedStart == null &&
      !t.isCompleted &&
      !t.carriedOver,
  );

  const totalScheduled = planned.reduce((sum, t) => sum + (t.plannedMinutes ?? 0), 0);
  const summaryParts: string[] = [];
  if (totalScheduled > 0) {
    const h = Math.floor(totalScheduled / 60);
    const m = totalScheduled % 60;
    summaryParts.push(h > 0 ? (m > 0 ? `${h} h ${m} min` : `${h} h`) : `${m} min`);
  }
  if (unplanned.length > 0)
    summaryParts.push(`${unplanned.length} sin hora`);

  return (
    <>
      {/* Fondo oscuro en móvil */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          // Base: panel deslizante desde la derecha.
          "fixed inset-y-0 right-0 z-30 flex w-full max-w-sm flex-col border-l border-border bg-background shadow-xl transition-transform duration-200 sm:w-[380px]",
          // En pantallas lg+ se acopla estáticamente (sticky), sin sombra.
          "lg:sticky lg:top-0 lg:h-screen lg:max-w-[420px] lg:shadow-none lg:transition-none",
          open
            ? "translate-x-0"
            : "translate-x-full lg:hidden",
        )}
      >
        {/* Cabecera */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold">Agenda del día</h2>
            {summaryParts.length > 0 && (
              <p className="text-[12px] text-muted-foreground">
                {summaryParts.join(" · ")}
              </p>
            )}
          </div>
          <Button variant="ghost" size="iconSm" onClick={onClose} title="Cerrar">
            <X className="size-4" />
          </Button>
        </div>

        {/* Contenido: raíl + sin hora */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4">
          {day === undefined ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Cargando…</p>
          ) : (
            <>
              <AgendaTimeline
                tasks={tasks}
                viewedDate={viewedDate}
                today={today}
                actions={actions}
                scrollRef={scrollRef}
                viewportHeight={viewportHeight}
                onDropTask={(taskId, startMinute) =>
                  actions.plan.mutate({
                    id: taskId,
                    startTime: formatTime(startMinute),
                    durationMinutes: 30,
                    date: viewedDate,
                  })
                }
              />

              {unplanned.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Sin hora ({unplanned.length})
                  </h3>
                  <ul className="space-y-1">
                    {unplanned.map((task) => (
                      <UnplannedRow
                        key={task.id}
                        task={task}
                        viewedDate={viewedDate}
                        actions={actions}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function UnplannedRow({
  task,
  viewedDate,
  actions,
}: {
  task: Task;
  viewedDate: string;
  actions: TaskActions;
}) {
  return (
    <li className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60">
      <span className="min-w-0 flex-1 truncate text-[14px]">{task.title}</span>

      <PlanPill
        onPlan={(startTime, durationMinutes) =>
          actions.plan.mutate({ id: task.id, startTime, durationMinutes, date: viewedDate })
        }
      />
    </li>
  );
}
