import { CalendarClock } from "lucide-react";

import { TaskRow } from "@/components/TaskRow";
import type { TaskActions } from "@/hooks/useTasks";
import type { Day, Task } from "@/lib/api";
import { isRelativeLabel, longLabel, subLabel } from "@/lib/dates";

interface UpcomingViewProps {
  days: Day[] | undefined;
  isLoading: boolean;
  actions: TaskActions;
  sortByPriority: boolean;
  onOpenDay: (date: string) => void;
}

/** Lo que hay planificado para más adelante, agrupado por día. */
export function UpcomingView({
  days,
  isLoading,
  actions,
  sortByPriority,
  onOpenDay,
}: UpcomingViewProps) {
  if (isLoading && !days) {
    return <p className="px-2 py-8 text-sm text-muted-foreground">Cargando…</p>;
  }

  if (!days || days.length === 0) {
    return (
      <div className="px-2 py-12 text-center">
        <CalendarClock className="mx-auto mb-3 size-6 text-faded" />
        <p className="text-sm text-muted-foreground">No hay nada planificado más adelante.</p>
        <p className="text-[13px] text-faded">
          Desde cualquier tarea, <span className="whitespace-nowrap">⋯ → Mover a</span>, y
          aparecerá aquí.
        </p>
      </div>
    );
  }

  const sort = (list: Task[]) =>
    sortByPriority ? [...list].sort((a, b) => b.priority - a.priority) : list;

  return (
    <div className="space-y-6">
      {days.map((day) => (
        <section key={day.date}>
          <div className="mb-1 flex items-baseline gap-2 px-2">
            <button
              type="button"
              onClick={() => onOpenDay(day.date)}
              className="text-[13px] font-semibold text-foreground hover:text-accent"
              title="Abrir este día"
            >
              {longLabel(day.date)}
            </button>
            {isRelativeLabel(day.date) && (
              <span className="text-[11px] text-faded">{subLabel(day.date)}</span>
            )}
          </div>
          <ul>
            {sort(day.tasks).map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                viewedDate={day.date}
                actions={actions}
                sortByPriority={sortByPriority}
                canHide={false}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
