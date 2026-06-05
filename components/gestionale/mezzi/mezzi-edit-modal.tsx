"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { LoadingButton } from "@/components/design-system";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { gestionaleFormFocusScopeProps } from "@/components/gestionale/gestionale-form-focus-scope";
import { erpBtnAccent } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  formToMezzoUpdate,
  gestitoToMezzoForm,
  MezzoFormFields,
} from "@/components/gestionale/mezzi/mezzi-form-fields";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { useMezzoUpdateMutation } from "@/src/hooks/gestionale/use-mezzo-mutations";

export function MezziEditModal({
  mezzo,
  canEdit,
  onClose,
  onSaved,
  onValidationError,
  onSaveError,
}: {
  mezzo: MezzoGestito;
  canEdit: boolean;
  onClose: () => void;
  onSaved: (id: string) => void;
  onValidationError: (message: string) => void;
  onSaveError: (err: unknown) => void;
}) {
  const [form, setForm] = useState(() => gestitoToMezzoForm(mezzo));
  const updateMut = useMezzoUpdateMutation();

  useEffect(() => {
    setForm(gestitoToMezzoForm(mezzo));
  }, [mezzo.id, mezzo]);

  const setFormStable = useCallback(
    (action: React.SetStateAction<typeof form>) => {
      setForm((prev) => (typeof action === "function" ? action(prev) : action));
    },
    [],
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canEdit || updateMut.isPending) return;
    const marca = form.marca.trim();
    if (!marca || !form.cliente.trim()) {
      onValidationError("Compila almeno cliente e marca attrezzatura.");
      return;
    }
    const id = mezzo.id;
    updateMut.mutate(
      { id, data: formToMezzoUpdate(form) },
      {
        onSuccess: () => onSaved(id),
        onError: onSaveError,
      },
    );
  }

  return (
    <GestionaleModalShell title="Modifica mezzo" titleId="mezzo-edit-title" onRequestClose={onClose}>
      <form {...gestionaleFormFocusScopeProps()} onSubmit={handleSubmit} className={`${gestionaleModalBodyFlexClass} overflow-hidden`}>
        <GestionaleModalScrollBody className="space-y-3">
          <MezzoFormFields form={form} setForm={setFormStable} excludeMezzoId={mezzo.id} />
        </GestionaleModalScrollBody>
        <div className="shrink-0 border-t border-[color:var(--cab-border)] p-4">
          <LoadingButton
            type="submit"
            loading={updateMut.isPending}
            preset="salva"
            loadingLabel="Salvataggio…"
            className={`${erpBtnAccent} w-full disabled:opacity-60`}
          >
            Salva modifiche
          </LoadingButton>
        </div>
      </form>
    </GestionaleModalShell>
  );
}
