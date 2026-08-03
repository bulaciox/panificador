import { useState } from "react";
import {
  Archive,
  CalendarClock,
  Flame,
  Folder as FolderIcon,
  Moon,
  MoreHorizontal,
  Palette,
  Pencil,
  Plus,
  Shield,
  Sun,
  Sunrise,
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
import type { FolderActions } from "@/hooks/useTasks";
import type { Counts, Folder } from "@/lib/api";
import { colorDot, FOLDER_COLORS, nextColor } from "@/lib/folders";
import { cn } from "@/lib/utils";

export type View =
  | { kind: "today" }
  | { kind: "upcoming" }
  | { kind: "archive" }
  | { kind: "folder"; id: string }
  | { kind: "habits" }
  | { kind: "strengths" };

interface SidebarProps {
  view: View;
  onSelect: (view: View) => void;
  folders: Folder[];
  counts: Counts | undefined;
  folderActions: FolderActions;
  dark: boolean;
  onToggleTheme: () => void;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({
  view,
  onSelect,
  folders,
  counts,
  folderActions,
  dark,
  onToggleTheme,
  open,
  onClose,
}: SidebarProps) {
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          // Superpuesto necesita fondo opaco y sombra; ya fijo al lado, el tinte translúcido.
          "fixed inset-y-0 left-0 z-30 flex w-60 shrink-0 flex-col border-r border-border bg-background shadow-xl transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 md:bg-muted/40 md:shadow-none",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2 px-4 py-4">
          <span className="flex-1 text-[15px] font-semibold tracking-tight">Panificador</span>
          <Button variant="ghost" size="iconSm" className="md:hidden" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <nav className="flex flex-col gap-0.5 px-2">
          <NavItem
            icon={<Sunrise className="size-4" />}
            label="Hoy"
            count={counts?.today}
            active={view.kind === "today"}
            onClick={() => onSelect({ kind: "today" })}
          />
          <NavItem
            icon={<CalendarClock className="size-4" />}
            label="Futuras"
            count={counts?.upcoming}
            active={view.kind === "upcoming"}
            onClick={() => onSelect({ kind: "upcoming" })}
          />
          <NavItem
            icon={<Archive className="size-4" />}
            label="Archivo"
            count={counts?.archived}
            muted
            active={view.kind === "archive"}
            onClick={() => onSelect({ kind: "archive" })}
          />

          {/* Hábitos y Fortalezas no son tareas, pero viven en el mismo menú: tras un hueco. */}
          <NavItem
            icon={<Flame className="size-4" />}
            label="Hábitos"
            count={undefined}
            className="mt-2"
            active={view.kind === "habits"}
            onClick={() => onSelect({ kind: "habits" })}
          />
          <NavItem
            icon={<Shield className="size-4" />}
            label="Fortalezas"
            count={undefined}
            active={view.kind === "strengths"}
            onClick={() => onSelect({ kind: "strengths" })}
          />
        </nav>

        <div className="mt-6 flex items-center gap-1 px-4 pb-1">
          <span className="flex-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Carpetas
          </span>
          <Button
            variant="ghost"
            size="iconSm"
            title="Nueva carpeta"
            onClick={() => setCreating(true)}
          >
            <Plus className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          <div className="flex flex-col gap-0.5">
            {folders.map((folder) =>
              renaming === folder.id ? (
                <FolderNameInput
                  key={folder.id}
                  defaultValue={folder.name}
                  onDone={(value) => {
                    setRenaming(null);
                    if (value && value !== folder.name) {
                      folderActions.update.mutate({ id: folder.id, input: { name: value } });
                    }
                  }}
                />
              ) : (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  active={view.kind === "folder" && view.id === folder.id}
                  onSelect={() => onSelect({ kind: "folder", id: folder.id })}
                  onRename={() => setRenaming(folder.id)}
                  onColor={(color) =>
                    folderActions.update.mutate({ id: folder.id, input: { color } })
                  }
                  onDelete={() => {
                    folderActions.remove.mutate(folder.id);
                    if (view.kind === "folder" && view.id === folder.id) {
                      onSelect({ kind: "today" });
                    }
                  }}
                />
              ),
            )}

            {creating && (
              <FolderNameInput
                defaultValue=""
                onDone={(value) => {
                  setCreating(false);
                  if (!value) return;
                  folderActions.create.mutate(
                    { name: value, color: nextColor(folders.map((f) => f.color)) },
                    { onSuccess: (folder) => onSelect({ kind: "folder", id: folder.id }) },
                  );
                }}
              />
            )}

            {folders.length === 0 && !creating && (
              <p className="px-2 py-1 text-[12px] text-faded">
                Crea carpetas para separar temas: casa, trabajo, recados…
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={onToggleTheme}
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            {dark ? "Tema claro" : "Tema oscuro"}
          </Button>
        </div>
      </aside>
    </>
  );
}

function NavItem({
  icon,
  label,
  count,
  active,
  muted,
  className,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number | undefined;
  active: boolean;
  muted?: boolean;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[14px] transition-colors",
        active ? "bg-surface font-medium text-foreground shadow-sm" : "hover:bg-muted",
        !active && "text-muted-foreground",
        className,
      )}
    >
      <span className={cn(active && !muted && "text-accent")}>{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[12px] tabular-nums text-faded">{count}</span>
      )}
    </button>
  );
}

function FolderItem({
  folder,
  active,
  onSelect,
  onRename,
  onColor,
  onDelete,
}: {
  folder: Folder;
  active: boolean;
  onSelect: () => void;
  onRename: () => void;
  onColor: (color: string) => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center rounded-lg pr-1 transition-colors",
        active ? "bg-surface shadow-sm" : "hover:bg-muted",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={folder.name}
        className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-1.5 text-left text-[14px]"
      >
        <span className={cn("size-2.5 shrink-0 rounded-full", colorDot(folder.color))} />
        <span
          className={cn(
            "flex-1 truncate",
            active ? "font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          {folder.name}
        </span>
        {folder.pending > 0 && (
          <span className="text-[12px] tabular-nums text-faded">{folder.pending}</span>
        )}
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="iconSm"
            className="opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
            title="Opciones de la carpeta"
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
              {FOLDER_COLORS.map((color) => (
                <DropdownMenuItem key={color.name} onSelect={() => onColor(color.name)}>
                  <span className={cn("size-2.5 rounded-full", color.dot)} />
                  {color.label}
                  <DropdownMenuCheckIcon checked={folder.color === color.name} />
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="danger" onSelect={onDelete}>
            <Trash2 />
            Eliminar carpeta
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Al borrar una carpeta sus tareas no se pierden: se quedan sin carpeta. */
function FolderNameInput({
  defaultValue,
  onDone,
}: {
  defaultValue: string;
  onDone: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-surface px-2.5 py-1.5">
      <FolderIcon className="size-3.5 shrink-0 text-faded" />
      <input
        autoFocus
        value={value}
        placeholder="Nombre de la carpeta"
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => onDone(value.trim())}
        onKeyDown={(event) => {
          if (event.key === "Enter") onDone(value.trim());
          if (event.key === "Escape") onDone("");
        }}
        className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-faded"
      />
    </div>
  );
}
