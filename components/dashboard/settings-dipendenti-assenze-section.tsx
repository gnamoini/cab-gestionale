"use client";

import { useState } from "react";
import {
  SETTINGS_DISCOUNT_INPUT,
  SETTINGS_LIST_INPUT,
  SETTINGS_ROW_BTN_DANGER,
  SETTINGS_SECTION_CARD,
  SettingsAddRow,
  SettingsSectionHeader,
} from "@/components/dashboard/settings-list-ui";
import { createTipoAssenzaId, type TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";

const ROW_GRID =
  "grid grid-cols-[2.75rem_minmax(0,1fr)_2.25rem_auto] items-center gap-x-2 px-2 py-1";

export function SettingsDipendentiAssenzeSection({
  tipi,
  onChange,
}: {
  tipi: TipoAssenzaConfig[];
  onChange: (next: TipoAssenzaConfig[]) => void;
}) {
  const [nuovo, setNuovo] = useState("");
  const sorted = [...tipi].sort((a, b) => a.sortOrder - b.sortOrder);

  const handleAdd = () => {
    const trimmed = nuovo.trim();
    if (!trimmed) return;
    if (tipi.some((t) => t.label.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([
      ...tipi,
      {
        id: createTipoAssenzaId(),
        label: trimmed,
        abbrev: trimmed.slice(0, 3).toUpperCase(),
        sortOrder: tipi.length,
      },
    ]);
    setNuovo("");
  };

  return (
    <div className={SETTINGS_SECTION_CARD}>
      <SettingsSectionHeader
        level="card"
        title="Tipi assenza dipendenti"
        description="Sigle mostrate nelle celle presenze (es. F = Ferie). I record già salvati mantengono l&apos;etichetta originale."
      />

      <div className="mt-3 overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)]">
        <div
          className={`${ROW_GRID} border-b border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_40%,var(--cab-card))] py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]`}
          aria-hidden
        >
          <span>Sigla</span>
          <span>Nome</span>
          <span className="text-center" title="Richiede motivo personalizzato (tipo Altro)">
            Altro
          </span>
          <span className="sr-only">Azioni</span>
        </div>

        <ul className="divide-y divide-[color:var(--cab-border)]">
          {sorted.map((t) => (
            <li key={t.id} className={`${ROW_GRID} transition-colors hover:bg-[var(--cab-hover)]`}>
              <input
                className={`${SETTINGS_DISCOUNT_INPUT} w-full font-mono uppercase`}
                value={t.abbrev}
                maxLength={6}
                inputMode="text"
                autoCapitalize="characters"
                aria-label={`Sigla ${t.label}`}
                onChange={(e) =>
                  onChange(
                    tipi.map((x) => (x.id === t.id ? { ...x, abbrev: e.target.value.slice(0, 6) } : x)),
                  )
                }
              />
              <input
                className={SETTINGS_LIST_INPUT}
                value={t.label}
                aria-label={`Nome ${t.label}`}
                onChange={(e) =>
                  onChange(tipi.map((x) => (x.id === t.id ? { ...x, label: e.target.value } : x)))
                }
              />
              <label className="flex min-w-0 cursor-pointer items-center justify-center">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-[color:var(--cab-border)]"
                  checked={Boolean(t.requiresCustomText)}
                  title="Richiede motivo personalizzato (tipo Altro)"
                  aria-label={`${t.label}: richiede testo libero`}
                  onChange={(e) =>
                    onChange(
                      tipi.map((x) =>
                        x.id === t.id ? { ...x, requiresCustomText: e.target.checked } : x,
                      ),
                    )
                  }
                />
              </label>
              <button
                type="button"
                className={SETTINGS_ROW_BTN_DANGER}
                aria-label={`Elimina ${t.label}`}
                onClick={() => onChange(tipi.filter((x) => x.id !== t.id))}
              >
                Elimina
              </button>
            </li>
          ))}
        </ul>
      </div>

      <SettingsAddRow
        value={nuovo}
        onChange={setNuovo}
        placeholder="Nuovo tipo, es. Formazione"
        inputAriaLabel="Nome nuovo tipo assenza"
        onAdd={handleAdd}
      />
    </div>
  );
}
