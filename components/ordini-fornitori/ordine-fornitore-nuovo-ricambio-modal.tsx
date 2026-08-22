"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { LoadingButton } from "@/components/design-system";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GlobalSettingsListSelect } from "@/components/gestionale/global-input/global-settings-list-select";
import { FormField } from "@/components/gestionale/schede/gestionale-form-section";
import { GestionaleNumberInput } from "@/components/gestionale/gestionale-number-input";
import { erpBtnAccent } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { ricambioUiToMagazzinoInsert } from "@/lib/magazzino/magazzino-db-ui-adapter";
import { findDuplicateByCodici } from "@/lib/magazzino/duplicates";
import { ricambioFromFormLenient } from "@/lib/magazzino/form";
import { magazzinoEntry } from "@/lib/domain/magazzino-entry";
import { patchMagazzinoListCache, ricambioUiFromMagazzinoRow } from "@/lib/magazzino/magazzino-list-cache";
import { buildRicambioCompatExpandOptions } from "@/lib/magazzino/resolve-mezzi-liste-for-compat";
import {
  ordineFornitoreQuickRicambioToFormState,
  validateOrdineFornitoreQuickRicambioInput,
  type OrdineFornitoreQuickRicambioInput,
} from "@/lib/ordini-fornitori/ordine-fornitore-quick-ricambio";
import { displayRicambioCodice } from "@/lib/magazzino/ricambio-codice";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { dsInput, dsTypoSmall } from "@/lib/ui/design-system";
import { useQueryClient } from "@tanstack/react-query";
import { applyRicambioCodiceInputChange } from "@/lib/magazzino/ricambio-codice";

const FORM_ID = "ordine-fornitore-nuovo-ricambio-form";

type Props = {
  open: boolean;
  ordineFornitoreLabel: string;
  lockFornitore?: boolean;
  authorName: string;
  magazzinoItems: readonly RicambioMagazzino[];
  mezziListePrefs: MezziListePrefs;
  mergedMezziListe: MezziListePrefs;
  onClose: () => void;
  onCreated: (ricambio: RicambioMagazzino) => void;
  onUseExisting: (ricambio: RicambioMagazzino) => void;
  onError: (message: string) => void;
};

function emptyInput(fornitoreLabel: string): OrdineFornitoreQuickRicambioInput {
  return {
    codice: "",
    descrizione: "",
    prezzo: 0,
    fornitoreLabel: fornitoreLabel.trim(),
  };
}

export function OrdineFornitoreNuovoRicambioModal({
  open,
  ordineFornitoreLabel,
  lockFornitore = true,
  authorName,
  magazzinoItems,
  mezziListePrefs,
  mergedMezziListe,
  onClose,
  onCreated,
  onUseExisting,
  onError,
}: Props) {
  const queryClient = useQueryClient();
  const compatExpand = useMemo(
    () =>
      buildRicambioCompatExpandOptions({
        mezziListe: mezziListePrefs,
        mezziListeMerged: mergedMezziListe,
      }),
    [mezziListePrefs, mergedMezziListe],
  );
  const [input, setInput] = useState(() => emptyInput(ordineFornitoreLabel));
  const [saveBusy, setSaveBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setInput(emptyInput(ordineFornitoreLabel));
  }, [open, ordineFornitoreLabel]);

  const duplicate = useMemo(() => {
    const codice = input.codice.trim();
    if (!codice) return null;
    return findDuplicateByCodici(magazzinoItems, codice);
  }, [input.codice, magazzinoItems]);

  const requestClose = useCallback(() => {
    if (saveBusy) return;
    onClose();
  }, [onClose, saveBusy]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saveBusy) return;

    const err = validateOrdineFornitoreQuickRicambioInput(input);
    if (err) {
      onError(err);
      return;
    }

    if (duplicate) {
      onError("Esiste già un ricambio con questo codice. Usa «Usa ricambio esistente».");
      return;
    }

    setSaveBusy(true);
    try {
      const formState = ordineFornitoreQuickRicambioToFormState(input);
      const ricambioUi = ricambioFromFormLenient(formState, undefined, authorName, compatExpand);
      const created = await magazzinoEntry.create(
        ricambioUiToMagazzinoInsert(ricambioUi, mezziListePrefs, {
          origineCreazione: "ordine_fornitore",
        }),
      );
      if (!created.success || !created.data) {
        onError(created.error ?? "Creazione ricambio non riuscita.");
        return;
      }
      const ui = ricambioUiFromMagazzinoRow(created.data, authorName, mergedMezziListe);
      patchMagazzinoListCache(queryClient, (prev) => [ui, ...prev], mergedMezziListe);
      onCreated(ui);
      onClose();
    } finally {
      setSaveBusy(false);
    }
  }

  function handleUseExisting() {
    if (!duplicate) return;
    onUseExisting(duplicate);
    onClose();
  }

  if (!open) return null;

  const duplicateLabel =
    duplicate
      ? `${displayRicambioCodice(duplicate.codiceFornitoreOriginale)} · ${duplicate.descrizione || "—"}`
      : "";

  return (
    <GestionaleModalShell
      modalSize="formSmall"
      onRequestClose={requestClose}
      title="Nuovo ricambio"
      titleId="ordine-nuovo-ricambio-title"
      footer={
        <div className="flex w-full flex-col gap-2">
          {duplicate ? (
            <button
              type="button"
              className={`${erpBtnAccent} min-h-11 w-full justify-center border-[color:color-mix(in_srgb,var(--cab-primary)_45%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-surface))]`}
              onClick={handleUseExisting}
              disabled={saveBusy}
            >
              Usa ricambio esistente
            </button>
          ) : null}
          <LoadingButton
            type="submit"
            form={FORM_ID}
            loading={saveBusy}
            preset="salva"
            loadingLabel="Salvataggio…"
            disabled={Boolean(duplicate)}
            className={`${erpBtnAccent} min-h-11 w-full justify-center disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 disabled:grayscale`}
          >
            Salva in Magazzino
          </LoadingButton>
        </div>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={handleSubmit}
        className={`${gestionaleModalBodyFlexClass} space-y-3 p-4`}
      >
        {duplicate ? (
          <p className={`${dsTypoSmall} rounded-md border border-[color:color-mix(in_srgb,var(--cab-warning)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_10%,var(--cab-surface))] px-3 py-2 text-[color:var(--cab-text)]`}>
            Codice già presente in magazzino: <strong>{duplicateLabel}</strong>
          </p>
        ) : null}

        <FormField label="Codice" htmlFor="ordine-nuovo-ricambio-codice">
          <input
            id="ordine-nuovo-ricambio-codice"
            className={dsInput}
            value={input.codice}
            autoComplete="off"
            onChange={(e) => applyRicambioCodiceInputChange(e, (v) => setInput((p) => ({ ...p, codice: v })))}
          />
        </FormField>

        <FormField label="Descrizione" htmlFor="ordine-nuovo-ricambio-descrizione">
          <input
            id="ordine-nuovo-ricambio-descrizione"
            className={dsInput}
            value={input.descrizione}
            autoComplete="off"
            onChange={(e) => setInput((p) => ({ ...p, descrizione: e.target.value }))}
          />
        </FormField>

        <FormField label="Prezzo listino" htmlFor="ordine-nuovo-ricambio-prezzo">
          <GestionaleNumberInput
            id="ordine-nuovo-ricambio-prezzo"
            value={String(input.prezzo)}
            min={0}
            step={0.01}
            onChange={(v) => setInput((p) => ({ ...p, prezzo: Math.max(0, parseFloat(v.replace(",", ".")) || 0) }))}
          />
        </FormField>

        <FormField label="Fornitore" htmlFor="ordine-nuovo-ricambio-fornitore">
          <GlobalSettingsListSelect
            id="ordine-nuovo-ricambio-fornitore"
            listKey="magazzino:fornitori"
            value={input.fornitoreLabel}
            onChange={(v) => setInput((p) => ({ ...p, fornitoreLabel: v }))}
            disabled={lockFornitore}
            required
          />
        </FormField>
      </form>
    </GestionaleModalShell>
  );
}
