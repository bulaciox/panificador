import { useMemo, useState } from "react";
import {
  Archive,
  Clock,
  Compass,
  Hourglass,
  Lightbulb,
  Search,
  Sparkles,
  Target,
  X,
  Zap,
} from "lucide-react";

import { TaskCircle } from "@/components/TaskCircle";
import { Button } from "@/components/ui/button";
import type { TaskActions } from "@/hooks/useTasks";
import type { Task } from "@/lib/api";
import { shortDate, staleLabel } from "@/lib/dates";
import { colorDot, useFolderList } from "@/lib/folders";
import { cn } from "@/lib/utils";

interface StaleTasksViewProps {
  tasks: Task[] | undefined;
  isLoading: boolean;
  today: string;
  actions: TaskActions;
}

type FilterLevel = "all" | "critical" | "stale" | "aging";
type SortOption = "oldest" | "newest" | "priority";

export function StaleTasksView({
  tasks,
  isLoading,
  today,
  actions,
}: StaleTasksViewProps) {
  const [filter, setFilter] = useState<FilterLevel>("all");
  const [sort, setSort] = useState<SortOption>("oldest");
  const [search, setSearch] = useState("");
  const [refocusingTask, setRefocusingTask] = useState<Task | null>(null);
  const [bannerOpen, setBannerOpen] = useState(true);

  const allTasks = tasks ?? [];

  // Contadores por nivel de antigüedad
  const counts = useMemo(() => {
    return {
      all: allTasks.length,
      critical: allTasks.filter((t) => t.taskAge >= 30).length,
      stale: allTasks.filter((t) => t.taskAge >= 14 && t.taskAge < 30).length,
      aging: allTasks.filter((t) => t.taskAge >= 7 && t.taskAge < 14).length,
    };
  }, [allTasks]);

  // Filtrado y ordenación
  const filteredTasks = useMemo(() => {
    let list = [...allTasks];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q));
    }

    if (filter === "critical") list = list.filter((t) => t.taskAge >= 30);
    else if (filter === "stale") list = list.filter((t) => t.taskAge >= 14 && t.taskAge < 30);
    else if (filter === "aging") list = list.filter((t) => t.taskAge >= 7 && t.taskAge < 14);

    if (sort === "oldest") list.sort((a, b) => b.taskAge - a.taskAge);
    else if (sort === "newest") list.sort((a, b) => a.taskAge - b.taskAge);
    else if (sort === "priority") list.sort((a, b) => b.priority - a.priority);

    return list;
  }, [allTasks, filter, sort, search]);

  const oldestAge = allTasks.length > 0 ? Math.max(...allTasks.map((t) => t.taskAge)) : 0;

  if (isLoading && !tasks) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Cargando tareas por antigüedad…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Banner reflexivo anti-perfeccionismo ── */}
      {bannerOpen && (
        <div className="relative overflow-hidden rounded-2xl border border-accent/20 bg-accent-soft/40 p-4 sm:p-5 shadow-xs transition-all">
          <button
            type="button"
            onClick={() => setBannerOpen(false)}
            className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            title="Cerrar consejo"
          >
            <X className="size-4" />
          </button>

          <div className="flex items-start gap-3.5 pr-6">
            <div className="rounded-xl bg-accent/15 p-2 text-accent">
              <Lightbulb className="size-5" />
            </div>
            <div className="space-y-1.5 text-xs text-foreground/90">
              <h3 className="text-[13px] font-bold tracking-tight text-foreground">
                El antídoto contra la parálisis por análisis: Bajar el listón
              </h3>
              <p className="leading-relaxed text-muted-foreground">
                Si una tarea lleva semanas creada y no la terminas, casi siempre se debe a que tu
                mente la concibe como un proyecto grande o que exige un resultado impecable.{" "}
                <strong className="text-foreground font-semibold">Hecho es mejor que perfecto.</strong>
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-medium text-accent">
                <span className="flex items-center gap-1">
                  <Zap className="size-3.5" /> 1. Empieza con un micro-paso de 2 minutos
                </span>
                <span className="flex items-center gap-1">
                  <Target className="size-3.5" /> 2. Haz primero un "borrador feo"
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" /> 3. Comprométete a solo 15 min hoy
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Resumen de métricas ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricStripItem
          icon={<Hourglass className="size-4 text-muted-foreground" />}
          label="TOTAL ACUMULADAS"
          value={allTasks.length}
          sub="tareas pendientes"
        />
        <MetricStripItem
          icon={<Clock className="size-4 text-muted-foreground" />}
          label="MÁS ANTIGUA"
          value={oldestAge > 0 ? `${oldestAge}d` : "0d"}
          sub={oldestAge > 0 ? `creada hace ${staleLabel(oldestAge)}` : "al día"}
        />
        <MetricStripItem
          icon={<Zap className="size-4 text-amber-500" />}
          label="ESTANCADAS (+14D)"
          value={counts.stale + counts.critical}
          sub="bloqueadas por tiempo"
          highlight={counts.stale + counts.critical > 0}
        />
        <MetricStripItem
          icon={<Sparkles className="size-4 text-accent" />}
          label="CRÍTICAS (+30D)"
          value={counts.critical}
          sub="máxima prioridad de reenfoque"
          highlight={counts.critical > 0}
        />
      </div>

      {/* ── Filtros, ordenación y buscador ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3">
        {/* Píldoras de filtro */}
        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant={filter === "all" ? "subtle" : "ghost"}
            size="sm"
            onClick={() => setFilter("all")}
            className="text-xs"
          >
            Todas ({counts.all})
          </Button>
          <Button
            variant={filter === "critical" ? "subtle" : "ghost"}
            size="sm"
            onClick={() => setFilter("critical")}
            className="text-xs text-red-600 dark:text-red-400"
          >
            +30 días ({counts.critical})
          </Button>
          <Button
            variant={filter === "stale" ? "subtle" : "ghost"}
            size="sm"
            onClick={() => setFilter("stale")}
            className="text-xs text-orange-600 dark:text-orange-400"
          >
            14-29 días ({counts.stale})
          </Button>
          <Button
            variant={filter === "aging" ? "subtle" : "ghost"}
            size="sm"
            onClick={() => setFilter("aging")}
            className="text-xs text-amber-600 dark:text-amber-400"
          >
            7-13 días ({counts.aging})
          </Button>
        </div>

        {/* Buscador y orden */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar tarea…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface py-1 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-foreground focus:border-accent focus:outline-none"
            title="Ordenar por"
          >
            <option value="oldest">Más antigua primero</option>
            <option value="newest">Más reciente primero</option>
            <option value="priority">Por prioridad</option>
          </select>
        </div>
      </div>

      {/* ── Lista de tareas estancadas con herramientas de reenfoque ── */}
      {filteredTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-3xl">🎉</p>
          <h4 className="mt-2 text-sm font-semibold text-foreground">
            {allTasks.length === 0
              ? "¡Estás al día!"
              : "No hay tareas con los filtros seleccionados"}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            {allTasks.length === 0
              ? "No tienes tareas antiguas pendientes de reenfoque."
              : "Prueba a cambiar el filtro para ver otras tareas."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <RefocusTaskCard
              key={task.id}
              task={task}
              today={today}
              actions={actions}
              onOpenRefocusModal={() => setRefocusingTask(task)}
            />
          ))}
        </div>
      )}

      {/* ── Modal de Reenfoque Guiado ── */}
      {refocusingTask && (
        <RefocusWizardModal
          task={refocusingTask}
          today={today}
          actions={actions}
          onClose={() => setRefocusingTask(null)}
        />
      )}
    </div>
  );
}

// ─── Tarjeta individual de tarea con barra de reenfoque ────────────────────────

function RefocusTaskCard({
  task,
  today,
  actions,
  onOpenRefocusModal,
}: {
  task: Task;
  today: string;
  actions: TaskActions;
  onOpenRefocusModal: () => void;
}) {
  const folders = useFolderList();
  const folder = folders.find((f) => f.id === task.folderId);
  const [addingMicroStep, setAddingMicroStep] = useState(false);
  const [microStepTitle, setMicroStepTitle] = useState("");

  const handleAddMicroStep = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!microStepTitle.trim()) return;

    actions.create.mutate(
      {
        title: microStepTitle.trim(),
        parentId: task.id,
        scheduledDate: today,
        folderId: task.folderId,
      },
      {
        onSuccess: () => {
          setMicroStepTitle("");
          setAddingMicroStep(false);
        },
      },
    );
  };

  const handleLowerTheBar = () => {
    const isAlreadyDraft = task.title.toLowerCase().startsWith("borrador");
    const newTitle = isAlreadyDraft
      ? task.title
      : `Borrador rápido de: ${task.title}`;
    const newNote = task.notes
      ? `${task.notes}\n[Enfoque: Versión 1.0 rápida. Hecho > Perfecto.]`
      : "[Enfoque: Versión 1.0 rápida. Hecho > Perfecto.]";

    actions.update.mutate({
      id: task.id,
      input: { title: newTitle, notes: newNote },
    });
  };

  const handleTimebox15 = () => {
    actions.update.mutate(
      { id: task.id, input: { scheduledDate: today } },
      {
        onSuccess: () => {
          actions.plan.mutate({
            id: task.id,
            startTime: "10:00",
            durationMinutes: 15,
            date: today,
          });
        },
      },
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-2xs transition-all hover:border-border/80">
      {/* Cabecera de la tarea */}
      <div className="flex items-start gap-3">
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

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-semibold text-foreground">
              {task.title}
            </span>
            {folder && (
              <span className="flex items-center gap-1 rounded-md bg-muted/50 px-1.5 py-0.5 text-[11px] text-faded">
                <span className={cn("size-2 rounded-full", colorDot(folder.color))} />
                {folder.name}
              </span>
            )}
          </div>

          {task.notes && (
            <p className="mt-1 text-xs text-muted-foreground whitespace-pre-line line-clamp-2">
              {task.notes}
            </p>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span>Asignada para {shortDate(task.scheduledDate)}</span>
            <span>•</span>
            <span
              className={cn(
                "flex items-center gap-1 font-semibold",
                task.taskAge >= 30
                  ? "text-red-600 dark:text-red-400"
                  : task.taskAge >= 14
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-amber-600 dark:text-amber-400",
              )}
            >
              <Hourglass className="size-3" />
              Creada hace {task.taskAge} {task.taskAge === 1 ? "día" : "días"} ({staleLabel(task.taskAge)})
            </span>
          </div>

          {/* Subtareas existentes si las hay */}
          {task.children && task.children.length > 0 && (
            <div className="mt-2.5 space-y-1 rounded-xl bg-muted/20 p-2 border border-border/40">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Pasos intermedios ({task.children.filter((c) => c.isCompleted).length}/{task.children.length}):
              </span>
              <div className="space-y-1">
                {task.children.map((child) => (
                  <div key={child.id} className="flex items-center gap-2 text-xs">
                    <TaskCircle
                      completed={child.isCompleted}
                      fresh={child.completedOnViewedDay}
                      onToggle={() =>
                        actions.toggleComplete.mutate({
                          id: child.id,
                          completed: child.isCompleted,
                          date: today,
                        })
                      }
                    />
                    <span
                      className={cn(
                        "truncate",
                        child.isCompleted ? "line-through text-muted-foreground" : "text-foreground font-medium",
                      )}
                    >
                      {child.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mini formulario para añadir micro-paso */}
          {addingMicroStep && (
            <form onSubmit={handleAddMicroStep} className="mt-3 flex items-center gap-2">
              <input
                type="text"
                autoFocus
                placeholder="Ej: Abrir borrador y escribir 2 líneas…"
                value={microStepTitle}
                onChange={(e) => setMicroStepTitle(e.target.value)}
                className="flex-1 rounded-lg border border-accent bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <Button type="submit" size="sm" variant="subtle" className="text-xs">
                Añadir
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setAddingMicroStep(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
            </form>
          )}

          {/* ── Botonera de Reenfoque Anti-Perfeccionismo ── */}
          <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
            {/* Botón principal del asistente */}
            <Button
              variant="subtle"
              size="sm"
              onClick={onOpenRefocusModal}
              className="gap-1.5 text-xs font-semibold text-accent"
              title="Abrir asistente de reenfoque"
            >
              <Compass className="size-3.5" />
              Reenfocar
            </Button>

            {/* Atajos de 1 clic */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAddingMicroStep((v) => !v)}
              className="gap-1 text-xs text-muted-foreground hover:text-foreground"
              title="Añadir un micro-paso fácil"
            >
              <Zap className="size-3.5 text-amber-500" />
              + Micro-paso (2 min)
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLowerTheBar}
              className="gap-1 text-xs text-muted-foreground hover:text-foreground"
              title="Renombrar a borrador y bajar la exigencia"
            >
              <Target className="size-3.5 text-emerald-500" />
              Bajar el listón (Done &gt; Perfect)
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleTimebox15}
              className="gap-1 text-xs text-muted-foreground hover:text-foreground"
              title="Asignar para hoy y bloquear 15 min"
            >
              <Clock className="size-3.5 text-sky-500" />
              15 min hoy
            </Button>

            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => actions.archive.mutate(task.id)}
                title="Archivar sin culpa"
                className="text-muted-foreground hover:text-foreground"
              >
                <Archive className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal del Asistente de Reenfoque ─────────────────────────────────────────

function RefocusWizardModal({
  task,
  today,
  actions,
  onClose,
}: {
  task: Task;
  today: string;
  actions: TaskActions;
  onClose: () => void;
}) {
  const [selectedStrategy, setSelectedStrategy] = useState<
    "micro" | "lower_bar" | "timebox" | "archive"
  >("micro");
  const [customMicroStep, setCustomMicroStep] = useState("");

  const suggestedMicroSteps = [
    "Escribir solo 2 frases de borrador inicial",
    "Abrir el archivo/enlace y dejarlo en pantalla",
    "Hacer un esquema rápido de 3 viñetas",
    "Enviar un mensaje corto para pedir lo necesario",
  ];

  const handleApplyStrategy = () => {
    if (selectedStrategy === "micro") {
      const step = customMicroStep.trim() || suggestedMicroSteps[0];
      actions.create.mutate(
        {
          title: step,
          parentId: task.id,
          scheduledDate: today,
          folderId: task.folderId,
        },
        {
          onSuccess: () => {
            actions.update.mutate({ id: task.id, input: { scheduledDate: today } });
            onClose();
          },
        },
      );
    } else if (selectedStrategy === "lower_bar") {
      const isAlreadyDraft = task.title.toLowerCase().startsWith("borrador");
      const newTitle = isAlreadyDraft ? task.title : `Borrador feo de: ${task.title}`;
      actions.update.mutate(
        {
          id: task.id,
          input: {
            title: newTitle,
            notes: task.notes
              ? `${task.notes}\n[Objetivo: Versión mínima suficiente. Permitido que sea imperfecta.]`
              : "[Objetivo: Versión mínima suficiente. Permitido que sea imperfecta.]",
          },
        },
        { onSuccess: onClose },
      );
    } else if (selectedStrategy === "timebox") {
      actions.update.mutate(
        { id: task.id, input: { scheduledDate: today } },
        {
          onSuccess: () => {
            actions.plan.mutate({
              id: task.id,
              startTime: "10:00",
              durationMinutes: 15,
              date: today,
            });
            onClose();
          },
        },
      );
    } else if (selectedStrategy === "archive") {
      actions.archive.mutate(task.id, { onSuccess: onClose });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl animate-pop-in">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <div className="mb-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
            <Compass className="size-4" />
            Asistente de Reenfoque
          </div>
          <h2 className="mt-1 text-lg font-bold text-foreground">
            {task.title}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Lleva creada {task.taskAge} días. ¿Qué estrategia anti-perfeccionismo prefieres aplicar?
          </p>
        </div>

        {/* Opciones de estrategia */}
        <div className="space-y-2.5">
          {/* Opción 1: Micro-paso */}
          <div
            onClick={() => setSelectedStrategy("micro")}
            className={cn(
              "cursor-pointer rounded-xl border p-3 transition-all",
              selectedStrategy === "micro"
                ? "border-accent bg-accent-soft/30 ring-1 ring-accent"
                : "border-border hover:bg-muted/30",
            )}
          >
            <div className="flex items-center gap-2.5">
              <Zap className="size-4 text-amber-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground">
                  El primer paso ridículamente pequeño (2 minutos)
                </p>
                <p className="text-[11px] text-muted-foreground">
                  No hagas la tarea entera; haz solo un mini-paso tan fácil que no dé pereza.
                </p>
              </div>
            </div>

            {selectedStrategy === "micro" && (
              <div className="mt-3 pl-6 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Sugerencias rápidas:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedMicroSteps.map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setCustomMicroStep(step)}
                      className={cn(
                        "rounded-md border px-2 py-1 text-[11px] transition-colors",
                        customMicroStep === step
                          ? "border-accent bg-accent text-white"
                          : "border-border bg-background text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {step}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="O escribe tu propio micro-paso…"
                  value={customMicroStep}
                  onChange={(e) => setCustomMicroStep(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Opción 2: Bajar el listón */}
          <div
            onClick={() => setSelectedStrategy("lower_bar")}
            className={cn(
              "cursor-pointer rounded-xl border p-3 transition-all",
              selectedStrategy === "lower_bar"
                ? "border-accent bg-accent-soft/30 ring-1 ring-accent"
                : "border-border hover:bg-muted/30",
            )}
          >
            <div className="flex items-center gap-2.5">
              <Target className="size-4 text-emerald-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground">
                  Bajar el listón: Versión 1.0 imperfecta (Done &gt; Perfect)
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Renombra a "Borrador feo" y date permiso para entregar algo suficiente.
                </p>
              </div>
            </div>
          </div>

          {/* Opción 3: Timebox 15 min */}
          <div
            onClick={() => setSelectedStrategy("timebox")}
            className={cn(
              "cursor-pointer rounded-xl border p-3 transition-all",
              selectedStrategy === "timebox"
                ? "border-accent bg-accent-soft/30 ring-1 ring-accent"
                : "border-border hover:bg-muted/30",
            )}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="size-4 text-sky-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground">
                  Experimento de 15 minutos hoy (Sin juicio)
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Trabaja 15 min con temporizador. Al sonar la campana, tienes permiso 100% para parar.
                </p>
              </div>
            </div>
          </div>

          {/* Opción 4: Archivar sin culpa */}
          <div
            onClick={() => setSelectedStrategy("archive")}
            className={cn(
              "cursor-pointer rounded-xl border p-3 transition-all",
              selectedStrategy === "archive"
                ? "border-accent bg-accent-soft/30 ring-1 ring-accent"
                : "border-border hover:bg-muted/30",
            )}
          >
            <div className="flex items-center gap-2.5">
              <Archive className="size-4 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground">
                  Decisión valiente: Archivar sin culpa
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Si han pasado semanas y no la hiciste, libérate de la culpa mental y archívala.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="mt-5 flex items-center justify-end gap-2 border-t border-border/60 pt-3">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Cancelar
          </Button>
          <Button variant="default" size="sm" onClick={handleApplyStrategy} className="text-xs">
            Aplicar reenfoque
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Tarjeta pequeña de métricas de cabecera ──────────────────────────────────

function MetricStripItem({
  icon,
  label,
  value,
  sub,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 shadow-2xs">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span
          className={cn(
            "text-2xl font-bold tabular-nums leading-none",
            highlight ? "text-accent" : "text-foreground",
          )}
        >
          {value}
        </span>
      </div>
      <p className="mt-0.5 text-[10px] text-muted-foreground truncate">{sub}</p>
    </div>
  );
}
