import { createContext, useContext } from "react";

import type { Folder } from "./api";

export interface FolderColor {
  name: string;
  label: string;
  dot: string;
}

/** Las clases van literales para que Tailwind las encuentre al escanear. */
export const FOLDER_COLORS: FolderColor[] = [
  { name: "blue", label: "Azul", dot: "bg-[#3b82f6]" },
  { name: "violet", label: "Violeta", dot: "bg-[#8b5cf6]" },
  { name: "green", label: "Verde", dot: "bg-[#22c55e]" },
  { name: "amber", label: "Ámbar", dot: "bg-[#f59e0b]" },
  { name: "rose", label: "Rosa", dot: "bg-[#f43f5e]" },
  { name: "teal", label: "Turquesa", dot: "bg-[#14b8a6]" },
];

export function colorDot(name: string | undefined): string {
  return FOLDER_COLORS.find((color) => color.name === name)?.dot ?? FOLDER_COLORS[0].dot;
}

/** Color sugerido para la siguiente carpeta: el primero que no esté usado ya. */
export function nextColor(used: string[]): string {
  const free = FOLDER_COLORS.find((color) => !used.includes(color.name));
  return (free ?? FOLDER_COLORS[used.length % FOLDER_COLORS.length]).name;
}

const FoldersContext = createContext<Folder[]>([]);

export const FoldersProvider = FoldersContext.Provider;

export function useFolderList(): Folder[] {
  return useContext(FoldersContext);
}
