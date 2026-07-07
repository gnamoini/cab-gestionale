"use client";

import { useState, type FormEvent } from "react";
import { runSubmitFromGetter, useSubmitLock } from "@/lib/forms/form-engine";
import { isoToDateInputValue, isoToItDisplay } from "@/lib/lavorazioni/date-day-only";
import { lavorazioneDataCompletamentoIso } from "@/lib/lavorazioni/lavorazioni-list-table-display";
import { lavorazioneOggettoLabel } from "@/lib/lavorazioni/lavorazioni-list-row-labels";
import { LavorazioniDateField } from "@/components/gestionale/lavorazioni/lavorazioni-date-field";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { gestionaleFormFocusScopeProps } from "@/components/gestionale/gestionale-form-focus-scope";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { LoadingButton } from "@/components/design-system";
import { erpBtnAccent, erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { dsInput, dsLabel } from "@/lib/ui/design-system";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { parseItalianDayDisplayToIso } from "@/lib/ui/italian-date-input-mask";
import { useLavorazioneUpdateCompletamentoMutation } from "@/src/hooks/gestionale/use-lavorazione-mutations";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

const COMPLETAMENTO_EDIT_FORM_ID = "lavorazione-completamento-edit-form";

export function LavorazioneCompletamentoEditModal({
  row,
  onClose,
  onSaved,
}: {
  row: LavorazioneListRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const update = useLavorazioneUpdateCompletamentoMutation();
  const gestToast = useGestionaleToast();
  const [dateText, setDateText] = useState(() =>
    isoToItDisplay(lavorazioneDataCompletamentoIso(row)),
  );
  const [dateErr, setDateErr] = useState<string | null>(null);
  const submitLock = useSubmitLock();
  const pending = update.isPending;
  const macchina = lavorazioneOggettoLabel(row);
  const targa = row.mezzo?.targa?.trim();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    await runSubmitFromGetter(
      e.currentTarget,
      submitLock,
      () => ({ dateText }),
      async (snap) => {
        const parsed = parseItalianDayDisplayToIso(snap.dateText);
        if (!parsed.ok) {
          setDateErr("Data non valida. Usa gg/mm/aaaa.");
          return;
        }
        const completionYmd = isoToDateInputValue(parsed.iso);
        const ingressoYmd = row.data_ingresso?.trim().slice(0, 10);
        if (ingressoYmd && completionYmd < ingressoYmd) {
          setDateErr("La data di completamento non può essere precedente alla data di ingresso.");
          return;
        }
        setDateErr(null);
        try {
          await update.mutateAsync({ id: row.id, completionYmd });
          gestToast.successSaved();
          onSaved();
          onClose();
        } catch (err) {
          gestToast.errorOnce("lav-completamento-edit", err, { module: "lavorazioni", action: "update" });
        }
      },
    );
  }

  return (
    <LavorazioniModalShell
      modalSize="formSmall"
      onRequestClose={pending ? () => {} : onClose}
      title="Modifica data completamento"
      subtitle={[macchina, targa].filter(Boolean).join(" · ")}
      footer={
        <div className="flex w-full min-w-0 items-center justify-end gap-2">
          <button type="button" className={`${erpBtnNeutral} min-h-11`} onClick={onClose} disabled={pending}>
            Annulla
          </button>
          <LoadingButton
            type="submit"
            form={COMPLETAMENTO_EDIT_FORM_ID}
            className={`${erpBtnAccent} min-h-11`}
            loading={pending}
            preset="salva"
          >
            Salva
          </LoadingButton>
        </div>
      }
    >
      <form
        id={COMPLETAMENTO_EDIT_FORM_ID}
        {...gestionaleFormFocusScopeProps()}
        onSubmit={onSubmit}
        className={`${gestionaleModalBodyFlexClass} overflow-hidden`}
      >
        <GestionaleModalScrollBody className="space-y-3">
          <div>
            <label className={dsLabel} htmlFor="lav-completamento-date">
              Data completamento
            </label>
            <LavorazioniDateField
              id="lav-completamento-date"
              value={dateText}
              onChange={(v) => {
                setDateText(v);
                setDateErr(null);
              }}
              inputClassName={dsInput}
              required
            />
          </div>
          {dateErr ? <p className="text-xs text-red-600 dark:text-red-400">{dateErr}</p> : null}
          <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            Solo giorno (senza orario). La modifica sarà visibile anche nel portale clienti.
          </p>
        </GestionaleModalScrollBody>
      </form>
    </LavorazioniModalShell>
  );
}
