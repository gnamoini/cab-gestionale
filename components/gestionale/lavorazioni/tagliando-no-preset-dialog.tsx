"use client";

import { useState } from "react";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import { LoadingButton } from "@/components/design-system";
import { dsBtnNeutral, dsBtnPrimary, dsFormField, dsFormLabel } from "@/lib/ui/design-system";

export type TagliandoNoPresetChoice = "complete" | "assign" | "cancel";

export function TagliandoNoPresetDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (choice: TagliandoNoPresetChoice, reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [choice, setChoice] = useState<TagliandoNoPresetChoice>("complete");

  if (!open) return null;

  return (
    <GestionaleModalShell onRequestClose={onClose} title="Preset manutenzione assente" modalSize="formSmall">
      <p className="text-sm text-[var(--erp-text-muted)]">
        Questo mezzo non possiede un preset manutenzione configurato.
      </p>
      <div className={dsFormField}>
        <label className={dsFormLabel} htmlFor="tagliando-no-preset-reason">
          Motivo (obbligatorio per completare)
        </label>
        <GestionaleTextarea
          id="tagliando-no-preset-reason"
          value={reason}
          onChange={setReason}
          rows={3}
          placeholder="Es. tagliando occasionale, preset non ancora definito…"
        />
      </div>
      <div className="space-y-1 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="no-preset-choice"
            checked={choice === "complete"}
            onChange={() => setChoice("complete")}
          />
          Completare comunque
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="no-preset-choice"
            checked={choice === "assign"}
            onChange={() => setChoice("assign")}
          />
          Assegnare un preset ora
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="no-preset-choice"
            checked={choice === "cancel"}
            onChange={() => setChoice("cancel")}
          />
          Annullare
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className={dsBtnNeutral} onClick={onClose}>
          Chiudi
        </button>
        <LoadingButton
          className={dsBtnPrimary}
          onClick={() => {
            if (choice === "complete" && !reason.trim()) return;
            onConfirm(choice, reason.trim());
          }}
          disabled={choice === "complete" && !reason.trim()}
        >
          Conferma
        </LoadingButton>
      </div>
    </GestionaleModalShell>
  );
}
