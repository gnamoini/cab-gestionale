"use client";

import Link from "next/link";
import { useMemo } from "react";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import { GlobalSelect } from "@/components/gestionale/global-input";
import { impostazioniPathForSection } from "@/components/dashboard/settings/settings-workspace-types";
import {
  parseOrdineFornitoreDestinatarioSnapshot,
  patchOrdineFornitoreDestinatarioSnapshot,
} from "@/lib/ordini-fornitori/destinatario-snapshot";
import {
  applyDestinazioneAltro,
  applyDestinazioneMagazzino,
  readDestinazioneTipo,
  type OrdineFornitoreDestinazioneTipo,
} from "@/lib/ordini-fornitori/ordine-fornitore-destinazione";
import type { OrdineFornitoreDestinatarioAnagrafica } from "@/lib/ordini-fornitori/destinatario-snapshot";
import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";
import {
  resolveOfficinaBancaIban,
  type OfficinaBancaOrdini,
} from "@/lib/officina/officina-banche-ordini";
import { dsFocus, dsInput, dsLabel, dsSegmentedBtnOff, dsSegmentedBtnOn, dsSegmentedWrap } from "@/lib/ui/design-system";
import { sliceInputValue, TEXT_LONG, TEXT_SHORT } from "@/lib/validation/text-field-limits";

const segmentWrap = `${dsSegmentedWrap} w-full min-w-0 gap-0.5 p-0.5`;
const segmentOn = `${dsSegmentedBtnOn} min-w-0 flex-1 px-2.5 py-2 text-xs max-sm:min-h-11`;
const segmentOff = `${dsSegmentedBtnOff} min-w-0 flex-1 px-2.5 py-2 text-xs max-sm:min-h-11`;

const OPTIONS: { value: OrdineFornitoreDestinazioneTipo; label: string }[] = [
  { value: "magazzino", label: "Magazzino" },
  { value: "altro", label: "Altro" },
];

export function OrdineFornitoreDestinazioneFields({
  record,
  sedeOperativaLine,
  sedeOperativaConfigured,
  destinatarioAnagrafica,
  bancheSalvate,
  readOnly,
  onRecordChange,
}: {
  record: OrdineFornitoreRecord;
  sedeOperativaLine: string;
  sedeOperativaConfigured: boolean;
  destinatarioAnagrafica: OrdineFornitoreDestinatarioAnagrafica;
  bancheSalvate: readonly OfficinaBancaOrdini[];
  readOnly: boolean;
  onRecordChange: (next: OrdineFornitoreRecord) => void;
}) {
  const snapshot = parseOrdineFornitoreDestinatarioSnapshot(record.destinazioneSnapshot, record.destinazione);
  const tipo = readDestinazioneTipo(record.destinazioneSnapshot, record.destinazione, sedeOperativaLine);
  const bancaItems = useMemo(
    () => [
      { value: "", label: "Seleziona banca" },
      ...bancheSalvate.map((b) => ({ value: b.nome, label: b.nome })),
    ],
    [bancheSalvate],
  );

  function patchAnagrafica(patch: Partial<typeof snapshot>) {
    const nextSnapshot = patchOrdineFornitoreDestinatarioSnapshot(
      record.destinazioneSnapshot,
      record.destinazione,
      patch,
    );
    const parsed = parseOrdineFornitoreDestinatarioSnapshot(nextSnapshot, record.destinazione);
    onRecordChange({
      ...record,
      destinazione: parsed.indirizzo.trim(),
      destinazioneSnapshot: nextSnapshot,
    });
  }

  function setTipo(next: OrdineFornitoreDestinazioneTipo) {
    if (next === tipo) return;
    if (next === "magazzino") {
      onRecordChange(applyDestinazioneMagazzino(record, sedeOperativaLine, destinatarioAnagrafica));
      return;
    }
    onRecordChange(applyDestinazioneAltro(record));
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className={dsLabel} id="ordine-destinazione-label">
          Destinazione merce
        </label>
        <div className={segmentWrap} role="group" aria-labelledby="ordine-destinazione-label">
          {OPTIONS.map(({ value, label }) => {
            const active = tipo === value;
            return (
              <button
                key={value}
                type="button"
                disabled={readOnly}
                aria-pressed={active}
                onClick={() => setTipo(value)}
                className={`${active ? segmentOn : segmentOff} ${dsFocus}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {tipo === "magazzino" && !sedeOperativaConfigured ? (
        <p className="rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-3 py-2.5 text-sm text-[color:var(--cab-text-muted)]">
          Sede operativa non configurata.{" "}
          <Link
            href={impostazioniPathForSection("sys-officina-profilo")}
            className="font-semibold text-[color:var(--cab-primary)] underline-offset-2 hover:underline"
          >
            Impostazioni → Profilo officina
          </Link>
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={dsLabel} htmlFor="ordine-destinatario-label">
            Ragione sociale
          </label>
          <input
            id="ordine-destinatario-label"
            className={dsInput}
            value={snapshot.label}
            disabled={readOnly}
            maxLength={TEXT_SHORT}
            onChange={(e) => patchAnagrafica({ label: sliceInputValue(e.target.value, TEXT_SHORT) })}
            placeholder="Nome destinatario"
          />
        </div>
        <div className="sm:col-span-2">
          <label className={dsLabel} htmlFor="ordine-destinatario-indirizzo">
            Indirizzo (sede operativa)
          </label>
          <GestionaleTextarea
            id="ordine-destinatario-indirizzo"
            value={snapshot.indirizzo}
            disabled={readOnly}
            rows={2}
            maxLength={TEXT_LONG}
            onChange={(v) => patchAnagrafica({ indirizzo: sliceInputValue(v, TEXT_LONG) })}
            placeholder="Via, CAP, città, provincia"
          />
        </div>
        <div>
          <label className={dsLabel} htmlFor="ordine-destinatario-piva">
            Partita IVA
          </label>
          <input
            id="ordine-destinatario-piva"
            className={dsInput}
            value={snapshot.partitaIva}
            disabled={readOnly}
            maxLength={TEXT_SHORT}
            onChange={(e) => patchAnagrafica({ partitaIva: sliceInputValue(e.target.value, TEXT_SHORT) })}
            placeholder="IT12345678901"
          />
        </div>
        <div>
          <label className={dsLabel} htmlFor="ordine-destinatario-cf">
            Codice fiscale
          </label>
          <input
            id="ordine-destinatario-cf"
            className={dsInput}
            value={snapshot.codiceFiscale}
            disabled={readOnly}
            maxLength={TEXT_SHORT}
            onChange={(e) => patchAnagrafica({ codiceFiscale: sliceInputValue(e.target.value, TEXT_SHORT) })}
            placeholder="Se vuoto, uguale a P. IVA"
          />
        </div>
        <div className="sm:col-span-2">
          <label className={dsLabel} htmlFor="ordine-destinatario-telefono">
            Telefono
          </label>
          <input
            id="ordine-destinatario-telefono"
            className={dsInput}
            type="tel"
            value={snapshot.telefono}
            disabled={readOnly}
            maxLength={TEXT_SHORT}
            onChange={(e) => patchAnagrafica({ telefono: sliceInputValue(e.target.value, TEXT_SHORT) })}
          />
        </div>
        <div>
          <label className={dsLabel} htmlFor="ordine-destinatario-banca-nome">
            Nome banca
          </label>
          {bancheSalvate.length > 0 ? (
            <GlobalSelect
              value={snapshot.bancaAppoggioNome}
              onChange={(nome) =>
                patchAnagrafica({
                  bancaAppoggioNome: nome,
                  bancaAppoggioIban: nome ? resolveOfficinaBancaIban(bancheSalvate, nome) : "",
                })
              }
              disabled={readOnly}
              items={bancaItems}
              selectOnly
              aria-label="Nome banca d'appoggio"
            />
          ) : (
            <p className="rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-3 py-2.5 text-sm text-[color:var(--cab-text-muted)]">
              Nessuna banca configurata.{" "}
              <Link
                href={impostazioniPathForSection("sys-officina-profilo")}
                className="font-semibold text-[color:var(--cab-primary)] underline-offset-2 hover:underline"
              >
                Impostazioni → Profilo officina
              </Link>
            </p>
          )}
        </div>
        <div>
          <label className={dsLabel} htmlFor="ordine-destinatario-banca-iban">
            IBAN
          </label>
          <input
            id="ordine-destinatario-banca-iban"
            className={dsInput}
            value={snapshot.bancaAppoggioIban}
            readOnly
            aria-readonly
            placeholder="Da banca selezionata"
          />
        </div>
      </div>
    </div>
  );
}
