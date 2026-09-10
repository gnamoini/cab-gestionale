"use client";

import { FormField, FormSection } from "@/components/gestionale/schede/gestionale-form-section";
import type { ClienteAnagrafica } from "@/lib/clienti/clienti-anagrafica-types";
import { dsInput } from "@/lib/ui/design-system";

export function ClientePagamentiContabilitaFields({
  model,
  onChange,
  readOnly,
}: {
  model: ClienteAnagrafica;
  onChange: (next: ClienteAnagrafica) => void;
  readOnly?: boolean;
}) {
  return (
    <>
      <FormSection title="Fatturazione elettronica">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="PEC">
            <input
              className={dsInput}
              type="email"
              value={model.pec}
              disabled={readOnly}
              onChange={(e) => onChange({ ...model, pec: e.target.value })}
            />
          </FormField>
          <FormField label="Codice destinatario">
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

      <FormSection title="Pagamenti">
        <p className="mb-2 text-[10px] text-[color:var(--cab-text-muted)]">
          Condizione pagamento = quando (scadenze). Modalità pagamento = come (bonifico, Ri.Ba., …).
        </p>
        <FormField label="Note pagamenti">
          <input
            className={dsInput}
            value={model.notePagamenti}
            disabled={readOnly}
            placeholder="Configurazione strutturata da riferimenti contabili"
            onChange={(e) => onChange({ ...model, notePagamenti: e.target.value })}
          />
        </FormField>
      </FormSection>

      <FormSection title="Contabilità">
        <p className="text-[10px] text-[color:var(--cab-text-muted)]">
          Conto contabile e sezionale documentale si configurano tramite riferimenti al piano dei conti e alle serie
          fattura (non al giornale contabile).
        </p>
      </FormSection>
    </>
  );
}
