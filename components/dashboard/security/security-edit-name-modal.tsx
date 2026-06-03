"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/design-system/modal";
import { dsBtnGhost, dsBtnPrimary, dsInput, dsSectionTitle } from "@/lib/ui/design-system";

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

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!pending) onClose();
      }}
      title="Modifica nome"
      footer={
        <>
          <button type="button" className={dsBtnGhost} onClick={onClose} disabled={pending}>
            Annulla
          </button>
          <button
            type="submit"
            form="security-edit-name-form"
            className={dsBtnPrimary}
            disabled={pending || !nome.trim()}
          >
            {pending ? "Salvataggio…" : "Applica"}
          </button>
        </>
      }
    >
      <form
        id="security-edit-name-form"
        className="flex min-w-0 flex-col gap-3"
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
      </form>
    </Modal>
  );
}
