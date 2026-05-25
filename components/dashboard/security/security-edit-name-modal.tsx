"use client";

import { useEffect, useState } from "react";
import { CloseButton } from "@/components/design-system";
import { dsBtnGhost, dsBtnPrimary, dsInput, dsModalBackdrop, dsModalPanel, dsSectionTitle } from "@/lib/ui/design-system";

type Props = {
  open: boolean;
  initialNome: string;
  pending?: boolean;
  onClose: () => void;
  onSave: (nome: string) => void;
};

export function SecurityEditNameModal({ open, initialNome, pending, onClose, onSave }: Props) {
  const [nome, setNome] = useState(initialNome);

  useEffect(() => {
    if (open) setNome(initialNome);
  }, [open, initialNome]);

  if (!open) return null;

  return (
    <div className={dsModalBackdrop} role="presentation">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Chiudi" onClick={() => !pending && onClose()} />
      <div
        className={`relative z-[1] ${dsModalPanel} max-w-md`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="security-edit-name-title"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="security-edit-name-title" className="text-base font-semibold text-[color:var(--cab-text)]">
            Modifica nome
          </h2>
          <CloseButton onClick={() => !pending && onClose()} disabled={pending} />
        </div>
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const t = nome.trim();
            if (!t || pending) return;
            onSave(t);
          }}
        >
          <label className="block min-w-0">
            <span className={dsSectionTitle}>Nome visualizzato</span>
            <input
              className={`${dsInput} mt-1 w-full`}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoComplete="name"
              required
              disabled={pending}
              autoFocus
            />
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={dsBtnGhost} onClick={onClose} disabled={pending}>
              Annulla
            </button>
            <button type="submit" className={dsBtnPrimary} disabled={pending || !nome.trim()}>
              {pending ? "Salvataggio…" : "Applica"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
