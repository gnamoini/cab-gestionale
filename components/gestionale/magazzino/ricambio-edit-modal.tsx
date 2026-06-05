"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactElement } from "react";
import { LoadingButton, Tooltip } from "@/components/design-system";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { GestionaleInfoCard } from "@/components/design-system/gestionale-info-card";
import { gestionaleFormFocusScopeProps } from "@/components/gestionale/gestionale-form-focus-scope";
import { RicambioConsumoInfoRows } from "@/components/gestionale/magazzino/ricambio-info-panel";
import { RicambioFormFields } from "@/components/gestionale/magazzino/ricambio-form-fields";
import { RicambioFormOptionsProvider } from "@/components/gestionale/magazzino/ricambio-form-options-context";
import {
  ricambioFromFormLenient,
  toFormDraft,
  validateRicambioListFields,
  type RicambioFormState,
} from "@/lib/magazzino/form";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { dsBtnDanger, dsBtnNeutral, dsBtnPrimary, dsModalFormFooter } from "@/lib/ui/design-system";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";
import { ricambioUiToMagazzinoUpdate } from "@/lib/magazzino/magazzino-db-ui-adapter";
import { magazzinoService } from "@/src/services/magazzino.service";
import { ricambioUiFromMagazzinoRow } from "@/lib/magazzino/magazzino-list-cache";
import type { RicambioConsumoDaLog } from "@/lib/magazzino/ricambio-consumo-from-log";

function MagazzinoDisabledButtonTooltip({
  content,
  disabled,
  children,
}: {
  content: string;
  disabled?: boolean;
  children: ReactElement;
}) {
  return (
    <Tooltip content={content}>
      {disabled ? <span className="inline-flex w-full min-w-0">{children}</span> : children}
    </Tooltip>
  );
}

export function RicambioEditModal({
  ricambioId,
  ricambio,
  mezziListePrefs,
  marche,
  categorie,
  authorName,
  consumo,
  magCanCreateRicambio,
  magCanDeleteRicambio,
  onClose,
  onCancel,
  onRequestDelete,
  onSaved,
  onSaveError,
}: {
  ricambioId: string;
  ricambio: RicambioMagazzino;
  mezziListePrefs: MezziListePrefs;
  marche: string[];
  categorie: string[];
  authorName: string;
  consumo: RicambioConsumoDaLog | undefined;
  magCanCreateRicambio: boolean;
  magCanDeleteRicambio: boolean;
  onClose: () => void;
  onCancel: () => void;
  onRequestDelete: () => void;
  onSaved: (ui: RicambioMagazzino, message: string) => void;
  onSaveError: (message: string) => void;
}) {
  const [editDraft, setEditDraft] = useState<RicambioFormState>(() =>
    toFormDraft(ricambio, mezziListePrefs),
  );
  const [listFieldInvalid, setListFieldInvalid] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);

  useEffect(() => {
    setEditDraft(toFormDraft(ricambio, mezziListePrefs));
    setListFieldInvalid(false);
  }, [ricambioId, ricambio, mezziListePrefs]);

  const setEditForm = useCallback(
    (action: React.SetStateAction<RicambioFormState>) => {
      setEditDraft((prev) => (typeof action === "function" ? action(prev) : action));
    },
    [],
  );

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!magCanCreateRicambio || saveBusy) return;
    const listErr = validateRicambioListFields(editDraft, {
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
    const next = ricambioFromFormLenient(editDraft, ricambioId, authorName, {
      mezziListe: mezziListePrefs,
    });
    setSaveBusy(true);
    try {
      const updated = await magazzinoService.update(
        ricambioId,
        ricambioUiToMagazzinoUpdate(next, mezziListePrefs),
      );
      if (!updated.success || !updated.data) {
        onSaveError(updated.error ?? "Salvataggio non riuscito.");
        return;
      }
      const ui = ricambioUiFromMagazzinoRow(updated.data, authorName, mezziListePrefs);
      onSaved(ui, "Modifiche salvate.");
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <GestionaleModalShell
      onRequestClose={onClose}
      title="Modifica ricambio"
      titleId="detail-ricambio-title"
      maxWidthClass="max-w-lg"
    >
      <RicambioFormOptionsProvider>
      <form {...gestionaleFormFocusScopeProps()} onSubmit={saveEdit} className={`${gestionaleModalBodyFlexClass} overflow-hidden`}>
        <GestionaleModalScrollBody className="space-y-4">
          <RicambioFormFields
            form={editDraft}
            setForm={setEditForm}
            formResetKey={ricambioId}
            listFieldForceInvalid={listFieldInvalid}
            relaxHtmlValidation
          />
          <GestionaleInfoCard title="Consumo e autonomia (stima)">
            <RicambioConsumoInfoRows
              consumo={consumo}
              scorta={Math.max(0, Math.round(Number.parseInt(editDraft.scorta, 10) || 0))}
              autonomiaTooltip="Scorta nel modulo ÷ consumo medio mensile"
            />
          </GestionaleInfoCard>
        </GestionaleModalScrollBody>
        <footer
          className={`${dsModalFormFooter} flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between`}
        >
          <MagazzinoDisabledButtonTooltip
            content={magCanDeleteRicambio ? "Elimina ricambio" : READONLY_PERMISSION_HINT}
            disabled={!magCanDeleteRicambio}
          >
            <button
              type="button"
              onClick={onRequestDelete}
              disabled={!magCanDeleteRicambio}
              className={`${dsBtnDanger} min-h-11 w-full justify-center sm:w-auto`}
            >
              Elimina ricambio
            </button>
          </MagazzinoDisabledButtonTooltip>
          <div className="flex w-full min-w-0 gap-2 sm:w-auto sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className={`${dsBtnNeutral} min-h-11 min-w-0 flex-1 justify-center sm:min-w-[6.5rem] sm:flex-none`}
            >
              Annulla
            </button>
            <LoadingButton
              type="submit"
              loading={saveBusy}
              preset="salva"
              className={`${dsBtnPrimary} min-h-11 min-w-0 flex-1 justify-center sm:min-w-[6.5rem] sm:flex-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45`}
            >
              Salva
            </LoadingButton>
          </div>
        </footer>
      </form>
      </RicambioFormOptionsProvider>
    </GestionaleModalShell>
  );
}
