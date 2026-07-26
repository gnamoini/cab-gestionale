"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { LoadingButton } from "@/components/design-system";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { useFormEngine } from "@/lib/forms/form-engine";
import { erpBtnAccent } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { persistMezzoFormCreate } from "@/lib/mezzi/persist-mezzo-form";
import {
  getEmptyMezzoForm,
  MezzoFormFields,
} from "@/components/gestionale/mezzi/mezzi-form-fields";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import type { MezzoRow } from "@/src/types/supabase-tables";

const MEZZO_NEW_FORM_ID = "mezzo-new-form";

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
  const formEngine = useFormEngine({ initial: getEmptyMezzoForm() });
  const { value: form, setValue, reset, runSubmit, formProps } = formEngine;
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    reset(getEmptyMezzoForm());
  }, [reset]);

  const setFormStable = useCallback(
    (action: React.SetStateAction<typeof form>) => {
      setValue(action);
    },
    [setValue],
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canEdit || saving) return;

    await runSubmit(e.currentTarget, async (currentForm) => {
      const marca = currentForm.marca.trim();
      if (!marca || !currentForm.cliente.trim()) {
        onValidationError("Compila almeno cliente e marca attrezzatura.");
        return;
      }
      setSaving(true);
      try {
        const row = await persistMezzoFormCreate({
          form: currentForm,
        });
        reset(getEmptyMezzoForm());
        onCreated(row);
      } catch (err) {
        onSaveError(err);
      } finally {
        setSaving(false);
      }
    });
  }

  return (
    <GestionaleModalShell
      modalSize="formMedium"
      title="Nuovo mezzo"
      titleId="mezzo-nuovo-title"
      onRequestClose={onClose}
      footer={
        <LoadingButton
          type="submit"
          form={MEZZO_NEW_FORM_ID}
          loading={saving}
          preset="salva"
          loadingLabel="Salvataggio…"
          className={`${erpBtnAccent} min-h-11 w-full justify-center disabled:opacity-60`}
        >
          Salva mezzo
        </LoadingButton>
      }
    >
      <form
        {...formProps}
        id={MEZZO_NEW_FORM_ID}
        onSubmit={handleSubmit}
        className={`${gestionaleModalBodyFlexClass} min-h-0 overflow-hidden`}
      >
        <GestionaleModalScrollBody className="space-y-3">
          <MezzoFormFields form={form} setForm={setFormStable} />
        </GestionaleModalScrollBody>
      </form>
    </GestionaleModalShell>
  );
}
