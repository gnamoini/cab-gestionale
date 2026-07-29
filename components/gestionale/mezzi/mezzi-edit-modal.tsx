"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { LoadingButton } from "@/components/design-system";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { MezzoAssociationChangeDialog } from "@/components/lavorazioni/schede/mezzo-association-change-dialog";
import { useFormEngine } from "@/lib/forms/form-engine";
import { erpBtnAccent } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  gestitoToMezzoForm,
  MezzoFormFields,
  type MezzoFormState,
} from "@/components/gestionale/mezzi/mezzi-form-fields";
import {
  associationFromForm,
  checkAssociationChange,
  type AssociationChange,
} from "@/lib/domain/mezzo/mezzo-association";
import { persistMezzoFormUpdate } from "@/lib/mezzi/persist-mezzo-form";
import { applyMezzoAssociationChangeOrThrow } from "@/lib/mezzi/mezzo-association-write-bridge";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { useMezzoUpdateMutation } from "@/src/hooks/gestionale/use-mezzo-mutations";
import { mezzoDomainQueryKeys } from "@/src/services/domain/mezzo-domain.queries";
import { useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();
  const formEngine = useFormEngine({ initial: gestitoToMezzoForm(mezzo) });
  const { value: form, setValue, reset, runSubmit, formProps } = formEngine;
  const updateMut = useMezzoUpdateMutation();
  const [saving, setSaving] = useState(false);
  const [associationOpen, setAssociationOpen] = useState(false);
  const [associationChange, setAssociationChange] = useState<AssociationChange | null>(null);
  const [associationReason, setAssociationReason] = useState("");
  const pendingFormRef = useRef<MezzoFormState | null>(null);

  useEffect(() => {
    reset(gestitoToMezzoForm(mezzo));
  }, [mezzo.id, mezzo, reset]);

  const setFormStable = useCallback(
    (action: React.SetStateAction<typeof form>) => {
      setValue(action);
    },
    [setValue],
  );

  const persistForm = useCallback(
    async (currentForm: MezzoFormState, associationConfirmed: boolean) => {
      const change = checkAssociationChange({
        existingMezzo: mezzo,
        incoming: associationFromForm(currentForm),
      });

      if (change.requiresConfirmation && !associationConfirmed) {
        pendingFormRef.current = currentForm;
        setAssociationChange(change);
        setAssociationOpen(true);
        return;
      }

      const id = mezzo.id;

      if (change.hasChanges && associationConfirmed) {
        await applyMezzoAssociationChangeOrThrow({
          mezzoId: id,
          existingMezzo: mezzo,
          newAssociation: associationFromForm(currentForm),
          origin: "modifica_manuale",
          reason: associationReason.trim() || null,
          expectedUpdatedAt: mezzo.ultimaModifica?.trim() || "",
        });
      }

      await persistMezzoFormUpdate({
        mezzoId: id,
        form: currentForm,
        updateMezzo: (mezzoId, data) => updateMut.mutateAsync({ id: mezzoId, data }),
      });

      if (change.hasChanges && associationConfirmed) {
        void queryClient.invalidateQueries({ queryKey: mezzoDomainQueryKeys.anagraficaHistory(id) });
      }

      onSaved(id);
    },
    [associationReason, mezzo, onSaved, queryClient, updateMut],
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canEdit || saving || updateMut.isPending) return;

    await runSubmit(e.currentTarget, async (currentForm) => {
      const marca = currentForm.marca.trim();
      if (!marca || !currentForm.cliente.trim()) {
        onValidationError("Compila almeno cliente e marca attrezzatura.");
        return;
      }
      setSaving(true);
      try {
        await persistForm(currentForm, false);
      } catch (err) {
        onSaveError(err);
      } finally {
        setSaving(false);
      }
    });
  }

  return (
    <>
      <GestionaleModalShell
        modalSize="formMedium"
        title="Modifica anagrafica mezzo"
        subtitle="Le modifiche aggiornano l'anagrafica permanente. Lo storico campo-per-campo è nel tab Log dell'hub mezzo."
        titleId="mezzo-edit-title"
        onRequestClose={onClose}
        footer={
          <LoadingButton
            type="submit"
            form={MEZZO_EDIT_FORM_ID}
            loading={saving || updateMut.isPending}
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
      <MezzoAssociationChangeDialog
        open={associationOpen}
        change={associationChange}
        showReasonField
        reason={associationReason}
        onReasonChange={setAssociationReason}
        onConfirm={() => {
          setAssociationOpen(false);
          const pending = pendingFormRef.current;
          pendingFormRef.current = null;
          if (!pending) return;
          setSaving(true);
          void persistForm(pending, true)
            .catch(onSaveError)
            .finally(() => {
              setSaving(false);
            });
        }}
        onCancel={() => {
          setAssociationOpen(false);
          pendingFormRef.current = null;
          setAssociationChange(null);
        }}
      />
    </>
  );
}
