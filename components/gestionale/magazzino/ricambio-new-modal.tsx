"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { LoadingButton } from "@/components/design-system";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { RecordImageManager } from "@/components/gestionale/media/record-image-manager";
import { RicambioFormFields } from "@/components/gestionale/magazzino/ricambio-form-fields";
import { RicambioFormOptionsProvider } from "@/components/gestionale/magazzino/ricambio-form-options-context";
import { useFormEngine } from "@/lib/forms/form-engine";
import {
  emptyRicambioForm,
  ricambioFormImportantWarnings,
  ricambioFromFormLenient,
  ricambioLenientPlaceholderFlags,
  validateRicambioListFields,
  type RicambioFormState,
} from "@/lib/magazzino/form";
import { incrementHealthCounter } from "@/lib/observability/runtime-health";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { findDuplicateByCodici } from "@/lib/magazzino/duplicates";
import { purgeMagazzinoLogEntriesForRicambioId } from "@/lib/magazzino/magazzino-change-log-storage";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { dsModalFormFooter } from "@/lib/ui/design-system";
import { erpBtnAccent } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { ricambioUiToMagazzinoInsert } from "@/lib/magazzino/magazzino-db-ui-adapter";
import { magazzinoService } from "@/src/services/magazzino.service";
import { ricambioUiFromMagazzinoRow } from "@/lib/magazzino/magazzino-list-cache";

export function RicambioNewModal({
  marche,
  categorie,
  mezziListePrefs,
  authorName,
  prodotti,
  magCanCreateRicambio,
  onClose,
  onSaved,
  onSaveError,
  onVaiAlRicambioDuplicato,
}: {
  marche: string[];
  categorie: string[];
  mezziListePrefs: MezziListePrefs;
  authorName: string;
  prodotti: readonly RicambioMagazzino[];
  magCanCreateRicambio: boolean;
  onClose: () => void;
  onSaved: (ui: RicambioMagazzino) => void;
  onSaveError: (message: string) => void;
  onVaiAlRicambioDuplicato: (id: string) => void;
}) {
  const formEngine = useFormEngine<RicambioFormState>({ initial: emptyRicambioForm() });
  const { value: newDraft, setValue, reset, runSubmit, formProps } = formEngine;
  const [draftId, setDraftId] = useState<string | null>(null);
  const [listFieldInvalid, setListFieldInvalid] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [codiceScan, setCodiceScan] = useState({ primary: "", secondary: "" });

  useEffect(() => {
    const empty = emptyRicambioForm();
    setDraftId(crypto.randomUUID());
    reset(empty);
    setListFieldInvalid(false);
    setCodiceScan({ primary: "", secondary: "" });
  }, [reset]);

  const setNewForm = useCallback(
    (action: React.SetStateAction<RicambioFormState>) => {
      setValue(action);
    },
    [setValue],
  );

  const codiceDupEsistente = useMemo(() => {
    const primary = codiceScan.primary.trim();
    if (!primary) return null;
    return findDuplicateByCodici([...prodotti], primary, {
      alsoCheckSecondary: codiceScan.secondary.trim() || undefined,
    });
  }, [prodotti, codiceScan.primary, codiceScan.secondary]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setCodiceScan({
        primary: newDraft.codiceFornitoreOriginale,
        secondary: newDraft.codiceFornitoreOriginaleSecondario,
      });
    }, 400);
    return () => window.clearTimeout(t);
  }, [newDraft.codiceFornitoreOriginale, newDraft.codiceFornitoreOriginaleSecondario]);

  function handleClose() {
    if (draftId) purgeMagazzinoLogEntriesForRicambioId(draftId);
    setDraftId(null);
    reset(emptyRicambioForm());
    setListFieldInvalid(false);
    onClose();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!magCanCreateRicambio || saveBusy) return;

    await runSubmit(e.currentTarget, async (currentDraft) => {
      const listErr = validateRicambioListFields(currentDraft, {
        marche,
        categorie,
        mezziListe: mezziListePrefs,
      });
      if (listErr) {
        setListFieldInvalid(true);
        onSaveError(listErr);
        return;
      }
      setListFieldInvalid(false);
      setSaveBusy(true);
      try {
        const r = ricambioFromFormLenient(currentDraft, draftId ?? undefined, authorName, {
          mezziListe: mezziListePrefs,
        });
        const incompleteWarnings = ricambioFormImportantWarnings(currentDraft);
        if (incompleteWarnings.length > 0) {
          incrementHealthCounter("ricambioSaveIncompleteFields");
        }
        const placeholderFlags = ricambioLenientPlaceholderFlags(r);
        if (placeholderFlags.marcaPlaceholder) incrementHealthCounter("ricambioSavePlaceholderMarca");
        if (placeholderFlags.descrizionePlaceholder) {
          incrementHealthCounter("ricambioSavePlaceholderDescrizione");
        }
        if (placeholderFlags.categoriaPlaceholder) {
          incrementHealthCounter("ricambioSavePlaceholderCategoria");
        }
        const created = await magazzinoService.create(ricambioUiToMagazzinoInsert(r, mezziListePrefs));
        if (!created.success || !created.data) {
          onSaveError(created.error ?? "Creazione ricambio non riuscita.");
          return;
        }
        const ui = ricambioUiFromMagazzinoRow(created.data, authorName, mezziListePrefs);
        setDraftId(null);
        reset(emptyRicambioForm());
        onSaved(ui);
      } finally {
        setSaveBusy(false);
      }
    });
  }

  return (
    <GestionaleModalShell
      modalSize="formMedium"
      onRequestClose={handleClose}
      title="Nuovo ricambio"
      titleId="new-ricambio-title"
    >
      <RicambioFormOptionsProvider>
        <form
          {...formProps}
          onSubmit={handleSubmit}
          className={`${gestionaleModalBodyFlexClass} overflow-hidden`}
        >
          <GestionaleModalScrollBody className="space-y-4">
            <RicambioFormFields
              form={newDraft}
              setForm={setNewForm}
              formResetKey={draftId ?? "new"}
              relaxHtmlValidation
              codiceOriginaleAvvisoDuplicato={
                codiceDupEsistente
                  ? {
                      existing: codiceDupEsistente,
                      onVaiAlRicambio: () => onVaiAlRicambioDuplicato(codiceDupEsistente.id),
                    }
                  : null
              }
              listFieldForceInvalid={listFieldInvalid}
            />
            {draftId ? (
              <RecordImageManager
                scope="magazzino"
                recordId={draftId}
                canEdit={magCanCreateRicambio}
                auditLog={false}
                hubCardLayout
              />
            ) : null}
          </GestionaleModalScrollBody>
          <footer className={`${dsModalFormFooter} min-w-0 flex-col items-stretch`}>
            <LoadingButton
              type="submit"
              loading={saveBusy}
              preset="salva"
              loadingLabel="Salvataggio…"
              className={`${erpBtnAccent} min-h-11 w-full justify-center disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 disabled:grayscale`}
            >
              Salva in magazzino
            </LoadingButton>
          </footer>
        </form>
      </RicambioFormOptionsProvider>
    </GestionaleModalShell>
  );
}
