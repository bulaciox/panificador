import { cn } from "@/lib/utils";

interface TaskCircleProps {
  completed: boolean;
  /** Hecha justamente el día que se está mirando: se pinta viva, no apagada. */
  fresh: boolean;
  small?: boolean;
  onToggle: () => void;
}

export function TaskCircle({ completed, fresh, small, onToggle }: TaskCircleProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={completed}
      aria-label={completed ? "Marcar como pendiente" : "Marcar como hecha"}
      onClick={onToggle}
      className={cn(
        "grid shrink-0 place-items-center rounded-full border-2 transition-colors",
        small ? "size-[18px]" : "size-[22px]",
        !completed && "border-border bg-transparent hover:border-accent",
        completed && fresh && "border-accent bg-accent",
        completed && !fresh && "border-faded bg-faded",
      )}
    >
      {completed && (
        <span
          className={cn("rounded-full bg-surface", small ? "size-[6px]" : "size-[7px]")}
        />
      )}
    </button>
  );
}
