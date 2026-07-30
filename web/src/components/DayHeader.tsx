import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { longLabel, shiftIso, subLabel, todayIso } from "@/lib/dates";

interface DayHeaderProps {
  date: string;
  onChange: (date: string) => void;
  /** Controles de la vista (el orden), a la izquierda de las flechas de día. */
  action?: React.ReactNode;
}

/** Cabecera del día, con saltos discretos para revisar ayer o mañana. */
export function DayHeader({ date, onChange, action }: DayHeaderProps) {
  const today = todayIso();

  return (
    <div className="mb-5 flex items-end gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="text-[26px] font-semibold tracking-tight">{longLabel(date)}</h1>
        <p className="text-[13px] text-muted-foreground">{subLabel(date)}</p>
      </div>

      <div className="flex items-center gap-1">
        {action}
        {date !== today && (
          <Button variant="subtle" size="sm" onClick={() => onChange(today)}>
            Volver a hoy
          </Button>
        )}
        <Button
          variant="outline"
          size="icon"
          title="Día anterior"
          onClick={() => onChange(shiftIso(date, -1))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          title="Día siguiente"
          onClick={() => onChange(shiftIso(date, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
