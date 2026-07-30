import { Archive, Trash2, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { TaskActions } from "@/hooks/useTasks";
import type { Task } from "@/lib/api";
import { inlineDate, todayIso } from "@/lib/dates";
import { PRIORITY_META } from "@/lib/priority";
import { cn } from "@/lib/utils";

interface ArchivePanelProps {
  tasks: Task[] | undefined;
  isLoading: boolean;
  actions: TaskActions;
}

export function ArchivePanel({ tasks, isLoading, actions }: ArchivePanelProps) {
  if (isLoading && !tasks) {
    return <p className="px-2 py-8 text-sm text-muted-foreground">Cargando…</p>;
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="px-2 py-12 text-center">
        <Archive className="mx-auto mb-3 size-6 text-faded" />
        <p className="text-sm text-muted-foreground">El archivo está vacío.</p>
        <p className="text-[13px] text-faded">
          Lo que mandes aquí deja de arrastrarse día tras día, pero no se pierde.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-1">
      {tasks.map((task) => (
        <ArchivedRow key={task.id} task={task} actions={actions} />
      ))}
    </ul>
  );
}

function ArchivedRow({
  task,
  actions,
  depth = 0,
}: {
  task: Task;
  actions: TaskActions;
  depth?: number;
}) {
  return (
    <li className={cn(depth > 0 && "ml-[11px] border-l border-border pl-4")}>
      <div className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/60">
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            task.priority > 0 ? PRIORITY_META[task.priority].dot : "bg-border",
          )}
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-[15px]",
              task.isCompleted ? "text-faded line-through" : "text-muted-foreground",
            )}
          >
            {task.title}
          </p>
          {depth === 0 && (
            <p className="text-[11px] text-faded">
              Estaba en el {inlineDate(task.scheduledDate)}
            </p>
          )}
        </div>

        {depth === 0 && (
          <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <Button
              variant="ghost"
              size="iconSm"
              title="Devolver a hoy"
              onClick={() => actions.unarchive.mutate({ id: task.id, date: todayIso() })}
            >
              <Undo2 className="size-4" />
            </Button>
            <Button
              variant="danger"
              size="iconSm"
              title="Eliminar definitivamente"
              onClick={() => actions.remove.mutate(task.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {task.children.length > 0 && (
        <ul>
          {task.children.map((child) => (
            <ArchivedRow
              key={child.id}
              task={child}
              actions={actions}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
