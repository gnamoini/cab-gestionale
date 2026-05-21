"use client";

import { useCallback, useState } from "react";
import { dsBtnPrimary, dsLabel, dsTextarea } from "@/lib/ui/design-system";

export function SupportoNoteForm({
  authorName,
  onAdd,
  disabled,
  saving,
}: {
  authorName: string;
  onAdd: (body: string) => void | Promise<void>;
  disabled?: boolean;
  saving?: boolean;
}) {
  const [body, setBody] = useState("");

  const submit = useCallback(() => {
    const t = body.trim();
    if (!t || disabled || saving) return;
    void Promise.resolve(onAdd(t)).then(() => setBody(""));
  }, [body, disabled, onAdd, saving]);

  return (
    <div className="flex flex-col gap-3">
      <label className={`block ${dsLabel}`}>
        Nota
        <textarea
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Segnala un problema, un’idea, un promemoria o un miglioramento…"
          disabled={disabled || saving}
          className={`mt-1.5 ${dsTextarea}`}
          aria-label="Testo nota"
        />
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Autore: <span className="font-semibold text-zinc-700 dark:text-zinc-200">{authorName}</span>
          <span className="mt-1 block text-[11px] text-zinc-400 dark:text-zinc-500">
            Le note sono condivise con tutti gli utenti autorizzati e salvate nel database.
          </span>
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={disabled || saving || !body.trim()}
          className={`${dsBtnPrimary} w-full justify-center sm:w-auto`}
        >
          {saving ? "Salvataggio…" : "Aggiungi"}
        </button>
      </div>
    </div>
  );
}
