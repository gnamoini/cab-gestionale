"use client";

import { useState, type FormEvent } from "react";
import { runSubmitFromGetter, useSubmitLock } from "@/lib/forms/form-engine";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import { useLavorazioneUpdateMutation } from "@/src/hooks/gestionale/use-lavorazione-mutations";
import { useMezzoUpdateMutation } from "@/src/hooks/gestionale/use-mezzo-mutations";
import { gestionaleFormFocusScopeProps } from "@/components/gestionale/gestionale-form-focus-scope";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import {
  GlobalHierarchyMarcaSelect,
  GlobalHierarchyModelloSelect,
  GlobalSettingsListSelect,
} from "@/components/gestionale/global-input";
import { sliceInputValue, TEXT_LONG } from "@/lib/validation/text-field-limits";
import { LoadingButton } from "@/components/design-system";
import { erpBtnAccent, erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { dsBtnDanger, dsBtnNeutral, dsInput, dsLabel } from "@/lib/ui/design-system";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

const LAVORAZIONE_EDIT_FORM_ID = "lavorazione-edit-form";

export function LavorazioneEditModal({
  row,
  onClose,
  onBack,
  canDelete,
  onDelete,
}: {
  row: LavorazioneListRow;
  onClose: () => void;
  onBack?: () => void;
  canDelete?: boolean;
  onDelete?: () => void;
}) {
  const update = useLavorazioneUpdateMutation();
  const updateMezzo = useMezzoUpdateMutation();
  const gestToast = useGestionaleToast();
  const { confirm, confirmDialog } = useGestionaleConfirm();
  const [cliente, setCliente] = useState(() => row.mezzo?.cliente?.trim() ?? "");
  const [utilizzatore, setUtilizzatore] = useState(() => row.mezzo?.utilizzatore?.trim() ?? "");
  const [marca, setMarca] = useState(() => row.mezzo?.marca?.trim() ?? "");
  const [modello, setModello] = useState(() => row.mezzo?.modello?.trim() ?? "");
  const [targa, setTarga] = useState(() => row.mezzo?.targa?.trim() ?? "");
  const [matricola, setMatricola] = useState(() => row.mezzo?.matricola?.trim() ?? "");
  const [numeroScuderia, setNumeroScuderia] = useState(() => row.mezzo?.numero_scuderia?.trim() ?? "");
  const [note, setNote] = useState(() => (row.note ?? "").trim());
  const submitLock = useSubmitLock();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    await runSubmitFromGetter(
      e.currentTarget,
      submitLock,
      () => ({
        cliente,
        utilizzatore,
        marca,
        modello,
        targa,
        matricola,
        numeroScuderia,
        note,
      }),
      async (snap) => {
        if (!snap.cliente.trim() || !snap.marca.trim() || !snap.modello.trim() || !snap.matricola.trim()) {
          gestToast.validation("Cliente, marca, modello e matricola sono obbligatori.");
          return;
        }
        try {
          if (row.mezzo_id) {
            await updateMezzo.mutateAsync({
              id: row.mezzo_id,
              data: {
                cliente: snap.cliente.trim(),
                utilizzatore: snap.utilizzatore.trim() || null,
                marca: snap.marca.trim(),
                modello: snap.modello.trim(),
                targa: snap.targa.trim() || null,
                matricola: snap.matricola.trim(),
                numero_scuderia: snap.numeroScuderia.trim() || null,
              },
            });
          }
          await update.mutateAsync({ id: row.id, data: { note: snap.note.trim() || null } });
          gestToast.successSaved();
          onClose();
        } catch (err) {
          gestToast.errorOnce("lav-edit", err, { module: "lavorazioni" });
        }
      },
    );
  }

  return (
    <LavorazioniModalShell
      modalSize="formMedium"
      onRequestClose={onClose}
      onBack={onBack}
      title="Dettagli macchina"
      subtitle="Modifica controllata di anagrafica mezzo e note lavorazione."
      footer={
        <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            className={`${erpBtnNeutral} min-h-11`}
            onClick={onClose}
            disabled={update.isPending || updateMezzo.isPending}
          >
            Annulla
          </button>
          <LoadingButton
            type="submit"
            form={LAVORAZIONE_EDIT_FORM_ID}
            className={`${erpBtnAccent} min-h-11`}
            loading={update.isPending || updateMezzo.isPending}
            preset="salva"
          >
            Salva
          </LoadingButton>
          {canDelete && onDelete ? (
            <button
              type="button"
              className={`${dsBtnDanger} min-h-11 basis-full sm:basis-auto`}
              disabled={update.isPending || updateMezzo.isPending}
              onClick={() => {
                void confirm({
                  title: "Eliminare lavorazione?",
                  message:
                    "L'azione non è reversibile se il record viene rimosso definitivamente.",
                  destructive: true,
                  confirmLabel: "Elimina",
                }).then((ok) => {
                  if (ok) onDelete();
                });
              }}
            >
              Elimina
            </button>
          ) : null}
        </div>
      }
    >
      <form
        id={LAVORAZIONE_EDIT_FORM_ID}
        {...gestionaleFormFocusScopeProps()}
        onSubmit={onSubmit}
        className={`${gestionaleModalBodyFlexClass} min-h-0 overflow-hidden`}
      >
        <GestionaleModalScrollBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={dsLabel}>Cliente</span>
              <GlobalSettingsListSelect
                listKey="mezzi:clienti"
                className="mt-1 w-full"
                value={cliente}
                onChange={setCliente}
                disabled={update.isPending || updateMezzo.isPending}
                required
                aria-label="Cliente"
              />
            </label>
            <label className="block">
              <span className={dsLabel}>Utilizzatore</span>
              <GlobalSettingsListSelect
                listKey="mezzi:utilizzatori"
                className="mt-1"
                value={utilizzatore}
                onChange={setUtilizzatore}
                disabled={update.isPending || updateMezzo.isPending}
                aria-label="Utilizzatore"
              />
            </label>
            <label className="block">
              <span className={dsLabel}>Marca attrezzatura</span>
              <GlobalHierarchyMarcaSelect
                tree="attrezzature"
                className="mt-1 w-full"
                value={marca}
                onChange={(v) => {
                  setMarca(v);
                  setModello("");
                }}
                disabled={update.isPending || updateMezzo.isPending}
                required
                aria-label="Marca attrezzatura"
              />
            </label>
            <label className="block">
              <span className={dsLabel}>Modello attrezzatura</span>
              <GlobalHierarchyModelloSelect
                tree="attrezzature"
                marcaNome={marca}
                className="mt-1 w-full"
                value={modello}
                onChange={setModello}
                disabled={update.isPending || updateMezzo.isPending}
                required
                aria-label="Modello attrezzatura"
              />
            </label>
            <label className="block">
              <span className={dsLabel}>Targa</span>
              <input className={`${dsInput} mt-1 w-full`} value={targa} onChange={(e) => setTarga(e.target.value)} disabled={update.isPending || updateMezzo.isPending} />
            </label>
            <label className="block">
              <span className={dsLabel}>Matricola</span>
              <input className={`${dsInput} mt-1 w-full`} value={matricola} onChange={(e) => setMatricola(e.target.value)} disabled={update.isPending || updateMezzo.isPending} required />
            </label>
            <label className="block sm:col-span-2">
              <span className={dsLabel}>N. scuderia</span>
              <input className={`${dsInput} mt-1 w-full`} value={numeroScuderia} onChange={(e) => setNumeroScuderia(e.target.value)} disabled={update.isPending || updateMezzo.isPending} />
            </label>
          </div>

          <label className="block">
            <span className={dsLabel}>Note</span>
            <GestionaleTextarea
              className="mt-1 min-h-[6.25rem]"
              size="lg"
              value={note}
              onChange={(v) => setNote(sliceInputValue(v, TEXT_LONG))}
              disabled={update.isPending || updateMezzo.isPending}
              rows={4}
              maxLength={TEXT_LONG}
            />
          </label>
        </GestionaleModalScrollBody>
      </form>
      {confirmDialog}
    </LavorazioniModalShell>
  );
}
