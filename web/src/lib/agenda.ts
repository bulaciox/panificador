/**
 * Utilidades puras para el raíl de la agenda diaria.
 *
 * Conceptos clave:
 *   - minute: minutos desde medianoche (0 = 00:00, 90 = 01:30…)
 *   - Block: tarea planificada ya convertida a coordenadas de tiempo
 *   - Scale: función y(minute) lineal que convierte minutos en píxeles.
 *
 * Hay dos ventanas visibles según lo que esté pasando:
 *   - `agendaWindow`: en reposo, se ciñe a los bloques del día (± margen) para
 *     repartir todo el alto del panel entre las horas que sí tienen tareas.
 *   - `dragWindow`: mientras se arrastra, vuelve al día completo (7:00–22:00,
 *     expandido por los bloques) para tener lienzo donde colocar a cualquier hora.
 */

// ─── Constantes de dibujo ─────────────────────────────────────────────────────

/** Densidad al arrastrar/redimensionar: 1.4 ≈ 84 px por hora (intervalos de 15 min cómodos). */
export const ACTIVE_PX_PER_MIN = 1.4;

/** Límites de la densidad en reposo (fit-to-height), para no quedar ni gigante ni ilegible. */
const IDLE_PX_PER_MIN_MIN = 0.4;
const IDLE_PX_PER_MIN_MAX = 1.2;

/** Ventana por defecto al arrastrar: de 7:00 a 22:00. */
const DAY_START = 7 * 60;
const DAY_END = 22 * 60;

/** Aire que se deja antes del primer bloque y después del último (luego se redondea a la hora). */
const WINDOW_PAD = 30;

/** Aire por debajo del marcador de "ahora", para no dejarlo pegado al borde. */
const NOW_PAD = 60;

/** Ventana ajustada mínima: un solo bloque corto no debe dejar un raíl ridículo. */
const MIN_WINDOW_MINUTES = 180;

/** Densidad en reposo que hace caber `windowMinutes` en `heightPx` (con recorte). */
export function fitPxPerMin(windowMinutes: number, heightPx: number): number {
  if (heightPx <= 0 || windowMinutes <= 0) return IDLE_PX_PER_MIN_MIN;
  const raw = heightPx / windowMinutes;
  return Math.max(IDLE_PX_PER_MIN_MIN, Math.min(IDLE_PX_PER_MIN_MAX, raw));
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Block {
  id: string;
  title: string;
  folderId: string | null;
  startMinute: number;
  endMinute: number;
  isCompleted: boolean;
  completedOnViewedDay: boolean;
  /** Índice de columna dentro del grupo de solapados (0, 1, 2…). */
  col: number;
  /** Número total de columnas en el grupo. */
  cols: number;
}

export interface Gap {
  startMinute: number;
  endMinute: number;
}

export interface Scale {
  /** Convierte minutos en píxeles desde el tope del raíl. */
  y: (minute: number) => number;
  /** Altura total del raíl en píxeles. */
  totalHeight: number;
  /** Inicio de la ventana visible (minutos). */
  windowStart: number;
  /** Fin de la ventana visible (minutos). */
  windowEnd: number;
  /** Huecos entre bloques (para mostrar el tiempo libre). */
  gaps: Gap[];
}

// ─── Parseo ───────────────────────────────────────────────────────────────────

/** "HH:mm" → minutos desde medianoche. Devuelve 0 para entradas inválidas o undefined. */
export function parseTime(hhmm: string | undefined | null): number {
  if (!hhmm || !hhmm.includes(":")) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

/** Minutos desde medianoche → "HH:mm". */
export function formatTime(minute: number): string {
  const h = Math.floor(minute / 60) % 24;
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "HH:mm" + duración → "HH:mm – HH:mm (X min / X h)". */
export function blockLabel(startHhmm: string, minutes: number): string {
  const start = parseTime(startHhmm);
  const end = start + minutes;
  const duration =
    minutes < 60
      ? `${minutes} min`
      : minutes % 60 === 0
        ? `${minutes / 60} h`
        : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  return `${startHhmm} – ${formatTime(end)} (${duration})`;
}

/** Minutos actuales desde medianoche, en hora local. */
export function nowMinute(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

// ─── Columnas (solapes) ───────────────────────────────────────────────────────

/**
 * Asigna a cada bloque su columna y el total de columnas del grupo,
 * usando el algoritmo de calendario: racimos transitivos + primera columna libre.
 */
export function assignColumns(blocks: Omit<Block, "col" | "cols">[]): Block[] {
  if (blocks.length === 0) return [];

  // Ordenar por inicio, luego por duración descendente para rellenar bien.
  const sorted = [...blocks].sort(
    (a, b) => a.startMinute - b.startMinute || b.endMinute - a.endMinute,
  );

  // Agrupar en racimos de bloques que se solapan transitivamente.
  const clusters: (typeof sorted)[] = [];
  let currentCluster: (typeof sorted) = [];
  let clusterEnd = -1;

  for (const block of sorted) {
    if (block.startMinute < clusterEnd) {
      currentCluster.push(block);
      clusterEnd = Math.max(clusterEnd, block.endMinute);
    } else {
      if (currentCluster.length > 0) clusters.push(currentCluster);
      currentCluster = [block];
      clusterEnd = block.endMinute;
    }
  }
  if (currentCluster.length > 0) clusters.push(currentCluster);

  const result: Block[] = [];

  for (const cluster of clusters) {
    // Columnas: array con el minuto en que acaba el último bloque asignado.
    const colEnd: number[] = [];

    const assigned: (typeof cluster[0] & { col: number })[] = cluster.map((block) => {
      const col = colEnd.findIndex((end) => end <= block.startMinute);
      const assignedCol = col === -1 ? colEnd.length : col;
      colEnd[assignedCol] = block.endMinute;
      return { ...block, col: assignedCol };
    });

    const cols = colEnd.length;
    for (const b of assigned) {
      result.push({ ...b, cols });
    }
  }

  // Devolver en el orden original.
  return blocks.map((b) => result.find((r) => r.id === b.id)!);
}

// ─── Ventanas visibles ────────────────────────────────────────────────────────

/** Redondea hacia abajo a la hora entera. */
const floorHour = (minute: number) => Math.floor(minute / 60) * 60;

/** Redondea hacia arriba a la hora entera. */
const ceilHour = (minute: number) => Math.ceil(minute / 60) * 60;

/**
 * Base del día: 7:00–22:00, expandida a la hora entera por los bloques que caigan fuera.
 */
function fullDayWindow(blocks: Block[]): { start: number; end: number } {
  let start = DAY_START;
  let end = DAY_END;
  if (blocks.length > 0) {
    const earliestStart = Math.min(...blocks.map((b) => b.startMinute));
    const latestEnd = Math.max(...blocks.map((b) => b.endMinute));
    start = Math.min(start, floorHour(earliestStart));
    end = Math.max(end, ceilHour(latestEnd));
  }
  return { start: Math.max(0, start), end: Math.min(1440, end) };
}

/**
 * Ventana amplia para arrastrar: el día completo, garantizando que contiene a la
 * ajustada. Así ampliar nunca encoge el raíl y siempre hay lienzo de sobra donde
 * colocar una tarea a cualquier hora.
 */
export function dragWindow(
  blocks: Block[],
  now: number | null = null,
): { start: number; end: number } {
  const base = fullDayWindow(blocks);
  const tight = agendaWindow(blocks, now);
  return {
    start: Math.min(base.start, tight.start),
    end: Math.max(base.end, tight.end),
  };
}

/**
 * Ventana en reposo: se ciñe a los bloques del día (± `WINDOW_PAD`, a la hora entera)
 * para que las horas con tareas se repartan todo el alto del panel. Si se está viendo
 * hoy, se estira lo justo para que el marcador de "ahora" siga dentro con algo de aire.
 * Sin bloques no hay nada a lo que ceñirse, así que se cae al día completo.
 */
export function agendaWindow(
  blocks: Block[],
  now: number | null = null,
): { start: number; end: number } {
  if (blocks.length === 0) return fullDayWindow(blocks);

  const earliestStart = Math.min(...blocks.map((b) => b.startMinute));
  const latestEnd = Math.max(...blocks.map((b) => b.endMinute));

  let start = floorHour(earliestStart - WINDOW_PAD);
  let end = ceilHour(latestEnd + WINDOW_PAD);

  if (now !== null) {
    start = Math.min(start, floorHour(now));
    end = Math.max(end, ceilHour(now + NOW_PAD));
  }

  start = Math.max(0, start);
  end = Math.min(1440, end);

  // Ancho mínimo: se estira por abajo y, si choca con medianoche, por arriba.
  if (end - start < MIN_WINDOW_MINUTES) {
    end = Math.min(1440, start + MIN_WINDOW_MINUTES);
    start = Math.max(0, end - MIN_WINDOW_MINUTES);
  }

  return { start, end };
}

// ─── Escala lineal ────────────────────────────────────────────────────────────

/**
 * Construye la escala de tiempo sobre la ventana que se le pase (ajustada en reposo,
 * amplia al arrastrar). La escala es lineal con la densidad `pxPerMin` indicada, así que
 * los huecos entre bloques conservan su tamaño real.
 */
export function buildScale(
  blocks: Block[],
  pxPerMin: number,
  win: { start: number; end: number },
): Scale {
  const { start: windowStart, end: windowEnd } = win;

  const totalHeight = (windowEnd - windowStart) * pxPerMin;

  const y = (minute: number): number =>
    Math.max(0, Math.min(totalHeight, (minute - windowStart) * pxPerMin));

  // Huecos libres dentro de la ventana, para etiquetar el tiempo libre.
  const occupiedIntervals = mergeIntervals(
    blocks.map((b) => [b.startMinute, b.endMinute] as [number, number]),
  );
  const gaps: Gap[] = invertIntervals(occupiedIntervals, windowStart, windowEnd).map(
    (iv) => ({ startMinute: iv.start, endMinute: iv.end }),
  );

  return { y, totalHeight, windowStart, windowEnd, gaps };
}

// ─── Helpers de intervalos ────────────────────────────────────────────────────

function mergeIntervals(intervals: [number, number][]): [number, number][] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [sorted[0]];
  for (const iv of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (iv[0] < last[1]) last[1] = Math.max(last[1], iv[1]);
    else merged.push(iv);
  }
  return merged;
}

function invertIntervals(
  occupied: [number, number][],
  from: number,
  to: number,
): { start: number; end: number }[] {
  const result: { start: number; end: number }[] = [];
  let cursor = from;
  for (const [s, e] of occupied) {
    const clampedS = Math.max(s, from);
    const clampedE = Math.min(e, to);
    if (clampedS > cursor) result.push({ start: cursor, end: clampedS });
    if (clampedE > cursor) cursor = clampedE;
  }
  if (cursor < to) result.push({ start: cursor, end: to });
  return result;
}

// ─── Etiquetas de duración libre ──────────────────────────────────────────────

/** "2h 30m libres", "45 min libres", etc. */
export function gapLabel(minutes: number): string {
  if (minutes < 5) return "";
  if (minutes < 60) return `${minutes} min libres`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h libres` : `${h} h ${m} min libres`;
}

// ─── Opciones de duración para los chips rápidos ─────────────────────────────

export const DURATION_OPTIONS = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "1 h", minutes: 60 },
  { label: "1 h 30", minutes: 90 },
  { label: "2 h", minutes: 120 },
];

/** "8 h", "1 h 30 min", "45 min" — para mostrar la duración calculada. */
export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
