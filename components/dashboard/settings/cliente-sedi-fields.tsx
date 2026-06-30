"use client";

import { FormField, FormSection } from "@/components/gestionale/schede/gestionale-form-section";
import {
  patchClienteSedeLegale,
  patchClienteSedeOperativa,
  setSedeLegaleUgualeOperativa,
} from "@/lib/clienti/clienti-sede-sync";
import type { ClienteAnagrafica } from "@/lib/clienti/clienti-anagrafica-types";
import { dsInput } from "@/lib/ui/design-system";

function SedeBlock({
  title,
  fields,
  onPatch,
  disabled,
}: {
  title: string;
  fields: ClienteAnagrafica["sedi"]["operativa"];
  onPatch: (patch: Partial<ClienteAnagrafica["sedi"]["operativa"]>) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] p-3">
      <h4 className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">{title}</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Via" className="sm:col-span-2">
          <input className={dsInput} value={fields.via} disabled={disabled} onChange={(e) => onPatch({ via: e.target.value })} />
        </FormField>
        <FormField label="N. civico">
          <input
            className={dsInput}
            value={fields.numeroCivico}
            disabled={disabled}
            onChange={(e) => onPatch({ numeroCivico: e.target.value })}
          />
        </FormField>
        <FormField label="CAP">
          <input className={dsInput} value={fields.cap} disabled={disabled} onChange={(e) => onPatch({ cap: e.target.value })} />
        </FormField>
        <FormField label="Città">
          <input className={dsInput} value={fields.citta} disabled={disabled} onChange={(e) => onPatch({ citta: e.target.value })} />
        </FormField>
        <FormField label="Provincia">
          <input
            className={dsInput}
            value={fields.provincia}
            disabled={disabled}
            maxLength={2}
            onChange={(e) => onPatch({ provincia: e.target.value.toUpperCase() })}
          />
        </FormField>
        <FormField label="Stato">
          <input className={dsInput} value={fields.stato} disabled={disabled} onChange={(e) => onPatch({ stato: e.target.value })} />
        </FormField>
      </div>
    </div>
  );
}

export function ClienteSediFields({
  model,
  onChange,
  readOnly,
}: {
  model: ClienteAnagrafica;
  onChange: (next: ClienteAnagrafica) => void;
  readOnly?: boolean;
}) {
  return (
    <FormSection title="Sedi">
      <label className="flex items-start gap-2 text-sm text-[color:var(--cab-text)]">
        <input
          type="checkbox"
          className="mt-1"
          checked={model.sedeLegaleUgualeOperativa}
          disabled={readOnly}
          onChange={(e) => onChange(setSedeLegaleUgualeOperativa(model, e.target.checked))}
        />
        <span>Sede legale uguale alla sede operativa</span>
      </label>
      <SedeBlock
        title="Sede operativa"
        fields={model.sedi.operativa}
        disabled={readOnly}
        onPatch={(patch) => onChange(patchClienteSedeOperativa(model, patch))}
      />
      {!model.sedeLegaleUgualeOperativa ? (
        <SedeBlock
          title="Sede legale"
          fields={model.sedi.legale}
          disabled={readOnly}
          onPatch={(patch) => onChange(patchClienteSedeLegale(model, patch))}
        />
      ) : null}
    </FormSection>
  );
}

export function ClienteDatiFiscaliFields({
  model,
  onChange,
  readOnly,
}: {
  model: ClienteAnagrafica;
  onChange: (next: ClienteAnagrafica) => void;
  readOnly?: boolean;
}) {
  return (
    <FormSection title="Dati fiscali">
      <FormField label="Nome in elenco">
        <input className={dsInput} value={model.nomeDisplay} readOnly disabled />
        <p className="mt-1 text-[10px] text-[color:var(--cab-text-muted)]">Allineato alla lista Clienti in Impostazioni.</p>
      </FormField>
      <FormField label="Ragione sociale">
        <input
          className={dsInput}
          value={model.ragioneSociale}
          disabled={readOnly}
          onChange={(e) => onChange({ ...model, ragioneSociale: e.target.value })}
        />
      </FormField>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Partita IVA">
          <input
            className={dsInput}
            value={model.partitaIva}
            disabled={readOnly}
            inputMode="numeric"
            onChange={(e) => onChange({ ...model, partitaIva: e.target.value.replace(/\D/g, "").slice(0, 11) })}
          />
        </FormField>
        <FormField label="Codice destinatario (SDI)">
          <input
            className={dsInput}
            value={model.codiceDestinatario}
            disabled={readOnly}
            maxLength={7}
            onChange={(e) => onChange({ ...model, codiceDestinatario: e.target.value.toUpperCase().slice(0, 7) })}
          />
        </FormField>
      </div>
    </FormSection>
  );
}
