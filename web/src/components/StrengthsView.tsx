import { useState } from "react";
import { Shield, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { StrengthActions } from "@/hooks/useStrengths";
import type { StrengthFeed, StrengthLabel, StrengthNote } from "@/lib/api";
import { longLabel, shiftIso, timeLabel, todayIso } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface StrengthsViewProps {
  feed: StrengthFeed | undefined;
  isLoading: boolean;
  actions: StrengthActions;
}

/**
 * Bitácora de momentos en los que has sido fuerte, agrupada por día. La idea es escribir hoy
 * y, al ver los días anteriores debajo, no querer dejar el día en blanco.
 */
export function StrengthsView({ feed, isLoading, actions }: StrengthsViewProps) {
  if (isLoading && !feed) {
    return <p className="px-2 py-8 text-sm text-muted-foreground">Cargando…</p>;
  }

  const days = feed?.days ?? [];
  const labels = feed?.labels ?? [];

  return (
    <div>
      <Composer
        labels={labels}
        onAdd={(text, label) => actions.create.mutate({ text, label })}
      />

      {days.length === 0 ? (
        <div className="px-2 py-12 text-center">
          <Shield className="mx-auto mb-3 size-6 text-faded" />
          <p className="text-sm text-muted-foreground">
            Aquí se van guardando los momentos en los que fuiste fuerte.
          </p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-faded">
            Da igual lo pequeño que parezca: no abrir algo que no querías abrir, ir al gimnasio
            sin ganas, decir en voz alta lo que no te gustó. Escríbelo arriba.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {days.map((day) => (
            <section key={day.date}>
              <div className="mb-1 flex items-baseline gap-2 px-2">
                <h2
                  className={cn(
                    "text-[13px] font-semibold",
                    day.date === todayIso() ? "text-accent" : "text-foreground",
                  )}
                >
                  {longLabel(day.date)}
                </h2>
                <span className="text-[11px] text-faded">
                  {day.notes.length === 1 ? "1 momento" : `${day.notes.length} momentos`}
                </span>
              </div>

              <ul>
                {day.notes.map((note) => (
                  <NoteRow key={note.id} note={note} actions={actions} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/** Racha de días seguidos con al menos un momento apuntado, contando desde hoy o ayer. */
export function strengthStreak(feed: StrengthFeed | undefined): number {
  if (!feed || feed.days.length === 0) return 0;

  const dates = new Set(feed.days.map((day) => day.date));

  // Con shiftIso, no con Date: toISOString pasa a UTC y desplazaría el día.
  let cursor = todayIso();

  // Si hoy aún no hay nada, la racha puede seguir viva desde ayer.
  if (!dates.has(cursor)) cursor = shiftIso(cursor, -1);

  let streak = 0;
  while (dates.has(cursor)) {
    streak += 1;
    cursor = shiftIso(cursor, -1);
  }

  return streak;
}

function Composer({
  labels,
  onAdd,
}: {
  labels: StrengthLabel[];
  onAdd: (text: string, label: string | null) => void;
}) {
  const [text, setText] = useState("");
  const [label, setLabel] = useState<string | null>(null);
  const [creatingLabel, setCreatingLabel] = useState(false);

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    onAdd(value, label);
    setText("");
    // La etiqueta se conserva: normalmente se apuntan varias cosas del mismo tema seguidas.
  };

  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 transition-colors focus-within:border-accent">
      <div className="flex items-center gap-2">
        <Shield className="size-4 shrink-0 text-faded" />
        <input
          value={text}
          placeholder="¿En qué has sido fuerte hoy?"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && submit()}
          className="min-w-0 flex-1 bg-transparent py-1 text-[15px] outline-none placeholder:text-faded"
        />
        <Button size="sm" onClick={submit} disabled={!text.trim()}>
          Añadir
        </Button>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-1 pl-6">
        {labels.map((item) => (
          <LabelChip
            key={item.name}
            name={item.name}
            selected={label === item.name}
            onClick={() => setLabel(label === item.name ? null : item.name)}
          />
        ))}

        {creatingLabel ? (
          <input
            autoFocus
            placeholder="nueva etiqueta"
            onBlur={(event) => {
              const value = event.target.value.trim();
              if (value) setLabel(value);
              setCreatingLabel(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") setCreatingLabel(false);
            }}
            className="w-28 rounded-full border border-accent bg-transparent px-2 py-0.5 text-[11px] outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setCreatingLabel(true)}
            className="rounded-full px-2 py-0.5 text-[11px] text-faded hover:text-foreground"
          >
            + etiqueta
          </button>
        )}

        {label && !labels.some((item) => item.name === label) && (
          <LabelChip name={label} selected onClick={() => setLabel(null)} />
        )}
      </div>
    </div>
  );
}

function LabelChip({
  name,
  selected,
  onClick,
}: {
  name: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] transition-colors",
        selected
          ? "bg-accent/15 font-medium text-accent"
          : "bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      {name}
      {selected && <X className="size-2.5" />}
    </button>
  );
}

function NoteRow({ note, actions }: { note: StrengthNote; actions: StrengthActions }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.text);

  const save = () => {
    const value = draft.trim();
    setEditing(false);
    if (!value || value === note.text) {
      setDraft(note.text);
      return;
    }
    actions.update.mutate({ id: note.id, input: { text: value } });
  };

  return (
    <li className="group flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60">
      <span className="w-9 shrink-0 pt-0.5 text-[11px] tabular-nums text-faded">
        {timeLabel(note.createdAt)}
      </span>

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === "Enter") save();
            if (event.key === "Escape") {
              setDraft(note.text);
              setEditing(false);
            }
          }}
          className="min-w-0 flex-1 border-b border-accent bg-transparent pb-px text-[15px] outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="min-w-0 flex-1 text-left text-[15px] leading-snug"
        >
          {note.text}
        </button>
      )}

      {note.label && (
        <span className="mt-0.5 shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
          {note.label}
        </span>
      )}

      <Button
        variant="ghost"
        size="iconSm"
        title="Eliminar"
        onClick={() => actions.remove.mutate(note.id)}
        className="shrink-0 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </li>
  );
}
