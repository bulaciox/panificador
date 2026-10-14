import { useState } from "react";
import {
  Archive,
  BarChart3,
  CalendarClock,
  Check,
  CircleDot,
  Eye,
  EyeOff,
  Flame,
  Folder as FolderIcon,
  Hourglass,
  Moon,
  MoreHorizontal,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Shield,
  Sun,
  Sunrise,
  Trash2,
  X,
} from "lucide-react";

import type { Theme } from "@/App";
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
  | { kind: "stale" }
  | { kind: "archive" }
  | { kind: "folder"; id: string }
  | { kind: "habits" }
  | { kind: "strengths" }
  | { kind: "analytics" };

interface SidebarProps {
  view: View;
  onSelect: (view: View) => void;
  folders: Folder[];
  counts: Counts | undefined;
  folderActions: FolderActions;
  theme: Theme;
  onSetTheme: (theme: Theme) => void;
  open: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  view,
  onSelect,
  folders,
  counts,
  folderActions,
  theme,
  onSetTheme,
  open,
  onClose,
  collapsed = false,
  onToggleCollapse,
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
          "fixed inset-y-0 left-0 z-30 flex shrink-0 flex-col border-r border-border bg-background shadow-xl transition-[width,transform] duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 md:bg-muted/40 md:shadow-none",
          open ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-60 md:w-14" : "w-60 md:w-60",
        )}
      >
        <div className={cn("flex items-center gap-2 px-4 py-4", collapsed && "md:justify-center md:px-2")}>
          <span className={cn("flex-1 text-[15px] font-semibold tracking-tight truncate", collapsed && "md:hidden")}>
            Panificador
          </span>
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
            collapsed={collapsed}
            onClick={() => onSelect({ kind: "today" })}
          />
          <NavItem
            icon={<CalendarClock className="size-4" />}
            label="Futuras"
            count={counts?.upcoming}
            active={view.kind === "upcoming"}
            collapsed={collapsed}
            onClick={() => onSelect({ kind: "upcoming" })}
          />
          <NavItem
            icon={<Hourglass className="size-4" />}
            label="Antiguas"
            count={counts?.stale}
            active={view.kind === "stale"}
            collapsed={collapsed}
            onClick={() => onSelect({ kind: "stale" })}
          />
          <NavItem
            icon={<Archive className="size-4" />}
            label="Archivo"
            count={counts?.archived}
            muted
            active={view.kind === "archive"}
            collapsed={collapsed}
            onClick={() => onSelect({ kind: "archive" })}
          />

          {/* Hábitos y Fortalezas no son tareas, pero viven en el mismo menú: tras un hueco. */}
          <NavItem
            icon={<Flame className="size-4" />}
            label="Hábitos"
            count={undefined}
            className="mt-2"
            active={view.kind === "habits"}
            collapsed={collapsed}
            onClick={() => onSelect({ kind: "habits" })}
          />
          <NavItem
            icon={<Shield className="size-4" />}
            label="Fortalezas"
            count={undefined}
            active={view.kind === "strengths"}
            collapsed={collapsed}
            onClick={() => onSelect({ kind: "strengths" })}
          />
          <NavItem
            icon={<BarChart3 className="size-4" />}
            label="Análisis"
            count={undefined}
            active={view.kind === "analytics"}
            collapsed={collapsed}
            onClick={() => onSelect({ kind: "analytics" })}
          />
        </nav>

        {collapsed && <div className="my-2 hidden md:block border-t border-border mx-2" />}

        <div className={cn("mt-6 flex items-center gap-1 px-4 pb-1", collapsed && "md:hidden")}>
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
                  collapsed={collapsed}
                  onSelect={() => onSelect({ kind: "folder", id: folder.id })}
                  onRename={() => setRenaming(folder.id)}
                  onColor={(color) =>
                    folderActions.update.mutate({ id: folder.id, input: { color } })
                  }
                  onToggleExclude={() =>
                    folderActions.update.mutate({
                      id: folder.id,
                      input: { isExcluded: !folder.isExcluded },
                    })
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
              <p className={cn("px-2 py-1 text-[12px] text-faded", collapsed && "md:hidden")}>
                Crea carpetas para separar temas: casa, trabajo, recados…
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-border p-2 flex flex-col gap-1.5">
          {collapsed ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center px-0"
                  title={
                    theme === "dark"
                      ? "Tema oscuro"
                      : theme === "gray"
                        ? "Tema gris"
                        : "Tema claro"
                  }
                >
                  {theme === "dark" ? (
                    <Moon className="size-4" />
                  ) : theme === "gray" ? (
                    <CircleDot className="size-4 text-accent" />
                  ) : (
                    <Sun className="size-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-36">
                <DropdownMenuItem onClick={() => onSetTheme("light")}>
                  <Sun className="mr-2 size-4" />
                  <span>Claro</span>
                  {theme === "light" && <Check className="ml-auto size-3.5" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSetTheme("gray")}>
                  <CircleDot className="mr-2 size-4" />
                  <span>Gris</span>
                  {theme === "gray" && <Check className="ml-auto size-3.5" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSetTheme("dark")}>
                  <Moon className="mr-2 size-4" />
                  <span>Oscuro</span>
                  {theme === "dark" && <Check className="ml-auto size-3.5" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="px-1 text-[10px] font-semibold uppercase tracking-wider text-faded">
                Tema
              </span>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted/60 p-1 border border-border/50">
                <button
                  type="button"
                  onClick={() => onSetTheme("light")}
                  className={cn(
                    "flex items-center justify-center gap-1 rounded-md py-1 text-[11px] font-medium transition-all cursor-pointer",
                    theme === "light"
                      ? "bg-surface text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  title="Tema claro"
                >
                  <Sun className="size-3.5" />
                  <span>Claro</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSetTheme("gray")}
                  className={cn(
                    "flex items-center justify-center gap-1 rounded-md py-1 text-[11px] font-medium transition-all cursor-pointer",
                    theme === "gray"
                      ? "bg-surface text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  title="Tema gris intermedio"
                >
                  <CircleDot className="size-3.5" />
                  <span>Gris</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSetTheme("dark")}
                  className={cn(
                    "flex items-center justify-center gap-1 rounded-md py-1 text-[11px] font-medium transition-all cursor-pointer",
                    theme === "dark"
                      ? "bg-surface text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  title="Tema oscuro"
                >
                  <Moon className="size-3.5" />
                  <span>Oscuro</span>
                </button>
              </div>
            </div>
          )}

          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "hidden md:flex w-full items-center gap-2",
                collapsed ? "justify-center px-0" : "justify-start px-3",
              )}
              onClick={onToggleCollapse}
              title={collapsed ? "Expandir barra lateral" : "Minimizar barra lateral"}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
              <span className={cn(collapsed && "md:hidden")}>
                Minimizar
              </span>
            </Button>
          )}
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
  collapsed,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number | undefined;
  active: boolean;
  muted?: boolean;
  className?: string;
  collapsed?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg text-left text-[14px] transition-colors",
        collapsed ? "px-2.5 py-1.5 md:px-0 md:justify-center" : "px-2.5 py-1.5",
        active ? "bg-surface font-medium text-foreground shadow-sm" : "hover:bg-muted",
        !active && "text-muted-foreground",
        className,
      )}
    >
      <span className={cn(active && !muted && "text-accent")}>{icon}</span>
      <span className={cn("flex-1 truncate", collapsed && "md:hidden")}>{label}</span>
      {count !== undefined && count > 0 && (
        <span className={cn("text-[12px] tabular-nums text-faded", collapsed && "md:hidden")}>{count}</span>
      )}
    </button>
  );
}

function FolderItem({
  folder,
  active,
  collapsed,
  onSelect,
  onRename,
  onColor,
  onDelete,
  onToggleExclude,
}: {
  folder: Folder;
  active: boolean;
  collapsed?: boolean;
  onSelect: () => void;
  onRename: () => void;
  onColor: (color: string) => void;
  onDelete: () => void;
  onToggleExclude: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center rounded-lg transition-colors",
        collapsed ? "pr-0 md:justify-center" : "pr-1",
        active ? "bg-surface shadow-sm" : "hover:bg-muted",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={folder.name}
        title={folder.name + (folder.isExcluded ? " (excluida de Hoy/Futuras)" : "")}
        className={cn(
          "flex min-w-0 items-center gap-2.5 text-left text-[14px]",
          collapsed
            ? "flex-1 px-2.5 py-1.5 md:flex-initial md:px-0 md:py-2 md:justify-center"
            : "flex-1 px-2.5 py-1.5",
        )}
      >
        <span className={cn("size-2.5 shrink-0 rounded-full", colorDot(folder.color))} />
        <span
          className={cn(
            "flex-1 truncate",
            active ? "font-medium text-foreground" : "text-muted-foreground",
            folder.isExcluded && "opacity-60 italic",
            collapsed && "md:hidden",
          )}
        >
          {folder.name}
        </span>
        {folder.isExcluded && (
          <span title="Excluida de Hoy y Futuras" className={cn("inline-flex shrink-0", collapsed && "md:hidden")}>
            <EyeOff className="size-3 text-faded" />
          </span>
        )}
        {folder.pending > 0 && (
          <span className={cn("text-[12px] tabular-nums text-faded", collapsed && "md:hidden")}>
            {folder.pending}
          </span>
        )}
      </button>

      <div className={cn(collapsed && "md:hidden")}>
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
            <DropdownMenuItem onSelect={onToggleExclude}>
              {folder.isExcluded ? <Eye /> : <EyeOff />}
              {folder.isExcluded ? "Incluir en Hoy y Futuras" : "Excluir de Hoy y Futuras"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="danger" onSelect={onDelete}>
              <Trash2 />
              Eliminar carpeta
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
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
