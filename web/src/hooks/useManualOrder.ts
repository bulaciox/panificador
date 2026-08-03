import { useEffect, useState } from "react";

interface Identifiable {
  id: string;
}

/**
 * Orden manual de una lista: el usuario sube y baja elementos y el nuevo orden se guarda.
 *
 * El orden local manda mientras el conjunto de elementos no cambie, para que la respuesta
 * del servidor no haga saltar las filas justo después de moverlas. Cuando se añade o se
 * borra un elemento, se acepta el orden que venga de fuera.
 */
export function useManualOrder<T extends Identifiable>(
  items: T[],
  onCommit: (orderedIds: string[]) => void,
) {
  const [order, setOrder] = useState<T[]>(items);

  useEffect(() => {
    setOrder((previous) => {
      const sameSet =
        previous.length === items.length &&
        previous.every((item) => items.some((incoming) => incoming.id === item.id));

      if (!sameSet) return items;

      // Mismo conjunto: conservo mi orden y solo refresco los datos de cada fila.
      const merged = previous.map(
        (item) => items.find((incoming) => incoming.id === item.id) ?? item,
      );

      // Devolver el mismo array si nada ha cambiado, o el render entra en bucle.
      return merged.every((item, index) => item === previous[index]) ? previous : merged;
    });
  }, [items]);

  /** Mueve un elemento una posición arriba (-1) o abajo (+1). */
  const move = (id: string, delta: number) => {
    const index = order.findIndex((item) => item.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= order.length) return;

    const next = [...order];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);

    setOrder(next);
    onCommit(next.map((item) => item.id));
  };

  return { order, move };
}
