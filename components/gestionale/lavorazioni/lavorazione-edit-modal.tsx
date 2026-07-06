"use client";

import { useState, type FormEvent } from "react";
import { runSubmitFromGetter, useSubmitLock } from "@/lib/forms/form-engine";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import { useLavorazioneUpdateMutation } from "@/src/hooks/gestionale/use-lavorazione-mutations";
import {
  useMezzoCreateMutation,
  useMezzoUpdateMutation,
} from "@/src/hooks/gestionale/use-mezzo-mutations";
import { upsertMezzoFromSchedaIngresso } from "@/lib/mezzi/upsert-mezzo-from-scheda";
import { useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
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
import type { SchedaIngressoFields } from "@/types/schede";

const LAVORAZIONE_EDIT_FORM_ID = "lavorazione-edit-form";

function fieldsFromEditForm(input: {
  row: LavorazioneListRow;
  cliente: string;
  utilizzatore: string;
  marca: string;
  modello: string;
  targa: string;
  matricola: string;
  numeroScuderia: string;
  note: string;
}): SchedaIngressoFields {
  return {
    targetType: input.row.target_type ?? "attrezzatura",
    attrezzaturaId: input.row.attrezzatura_id ?? null,
    dataIngresso: input.row.data_ingresso?.slice(0, 10) ?? "",
    cliente: input.cliente,
    cantiere: "",
    utilizzatore: input.utilizzatore,
    tipoAttrezzatura: input.row.mezzo?.tipo_attrezzatura?.trim() ?? "",
    marcaAttrezzatura: input.marca,
    modelloAttrezzatura: input.modello,
    matricola: input.matricola,
    nScuderia: input.numeroScuderia,
    oreLavoro: "",
    tipoTelaio: input.row.mezzo?.tipo_telaio?.trim() ?? "",
    marcaTelaio: input.row.mezzo?.marca_telaio?.trim() ?? "",
    modelloTelaio: input.row.mezzo?.modello_telaio?.trim() ?? "",
    vin: input.row.mezzo?.telaio_num?.trim() ?? "",
    targa: input.targa,
    km: input.row.mezzo?.km != null ? String(input.row.mezzo.km) : "",
    descrizioneAnomalia: "",
    livelloCarburante: "",
    addettoAccettazione: "",
    richiedente: "",
    noteIntervento: input.note,
  };
}

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
  const createMezzo = useMezzoCreateMutation();
  const updateMezzo = useMezzoUpdateMutation();
  const mezziListQ = useMezziListQuery();
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
  const pending = update.isPending || createMezzo.isPending || updateMezzo.isPending;

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
          const catalog = mezziListQ.data ?? [];
          const schedaFields = fieldsFromEditForm({ row, ...snap });
          const upsert = await upsertMezzoFromSchedaIngresso({
            fields: schedaFields,
            mezziCatalog: catalog,
            preferredMezzoId: row.mezzo_id,
            create: (data) => createMezzo.mutateAsync(data),
            update: (id, data) => updateMezzo.mutateAsync({ id, data }),
          });

          const lavPatch: Parameters<typeof update.mutateAsync>[0]["data"] = {
            note: snap.note.trim() || null,
          };
          if (upsert.mezzoId && upsert.mezzoId !== row.mezzo_id) lavPatch.mezzo_id = upsert.mezzoId;
          if (upsert.targetType && upsert.targetType !== row.target_type) lavPatch.target_type = upsert.targetType;
          const nextAttId = upsert.targetType === "attrezzatura" ? (upsert.attrezzaturaId ?? null) : null;
          if (nextAttId !== (row.attrezzatura_id ?? null)) lavPatch.attrezzatura_id = nextAttId;

          await update.mutateAsync({ id: row.id, data: lavPatch });
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
            disabled={pending}
          >
            Annulla
          </button>
          <LoadingButton
            type="submit"
            form={LAVORAZIONE_EDIT_FORM_ID}
            className={`${erpBtnAccent} min-h-11`}
            loading={pending}
            preset="salva"
          >
            Salva
          </LoadingButton>
          {canDelete && onDelete ? (
            <button
              type="button"
              className={`${dsBtnDanger} min-h-11 basis-full sm:basis-auto`}
              disabled={pending}
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
                disabled={pending}
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
                disabled={pending}
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
                disabled={pending}
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
                disabled={pending}
                required
                aria-label="Modello attrezzatura"
              />
            </label>
            <label className="block">
              <span className={dsLabel}>Targa</span>
              <input className={`${dsInput} mt-1 w-full`} value={targa} onChange={(e) => setTarga(e.target.value)} disabled={pending} />
            </label>
            <label className="block">
              <span className={dsLabel}>Matricola</span>
              <input className={`${dsInput} mt-1 w-full`} value={matricola} onChange={(e) => setMatricola(e.target.value)} disabled={pending} required />
            </label>
            <label className="block sm:col-span-2">
              <span className={dsLabel}>N. scuderia</span>
              <input className={`${dsInput} mt-1 w-full`} value={numeroScuderia} onChange={(e) => setNumeroScuderia(e.target.value)} disabled={pending} />
            </label>
          </div>

          <label className="block">
            <span className={dsLabel}>Note</span>
            <GestionaleTextarea
              className="mt-1 min-h-[6.25rem]"
              size="lg"
              value={note}
              onChange={(v) => setNote(sliceInputValue(v, TEXT_LONG))}
              disabled={pending}
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
