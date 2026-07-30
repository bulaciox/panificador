import { useState } from "react";
import { EyeOff, Undo2 } from "lucide-react";

import { TaskRow } from "@/components/TaskRow";
import { Button } from "@/components/ui/button";
import type { TaskActions } from "@/hooks/useTasks";
import type { Day, Task } from "@/lib/api";

interface DayViewProps {
  day: Day | undefined;
  hidden: Task[] | undefined;
  isLoading: boolean;
  actions: TaskActions;
  sortByPriority: boolean;
}

export function DayView({
  day,
  hidden,
  isLoading,
  actions,
  sortByPriority,
}: DayViewProps) {
  if (isLoading && !day) {
    return <p className="px-2 py-8 text-sm text-muted-foreground">Cargando…</p>;
  }

  const tasks = day?.tasks ?? [];
  const sort = (list: Task[]) =>
    sortByPriority ? [...list].sort((a, b) => b.priority - a.priority) : list;

  const scheduled = sort(tasks.filter((t) => !t.isCompleted && !t.carriedOver));
  const carried = sort(tasks.filter((t) => !t.isCompleted && t.carriedOver));
  const completed = sort(tasks.filter((t) => t.isCompleted));

  return (
    <div className="space-y-5">
      {tasks.length === 0 && (
        <p className="px-2 py-10 text-center text-sm text-muted-foreground">
          Nada por aquí. Día limpio.
        </p>
      )}

      <Section
        tasks={scheduled}
        actions={actions}
        sortByPriority={sortByPriority}
        day={day}
      />

      {carried.length > 0 && (
        <Section
          label="De días anteriores"
          hint="Siguen pendientes; archívalas u ocúltalas por hoy si no tocan."
          tasks={carried}
          actions={actions}
          sortByPriority={sortByPriority}
          day={day}
        />
      )}

      {completed.length > 0 && (
        <Section
          label={`Hechas · ${completed.length}`}
          tasks={completed}
          actions={actions}
          sortByPriority={sortByPriority}
          day={day}
        />
      )}

      <HiddenSection tasks={hidden ?? []} actions={actions} />
    </div>
  );
}

interface SectionProps {
  label?: string;
  hint?: string;
  tasks: Task[];
  actions: TaskActions;
  sortByPriority: boolean;
  day: Day | undefined;
}

function Section({ label, hint, tasks, actions, sortByPriority, day }: SectionProps) {
  if (tasks.length === 0) return null;

  return (
    <section>
      {label && (
        <div className="mb-1 px-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </h2>
          {hint && <p className="text-[11px] text-faded">{hint}</p>}
        </div>
      )}
      <ul>
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            viewedDate={day?.date ?? task.scheduledDate}
            actions={actions}
            sortByPriority={sortByPriority}
          />
        ))}
      </ul>
    </section>
  );
}

/** Las que se mandaron a desaparecer por hoy: siguen ahí si te arrepientes. */
function HiddenSection({ tasks, actions }: { tasks: Task[]; actions: TaskActions }) {
  const [open, setOpen] = useState(false);

  if (tasks.length === 0) return null;

  return (
    <section className="border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 px-2 text-[12px] text-muted-foreground hover:text-foreground"
      >
        <EyeOff className="size-3.5" />
        {tasks.length === 1
          ? "1 tarea oculta por hoy"
          : `${tasks.length} tareas ocultas por hoy`}
        <span className="text-faded">{open ? "ocultar" : "ver"}</span>
      </button>

      {open && (
        <ul className="mt-1">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/60"
            >
              <span className="size-[18px] shrink-0 rounded-full border-2 border-dashed border-border" />
              <span className="min-w-0 flex-1 truncate text-[14px] text-faded">
                {task.title}
              </span>
              <Button
                variant="ghost"
                size="iconSm"
                title="Devolver a este día"
                onClick={() => actions.unhide.mutate(task.id)}
              >
                <Undo2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
