import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Ancho real del contenedor, no el de la ventana: es lo que importa para decidir cuántas
 * columnas caben, porque la barra lateral aparece y desaparece según el tamaño.
 */
export function useContainerWidth<T extends HTMLElement>() {
  const observer = useRef<ResizeObserver | null>(null);
  const [width, setWidth] = useState(0);

  // Callback ref: así se mide también si el nodo aparece más tarde (al terminar de cargar).
  const ref = useCallback((node: T | null) => {
    observer.current?.disconnect();
    if (!node) return;

    setWidth(node.getBoundingClientRect().width);
    observer.current = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.current.observe(node);
  }, []);

  useEffect(() => () => observer.current?.disconnect(), []);

  return { ref, width };
}
