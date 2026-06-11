"use client";

import { useCallback, useEffect, type FormEvent } from "react";
import { LoadingButton } from "@/components/design-system";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { useFormEngine } from "@/lib/forms/form-engine";
import { erpBtnAccent } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  formToMezzoUpdate,
  gestitoToMezzoForm,
  MezzoFormFields,
} from "@/components/gestionale/mezzi/mezzi-form-fields";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { useMezzoUpdateMutation } from "@/src/hooks/gestionale/use-mezzo-mutations";

const MEZZO_EDIT_FORM_ID = "mezzo-edit-form";

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
  const formEngine = useFormEngine({ initial: gestitoToMezzoForm(mezzo) });
  const { value: form, setValue, reset, runSubmit, formProps } = formEngine;
  const updateMut = useMezzoUpdateMutation();

  useEffect(() => {
    reset(gestitoToMezzoForm(mezzo));
  }, [mezzo.id, mezzo, reset]);

  const setFormStable = useCallback(
    (action: React.SetStateAction<typeof form>) => {
      setValue(action);
    },
    [setValue],
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canEdit || updateMut.isPending) return;

    await runSubmit(e.currentTarget, async (currentForm) => {
      const marca = currentForm.marca.trim();
      if (!marca || !currentForm.cliente.trim()) {
        onValidationError("Compila almeno cliente e marca attrezzatura.");
        return;
      }
      const id = mezzo.id;
      updateMut.mutate(
        { id, data: formToMezzoUpdate(currentForm) },
        {
          onSuccess: () => onSaved(id),
          onError: onSaveError,
        },
      );
    });
  }

  return (
    <GestionaleModalShell
      modalSize="formMedium"
      title="Modifica mezzo"
      titleId="mezzo-edit-title"
      onRequestClose={onClose}
      footer={
        <LoadingButton
          type="submit"
          form={MEZZO_EDIT_FORM_ID}
          loading={updateMut.isPending}
          preset="salva"
          loadingLabel="Salvataggio…"
          className={`${erpBtnAccent} min-h-11 w-full justify-center disabled:opacity-60`}
        >
          Salva modifiche
        </LoadingButton>
      }
    >
      <form
        {...formProps}
        id={MEZZO_EDIT_FORM_ID}
        onSubmit={handleSubmit}
        className={`${gestionaleModalBodyFlexClass} min-h-0 overflow-hidden`}
      >
        <GestionaleModalScrollBody className="space-y-3">
          <MezzoFormFields form={form} setForm={setFormStable} excludeMezzoId={mezzo.id} />
        </GestionaleModalScrollBody>
      </form>
    </GestionaleModalShell>
  );
}
