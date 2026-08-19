import { useEffect, useRef, useState } from "react";

/**
 * Tamaño real de un elemento (alto y ancho). Devuelve un ref normal, así el mismo
 * nodo se puede usar además para leer/ajustar scrollTop (agenda con zoom).
 */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    setSize({ width: node.clientWidth, height: node.clientHeight });
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width: size.width, height: size.height };
}
