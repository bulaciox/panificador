import { useState } from "react";
import { Loader2, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface LoginScreenProps {
  onEntered: () => void;
}

/** Pantalla de acceso: una sola contraseña, la que hay en APP_PASSWORD en el servidor. */
export function LoginScreen({ onEntered }: LoginScreenProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.login(password);
      onEntered();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se ha podido entrar.");
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-5">
      <div className="w-full max-w-xs">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid size-10 place-items-center rounded-xl bg-muted">
            <Lock className="size-4 text-muted-foreground" />
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight">Panificador</h1>
          <p className="text-[13px] text-muted-foreground">
            Escribe la contraseña para entrar.
          </p>
        </div>

        <input
          autoFocus
          type="password"
          value={password}
          placeholder="Contraseña"
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && submit()}
          className="mb-2 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-[15px] outline-none transition-colors focus:border-accent"
        />

        {error && <p className="mb-2 text-[13px] text-danger">{error}</p>}

        <Button className="w-full" onClick={submit} disabled={!password || busy}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          Entrar
        </Button>
      </div>
    </div>
  );
}
