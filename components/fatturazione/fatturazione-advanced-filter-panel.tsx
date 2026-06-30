"use client";

import { GlobalFilterDateField } from "@/components/gestionale/global-input/global-date-picker";
import { GlobalSelect } from "@/components/gestionale/global-input/global-select";
import { GlobalSettingsListSelect } from "@/components/gestionale/global-input/global-settings-list-select";
import {
  LavorazioniFilterField,
  LavorazioniFilterGroup,
} from "@/components/gestionale/lavorazioni/lavorazioni-filter-fields";
import {
  FATTURAZIONE_ADVANCED_FILTERS_EMPTY,
  invoiceStatusLabel,
  type FatturazioneAdvancedFilters,
  type FatturazioneScadenzaPreset,
} from "@/lib/fatturazione/fatturazione-advanced-filters";
import { INVOICE_STATUSES } from "@/lib/fatturazione/invoice-calculations";

const SCADENZA_ITEMS: { value: FatturazioneScadenzaPreset; label: string }[] = [
  { value: "all", label: "Tutte le scadenze" },
  { value: "oggi", label: "Scadenza oggi" },
  { value: "settimana", label: "Scadenza settimana" },
  { value: "mese", label: "Scadenza mese" },
  { value: "scadute", label: "Scadute" },
];

export function FatturazioneAdvancedFilterPanel({
  filters,
  onChange,
}: {
  filters: FatturazioneAdvancedFilters;
  onChange: (patch: Partial<FatturazioneAdvancedFilters>) => void;
}) {
  const statusItems = [
    { value: "", label: "Tutti gli stati" },
    ...INVOICE_STATUSES.map((s) => ({ value: s, label: invoiceStatusLabel(s) })),
  ];

  return (
    <div className="space-y-3" aria-label="Filtri avanzati fatturazione">
      <LavorazioniFilterGroup title="Documento">
        <LavorazioniFilterField label="Stato">
          <GlobalSelect
            value={filters.status}
            onChange={(v) => onChange({ status: v as FatturazioneAdvancedFilters["status"] })}
            items={statusItems}
            selectOnly
            aria-label="Filtra per stato fattura"
          />
        </LavorazioniFilterField>
        <LavorazioniFilterField label="Cliente">
          <GlobalSettingsListSelect
            listKey="mezzi:clienti"
            value={filters.cliente}
            onChange={(v) => onChange({ cliente: v })}
            placeholder="Tutti i clienti"
            filterNeutralValues={[""]}
            aria-label="Filtra per cliente"
          />
        </LavorazioniFilterField>
      </LavorazioniFilterGroup>
      <LavorazioniFilterGroup title="Date emissione">
        <LavorazioniFilterField label="Da">
          <GlobalFilterDateField
            valueYmd={filters.dataEmissioneFrom}
            onChangeYmd={(v) => onChange({ dataEmissioneFrom: v })}
            aria-label="Data emissione da"
          />
        </LavorazioniFilterField>
        <LavorazioniFilterField label="A">
          <GlobalFilterDateField
            valueYmd={filters.dataEmissioneTo}
            onChangeYmd={(v) => onChange({ dataEmissioneTo: v })}
            aria-label="Data emissione a"
          />
        </LavorazioniFilterField>
      </LavorazioniFilterGroup>
      <LavorazioniFilterGroup title="Scadenze">
        <LavorazioniFilterField label="Preset scadenza">
          <GlobalSelect
            value={filters.scadenzaPreset}
            onChange={(v) => onChange({ scadenzaPreset: v as FatturazioneScadenzaPreset })}
            items={SCADENZA_ITEMS}
            selectOnly
            aria-label="Filtra scadenze"
          />
        </LavorazioniFilterField>
      </LavorazioniFilterGroup>
      <button
        type="button"
        className="text-xs font-medium text-[color:var(--cab-primary)] underline-offset-2 hover:underline"
        onClick={() => onChange(FATTURAZIONE_ADVANCED_FILTERS_EMPTY)}
      >
        Reimposta filtri
      </button>
    </div>
  );
}
