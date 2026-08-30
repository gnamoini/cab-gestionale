"use client";

import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import {
  parseOrdineFornitoreFornitoreSnapshot,
  patchOrdineFornitoreFornitoreSnapshot,
} from "@/lib/ordini-fornitori/fornitore-snapshot";
import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";
import { dsInput, dsLabel } from "@/lib/ui/design-system";
import { sliceInputValue, TEXT_LONG, TEXT_SHORT } from "@/lib/validation/text-field-limits";

export function OrdineFornitoreFornitoreFields({
  record,
  readOnly,
  onRecordChange,
}: {
  record: OrdineFornitoreRecord;
  readOnly: boolean;
  onRecordChange: (next: OrdineFornitoreRecord) => void;
}) {
  const snapshot = parseOrdineFornitoreFornitoreSnapshot(record.fornitoreSnapshot, record.fornitoreLabel);
  const disabled = readOnly || !record.fornitoreLabel.trim();

  function patch(patch: Partial<typeof snapshot>) {
    onRecordChange({
      ...record,
      fornitoreSnapshot: patchOrdineFornitoreFornitoreSnapshot(record.fornitoreSnapshot, record.fornitoreLabel, patch),
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className={dsLabel} htmlFor="ordine-fornitore-ragione-sociale">
          Ragione sociale
        </label>
        <input
          id="ordine-fornitore-ragione-sociale"
          className={dsInput}
          value={snapshot.ragioneSociale}
          disabled={disabled}
          maxLength={TEXT_SHORT}
          onChange={(e) => patch({ ragioneSociale: sliceInputValue(e.target.value, TEXT_SHORT) })}
          placeholder="Nome legale fornitore"
        />
      </div>
      <div className="sm:col-span-2">
        <label className={dsLabel} htmlFor="ordine-fornitore-indirizzo">
          Indirizzo fornitore
        </label>
        <GestionaleTextarea
          id="ordine-fornitore-indirizzo"
          value={snapshot.indirizzo}
          disabled={disabled}
          rows={2}
          maxLength={TEXT_LONG}
          onChange={(v) => patch({ indirizzo: sliceInputValue(v, TEXT_LONG) })}
          placeholder="Via, CAP, città, provincia"
        />
      </div>
      <div>
        <label className={dsLabel} htmlFor="ordine-fornitore-piva">
          Partita IVA
        </label>
        <input
          id="ordine-fornitore-piva"
          className={dsInput}
          value={snapshot.partitaIva}
          disabled={disabled}
          maxLength={TEXT_SHORT}
          onChange={(e) => patch({ partitaIva: sliceInputValue(e.target.value, TEXT_SHORT) })}
          placeholder="IT12345678901"
        />
      </div>
      <div>
        <label className={dsLabel} htmlFor="ordine-fornitore-cf">
          Codice fiscale
        </label>
        <input
          id="ordine-fornitore-cf"
          className={dsInput}
          value={snapshot.codiceFiscale}
          disabled={disabled}
          maxLength={TEXT_SHORT}
          onChange={(e) => patch({ codiceFiscale: sliceInputValue(e.target.value, TEXT_SHORT) })}
          placeholder="Se vuoto, uguale a P. IVA"
        />
      </div>
      <div className="sm:col-span-2">
        <label className={dsLabel} htmlFor="ordine-fornitore-email">
          Email fornitore
        </label>
        <input
          id="ordine-fornitore-email"
          className={dsInput}
          type="email"
          value={snapshot.email}
          disabled={disabled}
          maxLength={TEXT_SHORT}
          onChange={(e) => patch({ email: sliceInputValue(e.target.value, TEXT_SHORT) })}
          placeholder="ordini@fornitore.it"
        />
      </div>
      <div className="sm:col-span-2">
        <label className={dsLabel} htmlFor="ordine-fornitore-telefono">
          Telefono
        </label>
        <input
          id="ordine-fornitore-telefono"
          className={dsInput}
          type="tel"
          value={snapshot.telefono}
          disabled={disabled}
          maxLength={TEXT_SHORT}
          onChange={(e) => patch({ telefono: sliceInputValue(e.target.value, TEXT_SHORT) })}
        />
      </div>
    </div>
  );
}
