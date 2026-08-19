/**
 * Raíl de tiempo de la agenda diaria.
 * En reposo toda la franja cabe en el alto del panel (marcas por hora). Al arrastrar
 * un bloque, la escala se amplía a intervalos de 15 min (con scroll y anclaje) y vuelve
 * a la vista de horas al soltar. Dos bloques solapados se pintan en columnas.
 */
import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";

import { TaskCircle } from "@/components/TaskCircle";
import type { TaskActions } from "@/hooks/useTasks";
import type { Task } from "@/lib/api";
import {
  ACTIVE_PX_PER_MIN,
  agendaWindow,
  assignColumns,
  blockLabel,
  buildScale,
  fitPxPerMin,
  formatTime,
  gapLabel,
  nowMinute,
  parseTime,
  type Block,
} from "@/lib/agenda";
import { habitColor } from "@/lib/habits";
import { useFolderList } from "@/lib/folders";
import { cn } from "@/lib/utils";

const RAIL_WIDTH = 44; // px reservados para las etiquetas de hora
/** Los cambios de hora/duración se ajustan a saltos de 15 min. */
const SNAP_MIN = 15;
const CONTENT_GAP = 10; // px de separación entre la línea vertical y los bloques
/** Padding vertical del contenedor de scroll (py-4 arriba y abajo). */
const VIEWPORT_PADDING = 28;

interface AgendaTimelineProps {
  tasks: Task[];
  viewedDate: string;
  today: string;
  actions: TaskActions;
  scrollRef: RefObject<HTMLDivElement | null>;
  viewportHeight: number;
  /** Cuando se suelta una tarea desde la lista sobre el raíl. */
  onDropTask: (taskId: string, startMinute: number) => void;
}

export function AgendaTimeline({
  tasks,
  viewedDate,
  today,
  actions,
  scrollRef,
  viewportHeight,
  onDropTask,
}: AgendaTimelineProps) {
  const folders = useFolderList();
  const isToday = viewedDate === today;

  const [activeAnchor, setActiveAnchor] = useState<number | null>(null);
  const active = activeAnchor !== null;
  // Minuto bajo el cursor durante un drag externo (null = sin drag).
  const [dropMinute, setDropMinute] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

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

  // Densidad: en reposo se ajusta al alto del panel; al arrastrar, escala fija de zoom.
  const win = useMemo(() => agendaWindow(blocks), [JSON.stringify(blocks)]); // eslint-disable-line react-hooks/exhaustive-deps
  const idlePxPerMin = fitPxPerMin(win.end - win.start, viewportHeight - VIEWPORT_PADDING);
  const pxPerMin = active ? ACTIVE_PX_PER_MIN : idlePxPerMin;

  const scale = useMemo(
    () => buildScale(blocks, pxPerMin),
    [JSON.stringify(blocks), pxPerMin], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Al entrar en zoom, fijamos scrollTop para que el minuto agarrado no salte de sitio.
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || activeAnchor === null) return;
    const idleY = (activeAnchor - win.start) * idlePxPerMin;
    const activeY = (activeAnchor - win.start) * ACTIVE_PX_PER_MIN;
    scroller.scrollTop = Math.max(0, activeY - idleY);
  }, [activeAnchor]); // eslint-disable-line react-hooks/exhaustive-deps

  const now = isToday ? nowMinute() : null;

  // Etiquetas del raíl: cada hora en reposo, cada 15 min al ampliar. Se descartan
  // las que caerían demasiado juntas para no amontonarse.
  const railLabels = useMemo(() => {
    const MIN_LABEL_GAP_PX = 16;
    const step = active ? 15 : 60;
    const labels: number[] = [];
    const first = Math.ceil(scale.windowStart / step) * step;
    let lastY = -Infinity;
    for (let m = first; m <= scale.windowEnd; m += step) {
      const y = scale.y(m);
      if (y - lastY >= MIN_LABEL_GAP_PX) {
        labels.push(m);
        lastY = y;
      }
    }
    return labels;
  }, [scale, active]);

  // Calcula el minuto (snap 15) a partir de un clientY sobre el raíl.
  const minuteFromClientY = (clientY: number): number => {
    const rect = contentRef.current?.getBoundingClientRect();
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    if (!rect) return scale.windowStart;
    const relY = clientY - rect.top + scrollTop;
    const raw = relY / pxPerMin + scale.windowStart;
    return Math.max(scale.windowStart, Math.min(scale.windowEnd - 30, Math.round(raw / 15) * 15));
  };

  if (planned.length === 0) {
    return (
      <div
        className="relative flex flex-col items-center justify-center py-16 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const taskId = e.dataTransfer.getData("text/task-id");
          if (!taskId) return;
          const minute = minuteFromClientY(e.clientY);
          onDropTask(taskId, minute);
        }}
      >
        <p className="text-sm text-muted-foreground">Aún no hay bloques planificados.</p>
        <p className="mt-1 text-[13px] text-faded">
          Usa{" "}
          <span className="font-medium text-foreground">⋯ → Planificar…</span> en
          cualquier tarea de la lista, o <span className="font-medium text-foreground">arrástrala aquí</span>.
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
        ref={contentRef}
        className="absolute top-0 bottom-0"
        style={{ left: RAIL_WIDTH + CONTENT_GAP, right: 0 }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setDropMinute(minuteFromClientY(e.clientY));
        }}
        onDragLeave={() => setDropMinute(null)}
        onDrop={(e) => {
          e.preventDefault();
          const taskId = e.dataTransfer.getData("text/task-id");
          if (!taskId) { setDropMinute(null); return; }
          const minute = minuteFromClientY(e.clientY);
          setDropMinute(null);
          onDropTask(taskId, minute);
        }}
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
          const heightPx = Math.max(24, scale.y(block.endMinute) - topPx - 2);
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

          return (
            <AgendaBlock
              key={block.id}
              block={block}
              task={task}
              topPx={topPx}
              heightPx={heightPx}
              leftStyle={`calc(${leftPct}% + ${gutter / 2}px)`}
              widthStyle={`calc(${colWidthPct}% - ${gutter}px)`}
              bgStyle={bgStyle}
              hasColor={!!colorName}
              pxPerMin={pxPerMin}
              animate={!active}
              scrollRef={scrollRef}
              onDragStart={() => setActiveAnchor(block.startMinute)}
              onDragEnd={() => setActiveAnchor(null)}
              onToggle={() =>
                actions.toggleComplete.mutate({
                  id: block.id,
                  completed: block.isCompleted,
                })
              }
              onReschedule={(startMinute, durationMinutes) =>
                actions.plan.mutate({
                  id: block.id,
                  startTime: formatTime(startMinute),
                  durationMinutes,
                  date: viewedDate,
                })
              }
            />
          );
        })}

        {/* Indicador de drop: línea + hora */}
        {dropMinute !== null && (
          <div
            className="pointer-events-none absolute left-0 right-0 z-30 flex items-center gap-1"
            style={{ top: scale.y(dropMinute) - 1 }}
          >
            <span className="rounded bg-accent px-1 py-0.5 text-[10px] font-semibold tabular-nums text-white">
              {formatTime(dropMinute)}
            </span>
            <div className="h-0.5 flex-1 rounded-full bg-accent" />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Un bloque de la agenda, arrastrable con tres zonas:
 *  - Borde superior  → cambia la hora de inicio (mantiene el fin).
 *  - Cuerpo (centro)  → mueve el bloque entero (mantiene la duración).
 *  - Borde inferior  → cambia la duración (mantiene el inicio).
 * El arrastre usa la densidad actual (pxPerMin) con snap a 15 min. Al empezar avisa
 * al padre (zoom) y hace auto-scroll si se acerca a los bordes del panel.
 */
function AgendaBlock({
  block,
  task,
  topPx,
  heightPx,
  leftStyle,
  widthStyle,
  bgStyle,
  hasColor,
  pxPerMin,
  animate,
  scrollRef,
  onDragStart,
  onDragEnd,
  onToggle,
  onReschedule,
}: {
  block: Block;
  task: Task;
  topPx: number;
  heightPx: number;
  leftStyle: string;
  widthStyle: string;
  bgStyle: React.CSSProperties;
  hasColor: boolean;
  pxPerMin: number;
  animate: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  onDragStart: () => void;
  onDragEnd: () => void;
  onToggle: () => void;
  onReschedule: (startMinute: number, durationMinutes: number) => void;
}) {
  const duration = block.endMinute - block.startMinute;
  const [drag, setDrag] = useState<{
    kind: "move" | "top" | "bottom";
    dy: number;
  } | null>(null);
  const startYRef = useRef(0);
  // scrollTop en el primer movimiento (tras el anclaje del zoom), para no contar el salto.
  const startScrollRef = useRef<number | null>(null);

  const snap = (min: number) => Math.round(min / SNAP_MIN) * SNAP_MIN;

  // Vista previa mientras se arrastra.
  let previewStart = block.startMinute;
  let previewDuration = duration;
  if (drag) {
    const deltaMin = snap(drag.dy / pxPerMin);
    if (drag.kind === "move") {
      previewStart = Math.max(0, Math.min(1440 - duration, block.startMinute + deltaMin));
    } else if (drag.kind === "bottom") {
      previewDuration = Math.max(
        SNAP_MIN,
        Math.min(Math.min(720, 1440 - block.startMinute), duration + deltaMin),
      );
    } else {
      // top: el fin queda fijo, cambia el inicio (y por tanto la duración).
      const minStart = Math.max(0, block.endMinute - 720);
      previewStart = Math.max(minStart, Math.min(block.endMinute - SNAP_MIN, block.startMinute + deltaMin));
      previewDuration = block.endMinute - previewStart;
    }
  }

  const begin = (kind: "move" | "top" | "bottom") => (e: React.PointerEvent) => {
    if (block.isCompleted) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startYRef.current = e.clientY;
    startScrollRef.current = null; // se captura en el primer move, ya con el zoom anclado
    onDragStart();
    setDrag({ kind, dy: 0 });
  };

  const onMove = (e: React.PointerEvent) => {
    const scroller = scrollRef.current;
    // Auto-scroll al acercarse a los bordes del panel.
    if (scroller) {
      const rect = scroller.getBoundingClientRect();
      const EDGE = 44;
      const SPEED = 12;
      if (e.clientY < rect.top + EDGE) scroller.scrollTop -= SPEED;
      else if (e.clientY > rect.bottom - EDGE) scroller.scrollTop += SPEED;
      if (startScrollRef.current === null) startScrollRef.current = scroller.scrollTop;
    }
    const scrollDelta = scroller
      ? scroller.scrollTop - (startScrollRef.current ?? scroller.scrollTop)
      : 0;
    const dy = e.clientY - startYRef.current + scrollDelta;
    setDrag((d) => (d ? { ...d, dy } : d));
  };

  const onEnd = () => {
    if (drag) {
      const changed =
        previewStart !== block.startMinute || previewDuration !== duration;
      if (changed) onReschedule(previewStart, previewDuration);
    }
    setDrag(null);
    onDragEnd();
  };

  const dragHandlers = {
    onPointerMove: onMove,
    onPointerUp: onEnd,
    onPointerCancel: onEnd,
    style: { touchAction: "none" as const },
  };

  // Geometría con la vista previa aplicada.
  const translateY =
    drag?.kind === "move" || drag?.kind === "top" ? drag.dy : 0;
  const liveHeight =
    drag?.kind === "bottom"
      ? Math.max(24, heightPx + drag.dy)
      : drag?.kind === "top"
        ? Math.max(24, heightPx - drag.dy)
        : heightPx;

  const dragging = drag !== null;
  const compact = liveHeight < 46;

  return (
    <div
      className={cn(
        "absolute isolate overflow-hidden rounded-lg border border-border transition-shadow",
        !hasColor && "border-border bg-muted",
        block.isCompleted && "opacity-60",
        dragging && "z-20 shadow-lg ring-2 ring-accent/50",
      )}
      style={{
        top: topPx,
        height: liveHeight,
        left: leftStyle,
        width: widthStyle,
        transform: translateY ? `translateY(${translateY}px)` : undefined,
        // Al volver a reposo, animar top/height; durante el arrastre, respuesta inmediata.
        transition: animate && !dragging ? "top 0.18s ease, height 0.18s ease" : undefined,
        ...bgStyle,
      }}
    >
      {/* Cuerpo: mover el bloque entero */}
      <div
        className={cn(
          "flex h-full items-start gap-1.5 px-2 py-1",
          !block.isCompleted && (dragging ? "cursor-grabbing" : "cursor-grab"),
        )}
        onPointerDown={begin("move")}
        {...dragHandlers}
      >
        <div className="min-w-0 flex-1 overflow-hidden">
          {!compact && (
            <p className="truncate text-[10px] tabular-nums text-muted-foreground">
              {dragging
                ? blockLabel(formatTime(previewStart), previewDuration)
                : blockLabel(task.plannedStart!, duration)}
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
        <div
          className="relative z-10 mt-0.5 shrink-0"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <TaskCircle
            completed={block.isCompleted}
            fresh={block.completedOnViewedDay}
            small
            onToggle={onToggle}
          />
        </div>
      </div>

      {/* Bordes: redimensionar (no cubren la esquina del círculo) */}
      {!block.isCompleted && (
        <>
          <div
            className="absolute left-0 right-9 top-0 h-2 cursor-ns-resize"
            onPointerDown={begin("top")}
            {...dragHandlers}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
            onPointerDown={begin("bottom")}
            {...dragHandlers}
          />
        </>
      )}
    </div>
  );
}
