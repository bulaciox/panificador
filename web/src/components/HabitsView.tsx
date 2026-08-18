import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Palette,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

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
import type { HabitActions } from "@/hooks/useHabits";
import { useContainerWidth } from "@/hooks/useContainerWidth";
import { useManualOrder } from "@/hooks/useManualOrder";
import { HabitState, type Habit, type HabitDay } from "@/lib/api";
import { dayNumber, weekdayAbbr } from "@/lib/dates";
import {
  habitColor,
  HABIT_COLORS,
  nextHabitColor,
  rgba,
  streakAlpha,
} from "@/lib/habits";
import { cn } from "@/lib/utils";

/** Referencia estable para cuando aún no han llegado los hábitos. */
const EMPTY: Habit[] = [];

// Medidas de la rejilla, para calcular cuántos días caben en el ancho disponible.
const NAME_WIDTH = 116;
const CELL_WIDTH = 56;
const COUNTS_WIDTH = 138;
/** Hoy y los tres días anteriores: lo mínimo que se muestra, aunque la pantalla sea pequeña. */
const MIN_DAYS = 4;
/** Por debajo de este ancho los contadores de semana, mes y año estorban más que ayudan. */
const COUNTS_MIN_WIDTH = 560;

interface HabitsViewProps {
  habits: Habit[] | undefined;
  isLoading: boolean;
  days: string[];
  today: string;
  actions: HabitActions;
  error: string | null;
  onDismissError: () => void;
}

export function HabitsView({
  habits,
  isLoading,
  days,
  today,
  actions,
  error,
  onDismissError,
}: HabitsViewProps) {
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);

  const { order, move } = useManualOrder(habits ?? EMPTY, (orderedIds) =>
    actions.reorder.mutate(orderedIds),
  );

  const { ref: gridRef, width } = useContainerWidth<HTMLDivElement>();

  const list = order;

  // En pantalla pequeña, hoy y los tres días anteriores, sin contadores: todo de un vistazo.
  // A partir de ahí se añaden días hacia atrás según el sitio que haya, hasta las dos semanas.
  const showCounts = width >= COUNTS_MIN_WIDTH;
  const fitting = Math.floor((width - NAME_WIDTH - COUNTS_WIDTH) / CELL_WIDTH);
  const dayCount =
    width === 0
      ? days.length
      : showCounts
        ? Math.max(MIN_DAYS, Math.min(days.length, fitting))
        : MIN_DAYS;

  const visibleDays = days.slice(-dayCount);
  const visibleDates = new Set(visibleDays);

  const columns = [
    // El nombre absorbe el espacio sobrante (1fr) para que las celdas queden cuadradas.
    `minmax(${NAME_WIDTH}px, 1fr)`,
    `repeat(${visibleDays.length}, ${CELL_WIDTH}px)`,
    showCounts ? "repeat(3, 46px)" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-[13px] text-danger">
          <span className="flex-1">{error}</span>
          <button type="button" onClick={onDismissError} aria-label="Cerrar aviso">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <div ref={gridRef} className="overflow-x-auto pb-1">
        {isLoading && !habits ? (
          <p className="px-2 py-8 text-sm text-muted-foreground">Cargando…</p>
        ) : (
        <div>
          {/* cabecera de días */}
          <div className="grid items-end" style={{ gridTemplateColumns: columns }}>
            <div />
            {visibleDays.map((day) => (
              <div key={day} className="pb-1.5 text-center">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {weekdayAbbr(day)}
                </div>
                <div
                  className={cn(
                    "mx-auto mt-0.5 grid size-[22px] place-items-center text-[13px] tabular-nums",
                    day === today
                      ? "rounded-full bg-[#22c55e] font-semibold text-white"
                      : "text-foreground",
                  )}
                >
                  {dayNumber(day)}
                </div>
              </div>
            ))}
            {showCounts &&
              ["semana", "mes", "año"].map((label) => (
                <div
                  key={label}
                  className="pb-2 text-center text-[10px] leading-tight text-muted-foreground"
                >
                  {label}
                </div>
              ))}
          </div>

          {/* una fila por hábito */}
          {list.map((habit, index) => (
            <div
              key={habit.id}
              className="group grid items-stretch"
              style={{ gridTemplateColumns: columns }}
            >
              {renaming === habit.id ? (
                <div className="flex items-center pr-2">
                  <HabitNameInput
                    defaultValue={habit.name}
                    onDone={(value) => {
                      setRenaming(null);
                      if (value && value !== habit.name) {
                        actions.update.mutate({ id: habit.id, input: { name: value } });
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="flex min-w-0 items-center gap-1 pr-2">
                  {/* Flechas de orden: con ratón solo asoman al pasar por la fila; en pantalla
                      táctil no hay cursor que las revele, así que ahí se quedan visibles. */}
                  <div className="-ml-0.5 flex shrink-0 flex-col transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
                    <button
                      type="button"
                      aria-label={`Subir ${habit.name}`}
                      title="Subir"
                      disabled={index === 0}
                      onClick={() => move(habit.id, -1)}
                      className="rounded py-[2px] text-faded hover:text-foreground disabled:opacity-30 disabled:hover:text-faded"
                    >
                      <ChevronUp className="size-3.5 md:size-3" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Bajar ${habit.name}`}
                      title="Bajar"
                      disabled={index === list.length - 1}
                      onClick={() => move(habit.id, 1)}
                      className="rounded py-[2px] text-faded hover:text-foreground disabled:opacity-30 disabled:hover:text-faded"
                    >
                      <ChevronDown className="size-3.5 md:size-3" />
                    </button>
                  </div>

                  <span
                    className="min-w-0 flex-1 truncate text-[14px] font-medium"
                    title={habit.name}
                  >
                    {habit.name}
                  </span>
                  <HabitMenu
                    habit={habit}
                    onRename={() => setRenaming(habit.id)}
                    onColor={(color) =>
                      actions.update.mutate({ id: habit.id, input: { color } })
                    }
                    onDelete={() => actions.remove.mutate(habit.id)}
                  />
                </div>
              )}

              {habit.days
                .filter((day) => visibleDates.has(day.date))
                .map((day) => (
                  <HabitCell
                    key={day.date}
                    habit={habit}
                    day={day}
                    today={today}
                    onClick={() =>
                      actions.cycleDay.mutate({ id: habit.id, date: day.date })
                    }
                  />
                ))}

              {showCounts && (
                <>
                  <Count value={habit.weekCount} />
                  <Count value={habit.monthCount} />
                  <Count value={habit.yearCount} />
                </>
              )}
            </div>
          ))}
        </div>
        )}
      </div>

      <div className="mt-3">
        {creating ? (
          <HabitNameInput
            defaultValue=""
            onDone={(value) => {
              setCreating(false);
              if (!value) return;
              actions.create.mutate({
                name: value,
                color: nextHabitColor(list.map((habit) => habit.color)),
              });
            }}
          />
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            Nuevo hábito
          </Button>
        )}
      </div>

      {list.length === 0 && !creating && (
        <div className="px-2 py-10 text-center">
          <Sparkles className="mx-auto mb-3 size-6 text-faded" />
          <p className="text-sm text-muted-foreground">Todavía no hay hábitos.</p>
          <p className="text-[13px] text-faded">
            Añade uno y ve marcando los días: cuanto más seguido, más fuerte el color.
          </p>
        </div>
      )}

      {list.length > 0 && (
        <p className="mt-4 text-[12px] leading-relaxed text-faded">
          Un clic marca el día como hecho y el color sube de intensidad. Un segundo clic lo deja
          en diagonal: día saltado, que conserva el color sin hacerlo crecer. No se pueden saltar
          más de dos días seguidos. Un tercer clic borra la marca. Las flechas de la izquierda
          del nombre cambian el orden de los hábitos.
        </p>
      )}
    </div>
  );
}

function HabitCell({
  habit,
  day,
  today,
  onClick,
}: {
  habit: Habit;
  day: HabitDay;
  today: string;
  onClick: () => void;
}) {
  const color = habitColor(habit.color);
  const fill = rgba(color, streakAlpha(day.streak));
  const weekend = [0, 6].includes(new Date(`${day.date}T00:00:00`).getDay());
  const future = day.date > today;

  const style =
    day.state === HabitState.Done
      ? { backgroundColor: fill }
      : day.state === HabitState.Skipped
        ? { background: `linear-gradient(to top right, ${fill} 0 50%, transparent 50% 100%)` }
        : undefined;

  const label =
    day.state === HabitState.Done
      ? "hecho"
      : day.state === HabitState.Skipped
        ? "saltado"
        : "sin marcar";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={future}
      title={`${day.date} · ${label}`}
      aria-label={`${habit.name}, ${day.date}: ${label}`}
      style={style}
      className={cn(
        "h-14 w-full transition-[box-shadow]",
        !day.state && (weekend ? "bg-muted" : "bg-transparent"),
        future
          ? "cursor-default opacity-40"
          : "hover:inset-ring-2 hover:inset-ring-accent/40",
      )}
    />
  );
}

function Count({ value }: { value: number }) {
  return (
    <div className="grid h-14 place-items-center text-[13px] tabular-nums text-muted-foreground">
      {value}
    </div>
  );
}

function HabitMenu({
  habit,
  onRename,
  onColor,
  onDelete,
}: {
  habit: Habit;
  onRename: () => void;
  onColor: (color: string) => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="iconSm"
          title="Opciones del hábito"
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={onRename}>
          <Pencil />
          Renombrar
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette />
            Color
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {HABIT_COLORS.map((color) => (
              <DropdownMenuItem key={color.name} onSelect={() => onColor(color.name)}>
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: rgba(color, 1) }}
                />
                {color.label}
                <DropdownMenuCheckIcon checked={habit.color === color.name} />
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="danger" onSelect={onDelete}>
          <Trash2 />
          Eliminar hábito
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HabitNameInput({
  defaultValue,
  onDone,
}: {
  defaultValue: string;
  onDone: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <input
      autoFocus
      value={value}
      placeholder="Nombre del hábito"
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => onDone(value.trim())}
      onKeyDown={(event) => {
        if (event.key === "Enter") onDone(value.trim());
        if (event.key === "Escape") onDone("");
      }}
      className="w-full min-w-0 rounded-md border border-accent bg-transparent px-1.5 py-1 text-[14px] outline-none placeholder:text-faded"
    />
  );
}
