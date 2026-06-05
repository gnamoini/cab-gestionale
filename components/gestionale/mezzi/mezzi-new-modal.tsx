"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { LoadingButton } from "@/components/design-system";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { gestionaleFormFocusScopeProps } from "@/components/gestionale/gestionale-form-focus-scope";
import { erpBtnAccent } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  formToMezzoInsert,
  getEmptyMezzoForm,
  MezzoFormFields,
} from "@/components/gestionale/mezzi/mezzi-form-fields";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { useMezzoCreateMutation } from "@/src/hooks/gestionale/use-mezzo-mutations";
import type { MezzoRow } from "@/src/types/supabase-tables";

export function MezziNewModal({
  canEdit,
  onClose,
  onCreated,
  onValidationError,
  onSaveError,
}: {
  canEdit: boolean;
  onClose: () => void;
  onCreated: (row: MezzoRow) => void;
  onValidationError: (message: string) => void;
  onSaveError: (err: unknown) => void;
}) {
  const [form, setForm] = useState(getEmptyMezzoForm);
  const createMut = useMezzoCreateMutation();

  useEffect(() => {
    setForm(getEmptyMezzoForm());
  }, []);

  const setFormStable = useCallback(
    (action: React.SetStateAction<typeof form>) => {
      setForm((prev) => (typeof action === "function" ? action(prev) : action));
    },
    [],
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canEdit || createMut.isPending) return;
    const marca = form.marca.trim();
    if (!marca || !form.cliente.trim()) {
      onValidationError("Compila almeno cliente e marca attrezzatura.");
      return;
    }
    createMut.mutate(formToMezzoInsert(form), {
      onSuccess: (row) => {
        setForm(getEmptyMezzoForm());
        onCreated(row);
      },
      onError: onSaveError,
    });
  }

  return (
    <GestionaleModalShell title="Nuovo mezzo" titleId="mezzo-nuovo-title" onRequestClose={onClose}>
      <form {...gestionaleFormFocusScopeProps()} onSubmit={handleSubmit} className={`${gestionaleModalBodyFlexClass} overflow-hidden`}>
        <GestionaleModalScrollBody className="space-y-3">
          <MezzoFormFields form={form} setForm={setFormStable} />
        </GestionaleModalScrollBody>
        <div className="shrink-0 border-t border-[color:var(--cab-border)] p-4">
          <LoadingButton
            type="submit"
            loading={createMut.isPending}
            preset="salva"
            loadingLabel="Salvataggio…"
            className={`${erpBtnAccent} w-full disabled:opacity-60`}
          >
            Salva mezzo
          </LoadingButton>
        </div>
      </form>
    </GestionaleModalShell>
  );
}
