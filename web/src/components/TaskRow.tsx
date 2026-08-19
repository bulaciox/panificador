import { useState } from "react";
import {
  Archive,
  CalendarDays,
  ChevronRight,
  CornerDownRight,
  EyeOff,
  Flag,
  FolderIcon,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { TaskCircle } from "@/components/TaskCircle";
import { PlanMenuSub, PlanPill } from "@/components/PlanMenu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckIcon,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TaskActions } from "@/hooks/useTasks";
import type { PriorityValue, Task } from "@/lib/api";
import { carriedLabel, shiftIso, shortDate, todayIso } from "@/lib/dates";
import { colorDot, useFolderList } from "@/lib/folders";
import { PRIORITY_META, PRIORITY_ORDER } from "@/lib/priority";
import { cn } from "@/lib/utils";
import { InlineComposer } from "@/components/InlineComposer";

interface TaskRowProps {
  task: Task;
  viewedDate: string;
  actions: TaskActions;
  sortByPriority: boolean;
  /** Muestra el día de la tarea: útil en Futuras y dentro de una carpeta. */
  showDate?: boolean;
  /** "Que desaparezca por hoy" solo tiene sentido en la vista de un día. */
  canHide?: boolean;
  /** Dentro de una carpeta sobra repetir a qué carpeta pertenece cada tarea. */
  showFolder?: boolean;
  depth?: number;
}

export function TaskRow({
  task,
  viewedDate,
  actions,
  sortByPriority,
  showDate = false,
  canHide = true,
  showFolder = true,
  depth = 0,
}: TaskRowProps) {
  const folders = useFolderList();
  const folder = folders.find((item) => item.id === task.folderId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [expanded, setExpanded] = useState(true);
  const [addingChild, setAddingChild] = useState(false);

  const priority = PRIORITY_META[task.priority];
  const done = task.isCompleted;
  const fresh = task.completedOnViewedDay;

  const children = sortByPriority
    ? [...task.children].sort((a, b) => b.priority - a.priority)
    : task.children;
  const doneChildren = children.filter((c) => c.isCompleted).length;

  const moveTo = (date: string) =>
    actions.update.mutate({ id: task.id, input: { scheduledDate: date } });

  const setPriority = (value: PriorityValue) =>
    actions.update.mutate({ id: task.id, input: { priority: value } });

  const saveTitle = () => {
    const title = draft.trim();
    setEditing(false);
    if (!title || title === task.title) {
      setDraft(task.title);
      return;
    }
    actions.update.mutate({ id: task.id, input: { title } });
  };

  // Arrastrable hacia la agenda solo si es raíz, pendiente y sin hora.
  const draggable = depth === 0 && !done && !task.plannedStart;

  return (
    <li className={cn(depth > 0 && "ml-[11px] border-l border-border pl-4")}>
      <div
        draggable={draggable}
        onDragStart={draggable ? (e) => {
          e.dataTransfer.setData("text/task-id", task.id);
          e.dataTransfer.effectAllowed = "copy";
        } : undefined}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-2 py-[7px] transition-colors hover:bg-muted/60",
          draggable && "cursor-grab active:cursor-grabbing",
        )}
      >
        <TaskCircle
          completed={done}
          fresh={fresh}
          small={depth > 0}
          onToggle={() =>
            actions.toggleComplete.mutate({ id: task.id, completed: done })
          }
        />

        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={saveTitle}
            onKeyDown={(event) => {
              if (event.key === "Enter") saveTitle();
              if (event.key === "Escape") {
                setDraft(task.title);
                setEditing(false);
              }
            }}
            className="min-w-0 flex-1 border-b border-accent bg-transparent pb-px text-[15px] outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={cn(
              "min-w-0 flex-1 truncate text-left text-[15px] transition-colors",
              !done && "text-foreground",
              // Hecha hoy: se apaga un poco pero sigue legible.
              done && fresh && "text-muted-foreground",
              // Hecha otro día: tachada y aún más tenue.
              done && !fresh && "text-faded line-through",
            )}
            title={task.title}
          >
            {task.title}
          </button>
        )}

        {/* Viene arrastrada de días anteriores */}
        {task.carriedOver && !done && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-carry-soft px-2 py-0.5 text-[11px] font-medium text-carry">
            <RotateCcw className="size-3" />
            {carriedLabel(task.daysCarried)}
          </span>
        )}

        {/* Hora planificada: pulsable para asignar o cambiar directamente.
            Si ya tiene hora se ve siempre; si no, aparece un chip tenue al pasar el cursor. */}
        {depth === 0 && (task.plannedStart || !done) && (
          <PlanPill
            className={task.plannedStart ? "" : "opacity-0 group-hover:opacity-100"}
            currentStart={task.plannedStart}
            currentMinutes={task.plannedMinutes}
            onPlan={(startTime, durationMinutes) =>
              actions.plan.mutate({ id: task.id, startTime, durationMinutes, date: viewedDate })
            }
            onUnplan={() => actions.unplan.mutate(task.id)}
          />
        )}

        {showDate && !task.carriedOver && (
          <span className="shrink-0 text-[11px] text-faded">
            {shortDate(task.scheduledDate)}
          </span>
        )}

        {/* En Hoy y en Futuras se ve de qué carpeta viene cada tarea.
            En pantallas estrechas se oculta: el título manda. */}
        {folder && showFolder && depth === 0 && (
          <span
            className="hidden shrink-0 items-center gap-1 text-[11px] text-faded sm:flex"
            title={folder.name}
          >
            <span className={cn("size-2 rounded-full", colorDot(folder.color))} />
            {folder.name}
          </span>
        )}

        {children.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="flex shrink-0 items-center gap-0.5 rounded px-1 text-[11px] tabular-nums text-muted-foreground hover:text-foreground"
          >
            <ChevronRight
              className={cn("size-3 transition-transform", expanded && "rotate-90")}
            />
            {doneChildren}/{children.length}
          </button>
        )}

        {task.priority > 0 && (
          <Flag
            className={cn("size-3.5 shrink-0", priority.text)}
            aria-label={priority.label}
          />
        )}

        {/* Sin ratón no hay hover: en móvil las acciones se ven siempre. */}
        <div className="flex shrink-0 items-center transition-opacity focus-within:opacity-100 md:opacity-0 md:group-hover:opacity-100">
          {depth < 2 && (
            <Button
              variant="ghost"
              size="iconSm"
              className="hidden md:inline-flex"
              title="Añadir subtarea"
              onClick={() => {
                setExpanded(true);
                setAddingChild(true);
              }}
            >
              <Plus className="size-4" />
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="iconSm" title="Más opciones">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {depth < 2 && (
                <DropdownMenuItem
                  onSelect={() => {
                    setExpanded(true);
                    setAddingChild(true);
                  }}
                >
                  <CornerDownRight />
                  Añadir subtarea
                </DropdownMenuItem>
              )}

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Flag />
                  Prioridad
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {PRIORITY_ORDER.map((value) => (
                    <DropdownMenuItem
                      key={value}
                      onSelect={() => setPriority(value)}
                    >
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          PRIORITY_META[value].dot,
                        )}
                      />
                      {PRIORITY_META[value].short}
                      <DropdownMenuCheckIcon checked={task.priority === value} />
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <CalendarDays />
                  Mover a
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onSelect={() => moveTo(todayIso())}>
                    Hoy
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => moveTo(shiftIso(todayIso(), 1))}>
                    Mañana
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => moveTo(shiftIso(todayIso(), 2))}>
                    Pasado mañana
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => moveTo(shiftIso(todayIso(), 7))}>
                    Dentro de una semana
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div className="px-2.5 py-1.5">
                    <span className="mb-1 block text-xs text-muted-foreground">
                      Otro día
                    </span>
                    <input
                      type="date"
                      defaultValue={task.scheduledDate}
                      onChange={(event) =>
                        event.target.value && moveTo(event.target.value)
                      }
                      className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-accent"
                    />
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FolderIcon />
                  Carpeta
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onSelect={() =>
                      actions.setFolder.mutate({ id: task.id, folderId: null })
                    }
                  >
                    <span className="size-2 rounded-full bg-faded" />
                    Sin carpeta
                    <DropdownMenuCheckIcon checked={!task.folderId} />
                  </DropdownMenuItem>
                  {folders.map((item) => (
                    <DropdownMenuItem
                      key={item.id}
                      onSelect={() =>
                        actions.setFolder.mutate({ id: task.id, folderId: item.id })
                      }
                    >
                      <span className={cn("size-2 rounded-full", colorDot(item.color))} />
                      {item.name}
                      <DropdownMenuCheckIcon checked={task.folderId === item.id} />
                    </DropdownMenuItem>
                  ))}
                  {folders.length === 0 && (
                    <p className="px-2.5 py-1.5 text-xs text-faded">
                      Aún no hay carpetas
                    </p>
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              {/* Planificar: solo en tareas raíz, no en subtareas */}
              {depth === 0 && (
                <PlanMenuSub
                  currentStart={task.plannedStart}
                  currentMinutes={task.plannedMinutes}
                  onPlan={(startTime, durationMinutes) =>
                    actions.plan.mutate({ id: task.id, startTime, durationMinutes, date: viewedDate })
                  }
                  onUnplan={() => actions.unplan.mutate(task.id)}
                />
              )}

              <DropdownMenuSeparator />

              {!done && canHide && (
                <DropdownMenuItem
                  onSelect={() => actions.hide.mutate({ id: task.id, date: viewedDate })}
                >
                  <EyeOff />
                  Que desaparezca por hoy
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => actions.archive.mutate(task.id)}>
                <Archive />
                Mandar al archivo
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="danger"
                onSelect={() => actions.remove.mutate(task.id)}
              >
                <Trash2 />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {expanded && (children.length > 0 || addingChild) && (
        <ul className="mt-0.5">
          {children.map((child) => (
            <TaskRow
              key={child.id}
              task={child}
              viewedDate={viewedDate}
              actions={actions}
              sortByPriority={sortByPriority}
              canHide={canHide}
              showFolder={false}
              depth={depth + 1}
            />
          ))}
          {addingChild && (
            <li className="ml-[11px] border-l border-border pl-4">
              <InlineComposer
                placeholder="Nueva subtarea…"
                onCancel={() => setAddingChild(false)}
                onSubmit={(title) =>
                  actions.create.mutate({
                    title,
                    parentId: task.id,
                    scheduledDate: task.scheduledDate,
                  })
                }
              />
            </li>
          )}
        </ul>
      )}
    </li>
  );
}
