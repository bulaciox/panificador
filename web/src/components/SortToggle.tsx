import { ArrowDownWideNarrow } from "lucide-react";

import { Button } from "@/components/ui/button";

interface SortToggleProps {
  sortByPriority: boolean;
  onToggle: () => void;
}

/** Alterna entre el orden manual y el orden por prioridad. Vive en la fila del título. */
export function SortToggle({ sortByPriority, onToggle }: SortToggleProps) {
  return (
    <Button
      variant={sortByPriority ? "subtle" : "ghost"}
      size="sm"
      title={
        sortByPriority
          ? "Ordenando por prioridad: pulsa para volver al orden manual"
          : "Orden manual: pulsa para ordenar por prioridad"
      }
      onClick={onToggle}
    >
      <ArrowDownWideNarrow className="size-4" />
      {sortByPriority ? "Prioridad" : "Orden"}
    </Button>
  );
}
