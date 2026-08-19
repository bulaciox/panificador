import { BarChart3, Flame, TrendingUp, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Analytics } from "@/lib/api";
import { weekdayAbbr } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface AnalyticsViewProps {
  data: Analytics | undefined;
  isLoading: boolean;
  weeks: 1 | 2;
  onWeeksChange: (weeks: 1 | 2) => void;
  today: string;
}

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
        <div className="mb-5">{rangeToggle}</div>
        <p className="px-2 py-8 text-sm text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  const days = data?.days ?? [];

  return (
    <div>
      <div className="mb-4">{rangeToggle}</div>

      {/* Layout principal: gráfico izquierda, tarjetas derecha */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Gráfico de línea */}
        <div className="min-w-0 flex-1">
          <LineChart days={days} today={today} />
        </div>

        {/* Tarjetas de métricas */}
        <div className="flex flex-row gap-3 lg:w-56 lg:flex-col">
          <MetricCard
            icon={<BarChart3 className="size-4" />}
            label="TOTAL"
            value={data?.total ?? 0}
            unit="tareas hechas"
          />
          <MetricCard
            icon={<TrendingUp className="size-4" />}
            label="MEDIA"
            value={data?.dailyAverage ?? 0}
            unit="por día"
          />
          <MetricCard
            icon={<Trophy className="size-4" />}
            label="MEJOR DÍA"
            value={data?.bestDay ?? 0}
            unit="tareas"
          />
          <MetricCard
            icon={<Flame className="size-4" />}
            label="RACHA"
            value={data?.currentStreak ?? 0}
            unit={data?.currentStreak === 1 ? "día" : "días"}
            highlight={(data?.currentStreak ?? 0) > 0}
            badge={(data?.currentStreak ?? 0) > 0 ? "¡SIGUE ASÍ!" : undefined}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Tarjeta de métrica ───────────────────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
  unit,
  highlight = false,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
  highlight?: boolean;
  badge?: string;
}) {
  return (
    <div className="flex-1 rounded-xl border border-border bg-surface p-3 lg:flex-none">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground [&_svg]:size-3.5">
        {icon}
        {label}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "text-[26px] font-semibold tabular-nums leading-none",
              highlight ? "text-accent" : "text-foreground",
            )}
          >
            {value}
          </span>
          <span className="text-[11px] text-faded">{unit}</span>
        </div>
        {badge && (
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Gráfico de línea SVG ─────────────────────────────────────────────────────

const SVG_W = 600;
const SVG_H = 220;
const PAD = { top: 28, right: 16, bottom: 40, left: 36 };
const INNER_W = SVG_W - PAD.left - PAD.right;
const INNER_H = SVG_H - PAD.top - PAD.bottom;

function LineChart({
  days,
  today,
}: {
  days: Analytics["days"];
  today: string;
}) {
  if (days.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-xl border border-border bg-surface">
        <p className="text-sm text-muted-foreground">Sin datos para este periodo.</p>
      </div>
    );
  }

  const counts = days.map((d) => d.count);
  const maxVal = Math.max(...counts, 1);
  const yMax = Math.ceil(maxVal / 5) * 5 + 2; // redondear al 5 superior
  const bestIdx = counts.indexOf(Math.max(...counts));

  const xStep = INNER_W / Math.max(days.length - 1, 1);

  const px = (i: number) => PAD.left + i * xStep;
  const py = (v: number) => PAD.top + INNER_H - (v / yMax) * INNER_H;

  // Path de la línea
  const linePts = days.map((d, i) => `${px(i)},${py(d.count)}`);
  const linePath = `M ${linePts.join(" L ")}`;

  // Path del área
  const areaPath =
    `M ${px(0)},${py(0)} ` +
    days.map((d, i) => `L ${px(i)},${py(d.count)}`).join(" ") +
    ` L ${px(days.length - 1)},${py(0)} Z`;

  // Etiquetas del eje Y
  const yTicks = [0, Math.round(yMax / 4), Math.round(yMax / 2), Math.round((3 * yMax) / 4), yMax];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full"
        style={{ height: "auto", aspectRatio: `${SVG_W}/${SVG_H}` }}
        aria-hidden
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <clipPath id="chartClip">
            <rect x={PAD.left} y={PAD.top} width={INNER_W} height={INNER_H} />
          </clipPath>
        </defs>

        {/* Líneas guía horizontales */}
        {yTicks.slice(1).map((tick) => (
          <line
            key={tick}
            x1={PAD.left}
            y1={py(tick)}
            x2={PAD.left + INNER_W}
            y2={py(tick)}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeWidth="1"
          />
        ))}

        {/* Etiquetas eje Y */}
        {yTicks.map((tick) => (
          <text
            key={tick}
            x={PAD.left - 6}
            y={py(tick) + 4}
            textAnchor="end"
            fontSize="10"
            fill="currentColor"
            opacity="0.4"
          >
            {tick}
          </text>
        ))}

        {/* Área rellena */}
        <path d={areaPath} fill="url(#areaGrad)" clipPath="url(#chartClip)" />

        {/* Línea */}
        <path
          d={linePath}
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          clipPath="url(#chartClip)"
        />

        {/* Puntos */}
        {days.map((d, i) => {
          const isToday = d.date === today;
          const isRecord = i === bestIdx && d.count > 0;
          return (
            <circle
              key={d.date}
              cx={px(i)}
              cy={py(d.count)}
              r={isToday ? 5 : isRecord ? 5 : 4}
              fill={isToday ? "#8b5cf6" : "#06b6d4"}
              stroke="white"
              strokeWidth="1.5"
            />
          );
        })}

        {/* Tooltip "DÍA DE RÉCORD" */}
        {bestIdx >= 0 && days[bestIdx]?.count > 0 && (() => {
          const bx = px(bestIdx);
          const by = py(days[bestIdx].count);
          const label = "🎉 DÍA DE RÉCORD";
          const boxW = label.length * 6.2 + 16;
          const boxH = 22;
          // Si está muy a la derecha, alinear a la izquierda
          const tooltipX = bx + boxW / 2 > SVG_W - PAD.right
            ? bx - boxW
            : bx - boxW / 2;
          return (
            <g>
              <rect
                x={tooltipX}
                y={by - boxH - 10}
                width={boxW}
                height={boxH}
                rx="6"
                fill="white"
                stroke="#e5e7eb"
                strokeWidth="1"
                filter="drop-shadow(0 1px 3px rgba(0,0,0,0.10))"
              />
              <text
                x={tooltipX + boxW / 2}
                y={by - 10 - boxH / 2 + 4}
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="700"
                fill="#374151"
              >
                {label}
              </text>
            </g>
          );
        })()}

        {/* Etiquetas eje X */}
        {days.map((d, i) => {
          // Mostrar solo algunas etiquetas si hay muchos días para no amontonar
          const show = days.length <= 7 ? true : i % 2 === 0 || i === days.length - 1;
          if (!show) return null;
          return (
            <text
              key={d.date}
              x={px(i)}
              y={SVG_H - 8}
              textAnchor="middle"
              fontSize="10"
              fill="currentColor"
              opacity={d.date === today ? "0.9" : "0.45"}
              fontWeight={d.date === today ? "700" : "400"}
            >
              {weekdayAbbr(d.date)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
