import { BarChart3, Flame, Target, TrendingUp, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Analytics } from "@/lib/api";
import { dayNumber, weekdayAbbr } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface AnalyticsViewProps {
  data: Analytics | undefined;
  isLoading: boolean;
  weeks: 1 | 2;
  onWeeksChange: (weeks: 1 | 2) => void;
  today: string;
}

/**
 * Vista de Análisis: cuántas tareas se han completado por día en la última semana o
 * dos, con métricas de resumen para motivar a seguir cerrando tareas.
 * Pensada sobre todo para escritorio, donde suele consultarse.
 */
export function AnalyticsView({
  data,
  isLoading,
  weeks,
  onWeeksChange,
  today,
}: AnalyticsViewProps) {
  const rangeToggle = (
    <div className="flex items-center gap-1">
      <Button
        variant={weeks === 1 ? "subtle" : "ghost"}
        size="sm"
        onClick={() => onWeeksChange(1)}
      >
        1 semana
      </Button>
      <Button
        variant={weeks === 2 ? "subtle" : "ghost"}
        size="sm"
        onClick={() => onWeeksChange(2)}
      >
        2 semanas
      </Button>
    </div>
  );

  if (isLoading && !data) {
    return (
      <div>
        <div className="mb-5 flex justify-end">{rangeToggle}</div>
        <p className="px-2 py-8 text-sm text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  const days = data?.days ?? [];
  const total = data?.total ?? 0;

  return (
    <div>
      <div className="mb-5 flex justify-end">{rangeToggle}</div>

      {/* Tarjetas de resumen: en fila desde tablet hacia arriba */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={<BarChart3 className="size-4" />}
          label="Total"
          value={total}
          hint="tareas hechas"
        />
        <StatCard
          icon={<TrendingUp className="size-4" />}
          label="Media"
          value={data?.dailyAverage ?? 0}
          hint="por día"
        />
        <StatCard
          icon={<Trophy className="size-4" />}
          label="Mejor día"
          value={data?.bestDay ?? 0}
          hint="tareas"
        />
        <StatCard
          icon={<Flame className="size-4" />}
          label="Racha"
          value={data?.currentStreak ?? 0}
          hint={data?.currentStreak === 1 ? "día" : "días"}
          highlight={(data?.currentStreak ?? 0) > 0}
        />
      </div>

      {total === 0 ? (
        <div className="px-2 py-12 text-center">
          <Target className="mx-auto mb-3 size-6 text-faded" />
          <p className="text-sm text-muted-foreground">
            Aún no has completado tareas en este periodo.
          </p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-faded">
            Marca tareas como hechas y aquí verás tu ritmo día a día. Empieza hoy.
          </p>
        </div>
      ) : (
        <Chart days={days} today={today} />
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground [&_svg]:size-3.5">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span
          className={cn(
            "text-[28px] font-semibold tabular-nums leading-none",
            highlight ? "text-accent" : "text-foreground",
          )}
        >
          {value}
        </span>
        <span className="text-[11px] text-faded">{hint}</span>
      </div>
    </div>
  );
}

const CHART_HEIGHT = 240;

/** Gráfico de barras vertical, una por día. Altura proporcional al mejor día del rango. */
function Chart({ days, today }: { days: Analytics["days"]; today: string }) {
  const max = Math.max(1, ...days.map((d) => d.count));

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div
        className="flex items-end justify-between gap-2"
        style={{ height: CHART_HEIGHT }}
      >
        {days.map((day) => {
          const isToday = day.date === today;
          // Altura en px proporcional al máximo; mínimo visible si hay >=1 tarea.
          const barPx =
            day.count === 0 ? 4 : Math.max(14, (day.count / max) * CHART_HEIGHT);
          return (
            <div
              key={day.date}
              className="flex h-full min-w-0 flex-1 flex-col justify-end"
              title={`${day.count} ${day.count === 1 ? "tarea" : "tareas"}`}
            >
              {day.count > 0 && (
                <span className="mb-1.5 text-center text-[12px] font-semibold tabular-nums text-foreground">
                  {day.count}
                </span>
              )}
              <div
                className="w-full rounded-md transition-[height]"
                style={{
                  height: barPx,
                  // Estilo inline: el modificador de opacidad de Tailwind no resuelve
                  // sobre esta variable de color, así que fijamos el color a mano.
                  backgroundColor:
                    day.count === 0
                      ? "var(--muted)"
                      : isToday
                        ? "var(--accent)"
                        : "color-mix(in srgb, var(--accent) 55%, transparent)",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Etiquetas de dia */}
      <div className="mt-2.5 flex justify-between gap-2 border-t border-border pt-2.5">
        {days.map((day) => {
          const isToday = day.date === today;
          return (
            <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {weekdayAbbr(day.date)}
              </span>
              <span
                className={cn(
                  "mt-1 grid size-6 place-items-center text-[12px] tabular-nums",
                  isToday
                    ? "rounded-full bg-accent font-semibold text-white"
                    : "text-muted-foreground",
                )}
              >
                {dayNumber(day.date)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
