export interface HabitColor {
  name: string;
  label: string;
  rgb: [number, number, number];
}

export const HABIT_COLORS: HabitColor[] = [
  { name: "red", label: "Rojo", rgb: [239, 68, 68] },
  { name: "amber", label: "Ámbar", rgb: [245, 170, 10] },
  { name: "teal", label: "Turquesa", rgb: [45, 178, 178] },
  { name: "blue", label: "Azul", rgb: [59, 130, 246] },
  { name: "violet", label: "Violeta", rgb: [139, 92, 246] },
  { name: "green", label: "Verde", rgb: [34, 197, 94] },
];

/** Días de racha necesarios para llegar al color a plena intensidad. */
export const RAMP_LENGTH = 6;

const MIN_ALPHA = 0.28;

export function habitColor(name: string | undefined): HabitColor {
  return HABIT_COLORS.find((color) => color.name === name) ?? HABIT_COLORS[0];
}

/** Color sugerido para el siguiente hábito: el primero que no esté usado. */
export function nextHabitColor(used: string[]): string {
  const free = HABIT_COLORS.find((color) => !used.includes(color.name));
  return (free ?? HABIT_COLORS[used.length % HABIT_COLORS.length]).name;
}

/** De racha a opacidad: 1 día apenas se ve, RAMP_LENGTH días es el color pleno. */
export function streakAlpha(streak: number): number {
  if (streak <= 0) return 0;
  const step = (1 - MIN_ALPHA) / (RAMP_LENGTH - 1);
  return Math.min(1, MIN_ALPHA + (streak - 1) * step);
}

export function rgba(color: HabitColor, alpha: number): string {
  const [r, g, b] = color.rgb;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
