"use client";

import { CloseButton } from "@/components/design-system";
import { FormField, FormSection } from "@/components/gestionale/schede/gestionale-form-section";
import { GlobalSelect } from "@/components/gestionale/global-input";
import {
  addClienteContatto,
  moveClienteContattoDown,
  moveClienteContattoUp,
  removeClienteContatto,
} from "@/lib/clienti/clienti-contatti-order";
import {
  CLIENTE_CONTATTO_TIPO_LABELS,
  CLIENTE_CONTATTO_TIPO_OPTIONS,
  emptyClienteContatto,
  type ClienteAnagrafica,
  type ClienteContattoTipo,
} from "@/lib/clienti/clienti-anagrafica-types";
import { dsBtnNeutralForm, dsInput } from "@/lib/ui/design-system";

export function ClienteContattiEditor({
  model,
  onChange,
  readOnly,
}: {
  model: ClienteAnagrafica;
  onChange: (next: ClienteAnagrafica) => void;
  readOnly?: boolean;
}) {
  const contatti = model.contatti;

  const patchRow = (id: string, patch: Partial<(typeof contatti)[number]>) => {
    onChange({
      ...model,
      contatti: contatti.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  };

  return (
    <FormSection
      title="Contatti"
      action={
        readOnly ? null : (
          <button
            type="button"
            className={dsBtnNeutralForm}
            onClick={() => onChange({ ...model, contatti: addClienteContatto(contatti, emptyClienteContatto(contatti.length)) })}
          >
            Aggiungi contatto
          </button>
        )
      }
    >
      {contatti.length === 0 ? (
        <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun contatto. Aggiungi email, PEC, telefono o altro.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {contatti.map((row, index) => (
            <li key={row.id} className={`min-w-0 ${index > 0 ? "border-t border-[color:var(--cab-border)] pt-3" : ""}`}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
                  Contatto {index + 1}
                </span>
                {!readOnly ? (
                  <div className="flex items-center gap-1">
                    <button type="button" className={dsBtnNeutralForm} onClick={() => onChange({ ...model, contatti: moveClienteContattoUp(contatti, row.id) })}>
                      Su
                    </button>
                    <button type="button" className={dsBtnNeutralForm} onClick={() => onChange({ ...model, contatti: moveClienteContattoDown(contatti, row.id) })}>
                      Giù
                    </button>
                    <CloseButton label={`Rimuovi contatto ${index + 1}`} className="h-9 w-9 shrink-0" onClick={() => onChange({ ...model, contatti: removeClienteContatto(contatti, row.id) })} />
                  </div>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Nome identificativo">
                  <input
                    className={dsInput}
                    value={row.etichetta}
                    disabled={readOnly}
                    placeholder="es. Amministrazione"
                    onChange={(e) => patchRow(row.id, { etichetta: e.target.value })}
                  />
                </FormField>
                <FormField label="Tipologia">
                  <GlobalSelect
                    value={row.tipo}
                    onChange={(v) => patchRow(row.id, { tipo: v as ClienteContattoTipo })}
                    disabled={readOnly}
                    items={CLIENTE_CONTATTO_TIPO_OPTIONS.map((t) => ({
                      value: t,
                      label: CLIENTE_CONTATTO_TIPO_LABELS[t],
                    }))}
                    selectOnly
                    aria-label={`Tipologia contatto ${index + 1}`}
                  />
                </FormField>
                <FormField label="Valore" className="sm:col-span-2">
                  <input
                    className={dsInput}
                    value={row.valore}
                    disabled={readOnly}
                    onChange={(e) => patchRow(row.id, { valore: e.target.value })}
                  />
                </FormField>
              </div>
            </li>
          ))}
        </ul>
      )}
    </FormSection>
  );
}
