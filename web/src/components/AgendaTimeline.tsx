/**
 * Raíl de tiempo de la agenda diaria.
 * Muestra bloques posicionados en absoluto, con los huecos comprimidos.
 * Dos bloques solapados se pintan en columnas adyacentes.
 */
import { useMemo } from "react";

import { TaskCircle } from "@/components/TaskCircle";
import type { TaskActions } from "@/hooks/useTasks";
import type { Task } from "@/lib/api";
import {
  assignColumns,
  blockLabel,
  buildScale,
  formatTime,
  gapLabel,
  nowMinute,
  parseTime,
} from "@/lib/agenda";
import { habitColor } from "@/lib/habits";
import { useFolderList } from "@/lib/folders";
import { cn } from "@/lib/utils";

const RAIL_WIDTH = 44; // px reservados para las etiquetas de hora
const CONTENT_GAP = 10; // px de separación entre la línea vertical y los bloques

interface AgendaTimelineProps {
  tasks: Task[];
  viewedDate: string;
  today: string;
  actions: TaskActions;
}

export function AgendaTimeline({
  tasks,
  viewedDate,
  today,
  actions,
}: AgendaTimelineProps) {
  const folders = useFolderList();
  const isToday = viewedDate === today;

  // Solo las tareas raíz con hora planificada. Las subtareas no se muestran en el raíl.
  // Usamos != null (débil) para descartar tanto null como undefined (datos cacheados sin el campo).
  const planned = tasks.filter((t) => t.parentId === null && t.plannedStart != null);

  const rawBlocks = planned.map((t) => ({
    id: t.id,
    title: t.title,
    folderId: t.folderId,
    startMinute: parseTime(t.plannedStart!),
    endMinute: parseTime(t.plannedStart!) + (t.plannedMinutes ?? 30),
    isCompleted: t.isCompleted,
    completedOnViewedDay: t.completedOnViewedDay,
  }));

  const blocks = useMemo(() => assignColumns(rawBlocks), [JSON.stringify(rawBlocks)]); // eslint-disable-line react-hooks/exhaustive-deps
  const scale = useMemo(() => buildScale(blocks), [JSON.stringify(blocks)]); // eslint-disable-line react-hooks/exhaustive-deps

  const now = isToday ? nowMinute() : null;

  // Etiquetas de hora del raíl: cada 30 minutos, pero descartando las que
  // caerían demasiado juntas (p. ej. dentro de un hueco largo comprimido).
  const railLabels = useMemo(() => {
    const MIN_LABEL_GAP_PX = 16;
    const labels: number[] = [];
    const first = Math.ceil(scale.windowStart / 30) * 30;
    let lastY = -Infinity;
    for (let m = first; m <= scale.windowEnd; m += 30) {
      const y = scale.y(m);
      if (y - lastY >= MIN_LABEL_GAP_PX) {
        labels.push(m);
        lastY = y;
      }
    }
    return labels;
  }, [scale]);

  if (planned.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">Aún no hay bloques planificados.</p>
        <p className="mt-1 text-[13px] text-faded">
          Usa{" "}
          <span className="font-medium text-foreground">⋯ → Planificar…</span> en
          cualquier tarea de la lista.
        </p>
      </div>
    );
  }

  return (
    <div className="relative" style={{ height: scale.totalHeight }}>
      {/* ── Etiquetas de hora ───────────────────────────────────────── */}
      {railLabels.map((m) => (
        <div
          key={m}
          className="absolute left-0 z-10 flex items-center"
          style={{ top: scale.y(m) - 7, width: RAIL_WIDTH - 4 }}
        >
          <span className="w-full text-right text-[11px] tabular-nums text-muted-foreground">
            {formatTime(m)}
          </span>
        </div>
      ))}

      {/* ── Línea guía vertical ────────────────────────────────────── */}
      <div
        className="absolute top-0 w-px bg-border"
        style={{ left: RAIL_WIDTH - 1, height: scale.totalHeight }}
      />

      {/* ── Capa de contenido (a la derecha del raíl, con margen) ──── */}
      <div
        className="absolute top-0 bottom-0"
        style={{ left: RAIL_WIDTH + CONTENT_GAP, right: 0 }}
      >
        {/* Huecos entre bloques: solo informan del tiempo libre */}
        {scale.gaps.map((gap) => {
          const gapMinutes = gap.endMinute - gap.startMinute;
          const topPx = scale.y(gap.startMinute);
          const heightPx = scale.y(gap.endMinute) - topPx;
          const label = gapLabel(gapMinutes);
          return (
            <div
              key={`gap-${gap.startMinute}`}
              className="absolute left-0 right-0 flex items-center pl-2"
              style={{ top: topPx, height: heightPx }}
            >
              {label && (
                <span className="text-[12px] text-faded">{label}</span>
              )}
            </div>
          );
        })}

        {/* Línea de ahora */}
        {now !== null && now >= scale.windowStart && now <= scale.windowEnd && (
          <div
            className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
            style={{ top: scale.y(now) - 5 }}
          >
            <div className="-ml-1 size-2.5 shrink-0 rounded-full bg-accent" />
            <div className="h-px flex-1 bg-accent" />
          </div>
        )}

        {/* Bloques */}
        {blocks.map((block) => {
          const task = tasks.find((t) => t.id === block.id);
          if (!task) return null;

          const topPx = scale.y(block.startMinute);
          const heightPx = Math.max(32, scale.y(block.endMinute) - topPx - 2);
          const folder = folders.find((f) => f.id === block.folderId);

          // Ancho: los bloques de un grupo comparten el ancho disponible.
          // Un pequeño canalón entre columnas para que no se toquen.
          const gutter = block.cols > 1 ? 4 : 0;
          const colWidthPct = 100 / block.cols;
          const leftPct = block.col * colWidthPct;

          // Color del bloque: tomar el de la carpeta si existe, si no gris.
          const colorName = folder?.color;
          const alpha = block.isCompleted ? 0.25 : 0.18;
          const c = colorName ? habitColor(colorName) : null;
          const bgStyle = c
            ? {
                backgroundColor: `rgba(${c.rgb[0]},${c.rgb[1]},${c.rgb[2]},${alpha})`,
                borderColor: `rgba(${c.rgb[0]},${c.rgb[1]},${c.rgb[2]},0.4)`,
              }
            : {};

          const minutes = block.endMinute - block.startMinute;
          const compact = heightPx < 46;

          return (
            <div
              key={block.id}
              className={cn(
                "absolute overflow-hidden rounded-lg border border-border px-2 py-1 transition-opacity",
                !colorName && "border-border bg-muted",
                block.isCompleted && "opacity-60",
              )}
              style={{
                top: topPx,
                height: heightPx,
                left: `calc(${leftPct}% + ${gutter / 2}px)`,
                width: `calc(${colWidthPct}% - ${gutter}px)`,
                ...bgStyle,
              }}
            >
              <div className="flex h-full items-start gap-1.5">
                <div className="min-w-0 flex-1 overflow-hidden">
                  {!compact && (
                    <p className="truncate text-[10px] tabular-nums text-muted-foreground">
                      {blockLabel(task.plannedStart!, minutes)}
                    </p>
                  )}
                  <p
                    className={cn(
                      "truncate text-[13px] font-medium leading-tight",
                      block.isCompleted && "line-through",
                      compact && "mt-0.5",
                    )}
                  >
                    {task.title}
                  </p>
                </div>
                <div className="mt-0.5 shrink-0">
                  <TaskCircle
                    completed={block.isCompleted}
                    fresh={block.completedOnViewedDay}
                    small
                    onToggle={() =>
                      actions.toggleComplete.mutate({
                        id: block.id,
                        completed: block.isCompleted,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
