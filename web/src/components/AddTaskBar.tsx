import { useState } from "react";
import { Flag, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckIcon,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Priority, type PriorityValue } from "@/lib/api";
import { PRIORITY_META, PRIORITY_ORDER } from "@/lib/priority";
import { cn } from "@/lib/utils";

interface AddTaskBarProps {
  placeholder?: string;
  onAdd: (title: string, priority: PriorityValue) => void;
}

export function AddTaskBar({ placeholder = "Añadir una tarea…", onAdd }: AddTaskBarProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<PriorityValue>(Priority.None);

  const submit = () => {
    const value = title.trim();
    if (!value) return;
    onAdd(value, priority);
    setTitle("");
    setPriority(Priority.None);
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 transition-colors focus-within:border-accent">
      <Plus className="size-4 shrink-0 text-faded" />
      <input
        value={title}
        placeholder={placeholder}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && submit()}
        className="min-w-0 flex-1 bg-transparent py-1 text-[15px] outline-none placeholder:text-faded"
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="iconSm" title="Prioridad">
            <Flag
              className={cn(
                "size-4",
                priority > 0 ? PRIORITY_META[priority].text : "text-faded",
              )}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Prioridad</DropdownMenuLabel>
          {PRIORITY_ORDER.map((value) => (
            <DropdownMenuItem key={value} onSelect={() => setPriority(value)}>
              <span className={cn("size-2 rounded-full", PRIORITY_META[value].dot)} />
              {PRIORITY_META[value].short}
              <DropdownMenuCheckIcon checked={priority === value} />
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button size="sm" onClick={submit} disabled={!title.trim()}>
        Añadir
      </Button>
    </div>
  );
}
