"use client";

import { GlobalDatePickerYmd, GlobalFixedListPillSelect } from "@/components/gestionale/global-input";
import { FormField } from "@/components/gestionale/schede/gestionale-form-section";
import {
  parseOrdineFornitoreLogistica,
  patchOrdineFornitoreLogisticaSnapshot,
  type OrdineFornitoreSpedizioneCura,
} from "@/lib/ordini-fornitori/ordine-fornitore-logistica";
import {
  ORDINE_FORNITORE_ASPETTO_ESTERIORE_ITEMS,
  ORDINE_FORNITORE_CAUSALE_TRASPORTO_ITEMS,
  ORDINE_FORNITORE_LOGISTICA_PILL_SHELL,
  ORDINE_FORNITORE_METODO_PAGAMENTO_ITEMS,
  ORDINE_FORNITORE_PORTO_ITEMS,
  ORDINE_FORNITORE_SPEDIZIONE_CURA_ITEMS,
  ORDINE_FORNITORE_VETTORE_ITEMS,
  logisticaAltroCustomText,
  logisticaSelectBindingValue,
  logisticaShowsAltroInput,
  type OrdineFornitoreLogisticaSelectItem,
} from "@/lib/ordini-fornitori/ordine-fornitore-logistica-ui";
import {
  ORDINE_FORNITORE_ASPETTO_ESTERIORE_VALUES,
  ORDINE_FORNITORE_VETTORE_VALUES,
} from "@/lib/ordini-fornitori/ordine-fornitore-logistica-options";
import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";
import { dsInput } from "@/lib/ui/design-system";
import { sliceInputValue, TEXT_SHORT } from "@/lib/validation/text-field-limits";

const selectProps = {
  size: "form" as const,
  shellClass: ORDINE_FORNITORE_LOGISTICA_PILL_SHELL,
};

function LogisticaSelectField({
  label,
  value,
  onChange,
  options,
  ariaLabel,
  readOnly,
  allowAltro,
  knownValues,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: readonly OrdineFornitoreLogisticaSelectItem[];
  ariaLabel: string;
  readOnly: boolean;
  allowAltro?: boolean;
  knownValues?: readonly { value: string }[];
}) {
  const selectValue =
    allowAltro && knownValues ? logisticaSelectBindingValue(knownValues, value) : value;
  const showAltroInput =
    allowAltro && knownValues ? logisticaShowsAltroInput(knownValues, value) : false;
  const altroText = allowAltro && knownValues ? logisticaAltroCustomText(knownValues, value) : "";

  return (
    <FormField label={label}>
      <div className="space-y-2">
        <GlobalFixedListPillSelect
          value={selectValue}
          onChange={(v) => {
            if (allowAltro && v === "altro") onChange("altro");
            else onChange(v);
          }}
          options={options}
          ariaLabel={ariaLabel}
          disabled={readOnly}
          {...selectProps}
        />
        {showAltroInput ? (
          <input
            className={dsInput}
            value={altroText}
            disabled={readOnly}
            maxLength={TEXT_SHORT}
            placeholder="Specifica…"
            aria-label={`${ariaLabel} — testo libero`}
            onChange={(e) => onChange(sliceInputValue(e.target.value, TEXT_SHORT))}
          />
        ) : null}
      </div>
    </FormField>
  );
}

export function OrdineFornitoreLogisticaFields({
  record,
  readOnly,
  onRecordChange,
}: {
  record: OrdineFornitoreRecord;
  readOnly: boolean;
  onRecordChange: (next: OrdineFornitoreRecord) => void;
}) {
  const logistica = parseOrdineFornitoreLogistica(record.logisticaSnapshot);

  function patch(patch: Parameters<typeof patchOrdineFornitoreLogisticaSnapshot>[1]) {
    onRecordChange({
      ...record,
      logisticaSnapshot: patchOrdineFornitoreLogisticaSnapshot(record.logisticaSnapshot, patch),
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <LogisticaSelectField
        label="Aspetto esteriore"
        value={logistica.aspettoEsteriore}
        onChange={(v) => patch({ aspettoEsteriore: v })}
        options={ORDINE_FORNITORE_ASPETTO_ESTERIORE_ITEMS}
        knownValues={ORDINE_FORNITORE_ASPETTO_ESTERIORE_VALUES}
        allowAltro
        ariaLabel="Aspetto esteriore"
        readOnly={readOnly}
      />
      <LogisticaSelectField
        label="Spedizione a cura di"
        value={logistica.trasportoCura}
        onChange={(v) => patch({ trasportoCura: v as OrdineFornitoreSpedizioneCura })}
        options={ORDINE_FORNITORE_SPEDIZIONE_CURA_ITEMS}
        ariaLabel="Spedizione a cura di"
        readOnly={readOnly}
      />
      <LogisticaSelectField
        label="Causale trasporto"
        value={logistica.causaleTrasporto}
        onChange={(v) => patch({ causaleTrasporto: v })}
        options={ORDINE_FORNITORE_CAUSALE_TRASPORTO_ITEMS}
        ariaLabel="Causale trasporto"
        readOnly={readOnly}
      />
      <LogisticaSelectField
        label="Porto"
        value={logistica.porto}
        onChange={(v) => patch({ porto: v })}
        options={ORDINE_FORNITORE_PORTO_ITEMS}
        ariaLabel="Porto"
        readOnly={readOnly}
      />
      <LogisticaSelectField
        label="Vettore"
        value={logistica.vettore}
        onChange={(v) => patch({ vettore: v })}
        options={ORDINE_FORNITORE_VETTORE_ITEMS}
        knownValues={ORDINE_FORNITORE_VETTORE_VALUES}
        allowAltro
        ariaLabel="Vettore"
        readOnly={readOnly}
      />
      <LogisticaSelectField
        label="Metodo di pagamento"
        value={logistica.metodoPagamento}
        onChange={(v) => patch({ metodoPagamento: v })}
        options={ORDINE_FORNITORE_METODO_PAGAMENTO_ITEMS}
        ariaLabel="Metodo di pagamento"
        readOnly={readOnly}
      />
      <FormField label="Riferimento ordine" htmlFor="ordine-riferimento">
        <input
          id="ordine-riferimento"
          className={dsInput}
          value={logistica.riferimentoOrdine}
          disabled={readOnly}
          maxLength={TEXT_SHORT}
          onChange={(e) => patch({ riferimentoOrdine: sliceInputValue(e.target.value, TEXT_SHORT) })}
        />
      </FormField>
      <FormField label="N. colli" htmlFor="ordine-colli">
        <input
          id="ordine-colli"
          className={`${dsInput} tabular-nums`}
          value={logistica.numeroColli}
          disabled={readOnly}
          maxLength={TEXT_SHORT}
          inputMode="numeric"
          onChange={(e) => patch({ numeroColli: sliceInputValue(e.target.value, TEXT_SHORT) })}
        />
      </FormField>
      <FormField label="Peso" htmlFor="ordine-peso">
        <input
          id="ordine-peso"
          className={dsInput}
          value={logistica.peso}
          disabled={readOnly}
          maxLength={TEXT_SHORT}
          placeholder="es. 15 kg"
          onChange={(e) => patch({ peso: sliceInputValue(e.target.value, TEXT_SHORT) })}
        />
      </FormField>
      <FormField label="Data consegna" htmlFor="ordine-data-consegna">
        <GlobalDatePickerYmd
          id="ordine-data-consegna"
          variant="default"
          valueYmd={logistica.dataConsegna}
          disabled={readOnly}
          onChangeYmd={(ymd) => patch({ dataConsegna: ymd })}
          aria-label="Data consegna"
        />
      </FormField>
    </div>
  );
}
