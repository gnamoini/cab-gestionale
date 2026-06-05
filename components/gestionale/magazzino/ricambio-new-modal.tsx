"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { LoadingButton } from "@/components/design-system";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { RecordImageManager } from "@/components/gestionale/media/record-image-manager";
import { gestionaleFormFocusScopeProps } from "@/components/gestionale/gestionale-form-focus-scope";
import { RicambioFormFields } from "@/components/gestionale/magazzino/ricambio-form-fields";
import { RicambioFormOptionsProvider } from "@/components/gestionale/magazzino/ricambio-form-options-context";
import {
  emptyRicambioForm,
  ricambioFromFormLenient,
  validateRicambioListFields,
  type RicambioFormState,
} from "@/lib/magazzino/form";
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
  const [newDraft, setNewDraft] = useState<RicambioFormState>(emptyRicambioForm);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [listFieldInvalid, setListFieldInvalid] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [codiceScan, setCodiceScan] = useState({ primary: "", secondary: "" });

  useEffect(() => {
    setDraftId(crypto.randomUUID());
    setNewDraft(emptyRicambioForm());
    setListFieldInvalid(false);
    setCodiceScan({ primary: "", secondary: "" });
  }, []);

  const setNewForm = useCallback((action: React.SetStateAction<RicambioFormState>) => {
    setNewDraft((prev) => (typeof action === "function" ? action(prev) : action));
  }, []);

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
    setNewDraft(emptyRicambioForm());
    setListFieldInvalid(false);
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!magCanCreateRicambio || saveBusy) return;
    const listErr = validateRicambioListFields(newDraft, {
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
      const r = ricambioFromFormLenient(newDraft, draftId ?? undefined, authorName, {
        mezziListe: mezziListePrefs,
      });
      const created = await magazzinoService.create(ricambioUiToMagazzinoInsert(r, mezziListePrefs));
      if (!created.success || !created.data) {
        onSaveError(created.error ?? "Creazione ricambio non riuscita.");
        return;
      }
      const ui = ricambioUiFromMagazzinoRow(created.data, authorName, mezziListePrefs);
      setDraftId(null);
      setNewDraft(emptyRicambioForm());
      onSaved(ui);
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <GestionaleModalShell
      onRequestClose={handleClose}
      title="Nuovo ricambio"
      titleId="new-ricambio-title"
    >
      <RicambioFormOptionsProvider>
        <form
          {...gestionaleFormFocusScopeProps()}
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
          <footer className={`${dsModalFormFooter} flex-col items-stretch`}>
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
