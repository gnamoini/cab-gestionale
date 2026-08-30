"use client";

import type { FornitoreAnagraficaSettings } from "@/lib/magazzino/fornitore-anagrafica";
import { FORNITORE_EMAIL_AGGIUNTIVE_MAX as EMAIL_MAX } from "@/lib/magazzino/fornitore-anagrafica";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import { dsBtnNeutralForm, dsInput } from "@/lib/ui/design-system";
import { sliceInputValue, TEXT_LONG, TEXT_SHORT } from "@/lib/validation/text-field-limits";

export function SettingsFornitoreAnagraficaFields({
  anagrafica,
  disabled,
  onChange,
}: {
  anagrafica: FornitoreAnagraficaSettings;
  disabled?: boolean;
  onChange: (patch: Partial<FornitoreAnagraficaSettings>) => void;
}) {
  return (
    <div className="grid gap-2 border-t border-[color:var(--cab-border)] pt-3 sm:grid-cols-2">
      <label className="block space-y-1 sm:col-span-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
          Ragione sociale
        </span>
        <input
          className={dsInput}
          value={anagrafica.ragioneSociale}
          disabled={disabled}
          maxLength={TEXT_SHORT}
          placeholder="Nome legale fornitore"
          onChange={(e) => onChange({ ragioneSociale: sliceInputValue(e.target.value, TEXT_SHORT) })}
        />
      </label>
      <label className="block space-y-1 sm:col-span-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
          Indirizzo
        </span>
        <GestionaleTextarea
          size="sm"
          className="min-h-[4.5rem] resize-y py-2"
          value={anagrafica.indirizzo}
          disabled={disabled}
          maxLength={TEXT_LONG}
          rows={2}
          autoGrow={false}
          placeholder="Via, CAP, città, provincia"
          onChange={(v) => onChange({ indirizzo: sliceInputValue(v, TEXT_LONG) })}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
          Partita IVA
        </span>
        <input
          className={dsInput}
          value={anagrafica.partitaIva}
          disabled={disabled}
          maxLength={TEXT_SHORT}
          placeholder="IT12345678901"
          onChange={(e) => onChange({ partitaIva: sliceInputValue(e.target.value, TEXT_SHORT) })}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
          Codice fiscale
        </span>
        <input
          className={dsInput}
          value={anagrafica.codiceFiscale}
          disabled={disabled}
          maxLength={TEXT_SHORT}
          placeholder="Se vuoto, uguale a P. IVA"
          onChange={(e) => onChange({ codiceFiscale: sliceInputValue(e.target.value, TEXT_SHORT) })}
        />
      </label>
      <label className="block space-y-1 sm:col-span-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
          Email principale
        </span>
        <input
          className={dsInput}
          type="email"
          value={anagrafica.email}
          disabled={disabled}
          maxLength={TEXT_SHORT}
          placeholder="ordini@fornitore.it"
          onChange={(e) => onChange({ email: sliceInputValue(e.target.value, TEXT_SHORT) })}
        />
      </label>
      <div className="space-y-2 sm:col-span-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
          Email aggiuntive (max {EMAIL_MAX})
        </span>
        {anagrafica.emailAggiuntive.map((em, idx) => (
          <div key={`${em}-${idx}`} className="flex gap-2">
            <input
              className={dsInput}
              type="email"
              value={em}
              disabled={disabled}
              maxLength={TEXT_SHORT}
              onChange={(e) => {
                const next = [...anagrafica.emailAggiuntive];
                next[idx] = sliceInputValue(e.target.value, TEXT_SHORT);
                onChange({ emailAggiuntive: next });
              }}
            />
            <button
              type="button"
              className={dsBtnNeutralForm}
              disabled={disabled}
              onClick={() => onChange({ emailAggiuntive: anagrafica.emailAggiuntive.filter((_, i) => i !== idx) })}
            >
              Rimuovi
            </button>
          </div>
        ))}
        {anagrafica.emailAggiuntive.length < EMAIL_MAX ? (
          <button
            type="button"
            className={dsBtnNeutralForm}
            disabled={disabled}
            onClick={() => onChange({ emailAggiuntive: [...anagrafica.emailAggiuntive, ""] })}
          >
            Aggiungi email
          </button>
        ) : null}
      </div>
      <label className="block space-y-1 sm:col-span-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
          Telefono
        </span>
        <input
          className={dsInput}
          type="tel"
          value={anagrafica.telefono}
          disabled={disabled}
          maxLength={TEXT_SHORT}
          onChange={(e) => onChange({ telefono: sliceInputValue(e.target.value, TEXT_SHORT) })}
        />
      </label>
    </div>
  );
}
