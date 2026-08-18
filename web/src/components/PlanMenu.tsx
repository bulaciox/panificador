/**
 * Controles para planificar una tarea: hora de inicio + duración.
 * La duración se elige con chips rápidos comunes, o con "otra duración"
 * (selector de hora de fin) para bloques largos como 8 h.
 *
 * Se usan de dos formas:
 *   - PlanMenuSub: sub-menú dentro del ⋯ de una tarea.
 *   - PlanPill: píldora pulsable con la hora, que abre su propio popover.
 */
import { useState } from "react";
import { Clock } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { DURATION_OPTIONS, durationLabel, parseTime } from "@/lib/agenda";
import { cn } from "@/lib/utils";

interface PlanControlsProps {
  /** Hora actual si ya tiene plan ("HH:mm"), null/undefined si no. */
  currentStart?: string | null;
  /** Duración actual en minutos, null/undefined si no. */
  currentMinutes?: number | null;
  onPlan: (startTime: string, durationMinutes: number) => void;
  onUnplan?: () => void;
}

/**
 * Cuerpo reutilizable: hora de inicio + chips de duración + "otra duración".
 * Se coloca dentro de cualquier contenedor de menú (Sub o Content).
 */
function PlanMenuBody({
  currentStart,
  currentMinutes,
  onPlan,
  onUnplan,
}: PlanControlsProps) {
  const [time, setTime] = useState<string>(currentStart ?? "");
  const [showCustom, setShowCustom] = useState(false);
  // Hora de fin para la duración personalizada.
  const [endTime, setEndTime] = useState<string>(() => {
    if (currentStart && currentMinutes) {
      const end = parseTime(currentStart) + currentMinutes;
      return `${String(Math.floor(end / 60) % 24).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
    }
    return "";
  });

  const commit = (minutes: number) => {
    if (!time || minutes <= 0) return;
    onPlan(time, minutes);
  };

  // Minutos entre inicio y fin (para la duración personalizada).
  const customMinutes =
    time && endTime ? parseTime(endTime) - parseTime(time) : 0;
  const customValid = customMinutes >= 5 && customMinutes <= 720;

  return (
    <>
      {/* Selector de hora nativo — funciona bien en móvil */}
      <div className="px-3 py-2">
        <label className="mb-1 block text-[11px] text-muted-foreground">
          Hora de inicio
        </label>
        <input
          type="time"
          step={300}
          value={time}
          autoFocus
          onChange={(e) => setTime(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          className="w-full rounded-md border border-border bg-background px-2 py-1 text-[13px] outline-none focus:ring-2 focus:ring-accent/50"
        />
      </div>

      <div className="px-3 pb-1 pt-0.5">
        <p className="text-[11px] text-muted-foreground">Duración</p>
      </div>

      {/* Chips rápidos */}
      <div className="flex flex-wrap gap-1.5 px-3 pb-1">
        {DURATION_OPTIONS.map((opt) => {
          const active = currentStart === time && currentMinutes === opt.minutes;
          return (
            <DropdownMenuItem
              key={opt.minutes}
              disabled={!time}
              onSelect={() => commit(opt.minutes)}
              className={cn(
                "justify-center rounded-full border px-2.5 py-1 text-[12px]",
                active
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border",
              )}
            >
              {opt.label}
            </DropdownMenuItem>
          );
        })}
      </div>

      {/* Otra duración: selector de hora de fin */}
      {!showCustom ? (
        <button
          type="button"
          onClick={() => setShowCustom(true)}
          className="w-full px-3 py-1.5 text-left text-[12px] text-muted-foreground hover:text-foreground"
        >
          Otra duración…
        </button>
      ) : (
        <div className="px-3 py-1.5">
          <label className="mb-1 block text-[11px] text-muted-foreground">
            Hasta
          </label>
          <input
            type="time"
            step={300}
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            className="mb-1.5 w-full rounded-md border border-border bg-background px-2 py-1 text-[13px] outline-none focus:ring-2 focus:ring-accent/50"
          />
          <DropdownMenuItem
            disabled={!customValid}
            onSelect={() => commit(customMinutes)}
            className="justify-between rounded-md border border-border"
          >
            <span>Aplicar</span>
            <span className="text-[11px] text-muted-foreground">
              {customValid
                ? durationLabel(customMinutes)
                : customMinutes > 720
                  ? "máx. 12 h"
                  : "fin > inicio"}
            </span>
          </DropdownMenuItem>
        </div>
      )}

      {currentStart && onUnplan && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onUnplan} className="text-muted-foreground">
            Quitar de la agenda
          </DropdownMenuItem>
        </>
      )}
    </>
  );
}

/**
 * Sub-menú de "Planificar" para insertar dentro de un DropdownMenu existente (el ⋯).
 */
export function PlanMenuSub(props: PlanControlsProps) {
  const { currentStart, currentMinutes } = props;
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Clock className="size-4" />
        {currentStart
          ? `Agenda · ${currentStart} (${currentMinutes} min)`
          : "Planificar…"}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-56">
        <PlanMenuBody {...props} />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

/**
 * Píldora pulsable con la hora asignada. Al pulsarla abre el selector directamente,
 * para asignar o modificar la hora sin pasar por el menú ⋯.
 */
export function PlanPill({
  className,
  ...props
}: PlanControlsProps & { className?: string }) {
  const { currentStart, currentMinutes } = props;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={
            currentStart
              ? `${currentStart} · ${currentMinutes} min — pulsa para cambiar`
              : "Poner hora"
          }
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] tabular-nums transition-colors",
            currentStart
              ? "bg-accent-soft text-accent hover:bg-accent/20"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
            className,
          )}
        >
          <Clock className="size-3" />
          {currentStart ?? "hora"}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <PlanMenuBody {...props} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
