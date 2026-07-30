import { TaskRow } from "@/components/TaskRow";
import type { TaskActions } from "@/hooks/useTasks";
import type { Task } from "@/lib/api";
import { todayIso } from "@/lib/dates";

interface FolderViewProps {
  tasks: Task[] | undefined;
  isLoading: boolean;
  actions: TaskActions;
  sortByPriority: boolean;
}

/** Todo lo de una carpeta, sin importar el día al que esté asignado. */
export function FolderView({
  tasks,
  isLoading,
  actions,
  sortByPriority,
}: FolderViewProps) {
  if (isLoading && !tasks) {
    return <p className="px-2 py-8 text-sm text-muted-foreground">Cargando…</p>;
  }

  const list = tasks ?? [];

  if (list.length === 0) {
    return (
      <p className="px-2 py-12 text-center text-sm text-muted-foreground">
        La carpeta está vacía. Añade una tarea arriba.
      </p>
    );
  }

  const sort = (items: Task[]) =>
    sortByPriority ? [...items].sort((a, b) => b.priority - a.priority) : items;

  const pending = sort(list.filter((task) => !task.isCompleted));
  const completed = sort(list.filter((task) => task.isCompleted));

  return (
    <div className="space-y-5">
      <ul>
        {pending.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            viewedDate={todayIso()}
            actions={actions}
            sortByPriority={sortByPriority}
            showDate
            showFolder={false}
            canHide={false}
          />
        ))}
      </ul>

      {completed.length > 0 && (
        <section>
          <h2 className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Hechas · {completed.length}
          </h2>
          <ul>
            {completed.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                viewedDate={todayIso()}
                actions={actions}
                sortByPriority={sortByPriority}
                showDate
                showFolder={false}
                canHide={false}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
