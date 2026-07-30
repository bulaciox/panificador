import { useState } from "react";

interface InlineComposerProps {
  placeholder: string;
  onSubmit: (title: string) => void;
  onCancel: () => void;
}

/** Input pequeño para añadir subtareas sin salir de la lista. */
export function InlineComposer({ placeholder, onSubmit, onCancel }: InlineComposerProps) {
  const [value, setValue] = useState("");

  const submit = () => {
    const title = value.trim();
    if (!title) {
      onCancel();
      return;
    }
    onSubmit(title);
    setValue("");
  };

  return (
    <div className="flex items-center gap-3 px-2 py-[7px]">
      <span className="size-[18px] shrink-0 rounded-full border-2 border-dashed border-border" />
      <input
        autoFocus
        value={value}
        placeholder={placeholder}
        onChange={(event) => setValue(event.target.value)}
        onBlur={submit}
        onKeyDown={(event) => {
          if (event.key === "Enter") submit();
          if (event.key === "Escape") onCancel();
        }}
        className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faded"
      />
    </div>
  );
}
