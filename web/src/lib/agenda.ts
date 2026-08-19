/**
 * Utilidades puras para el raíl de la agenda diaria.
 *
 * Conceptos clave:
 *   - minute: minutos desde medianoche (0 = 00:00, 90 = 01:30…)
 *   - Block: tarea planificada ya convertida a coordenadas de tiempo
 *   - Scale: función y(minute) lineal que convierte minutos en píxeles.
 *
 * La ventana visible es fija (7:00–22:00) para tener siempre lienzo donde
 * arrastrar; se expande solo si hay bloques antes o después de esas horas.
 */

// ─── Constantes de dibujo ─────────────────────────────────────────────────────

/** Densidad al arrastrar/redimensionar: 1.4 ≈ 84 px por hora (intervalos de 15 min cómodos). */
export const ACTIVE_PX_PER_MIN = 1.4;

/** Límites de la densidad en reposo (fit-to-height), para no quedar ni gigante ni ilegible. */
const IDLE_PX_PER_MIN_MIN = 0.4;
const IDLE_PX_PER_MIN_MAX = 1.2;

/** Ventana por defecto: de 7:00 a 22:00. */
const DAY_START = 7 * 60;
const DAY_END = 22 * 60;

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

// ─── Escala lineal con ventana fija 7–22 ──────────────────────────────────────

/** Ventana visible (minutos): 7–22 por defecto, expandida a la hora entera por los bloques. */
export function agendaWindow(blocks: Block[]): { start: number; end: number } {
  let start = DAY_START;
  let end = DAY_END;
  if (blocks.length > 0) {
    const earliestStart = Math.min(...blocks.map((b) => b.startMinute));
    const latestEnd = Math.max(...blocks.map((b) => b.endMinute));
    start = Math.min(start, Math.floor(earliestStart / 60) * 60);
    end = Math.max(end, Math.ceil(latestEnd / 60) * 60);
  }
  return { start: Math.max(0, start), end: Math.min(1440, end) };
}

/**
 * Construye la escala de tiempo. La ventana va de 7:00 a 22:00 por defecto y se
 * expande (a la hora entera) para incluir bloques que caigan antes o después.
 * La escala es lineal con la densidad `pxPerMin` que se le pase (reposo o zoom).
 */
export function buildScale(blocks: Block[], pxPerMin: number): Scale {
  const { start: windowStart, end: windowEnd } = agendaWindow(blocks);

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
