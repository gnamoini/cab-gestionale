"use client";

import {
  SETTINGS_FORM_FIELD_ROW,
  SETTINGS_FORM_NUMERIC_INPUT,
  SETTINGS_SECTION_HINT,
  SettingsListFrame,
  SettingsListSection,
  type SettingsSectionLayout,
} from "@/components/dashboard/settings-list-ui";

const FIELD_ID = "config-costo-orario-default";

export function SettingsEconomiciSection({
  costoOrarioDefault,
  onChange,
  layout = "flat",
}: {
  costoOrarioDefault: number;
  onChange: (value: number) => void;
  layout?: SettingsSectionLayout;
}) {
  return (
    <SettingsListSection
      layout={layout}
      title={layout === "card" ? "Parametri economici" : undefined}
      description={
        layout === "card"
          ? "Costo manodopera di default per nuovi preventivi e report."
          : undefined
      }
    >
      <SettingsListFrame>
        <label htmlFor={FIELD_ID} className={SETTINGS_FORM_FIELD_ROW}>
          <span className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
            <span className="block text-sm font-semibold leading-snug text-[color:var(--cab-text)]">
              Costo manodopera default
            </span>
            <span className={`${SETTINGS_SECTION_HINT} mt-1 block max-w-xl`}>
              Valore orario in euro applicato ai nuovi preventivi e ai report quando non è indicato un costo specifico.
            </span>
          </span>
          <span className="flex w-full shrink-0 items-center sm:w-auto sm:self-center">
            <span className="relative w-full min-w-[8.5rem] max-w-full sm:w-[11rem] sm:max-w-[11rem]">
              <input
                id={FIELD_ID}
                type="number"
                inputMode="decimal"
                min={1}
                step={0.5}
                value={costoOrarioDefault}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isFinite(v) || v <= 0) return;
                  onChange(Math.round(v * 100) / 100);
                }}
                className={`${SETTINGS_FORM_NUMERIC_INPUT} pe-11`}
                aria-label="Costo manodopera default in euro all'ora"
              />
              <span
                className="pointer-events-none absolute inset-y-0 end-3 flex min-h-11 items-center text-xs font-semibold text-[color:var(--cab-text-muted)]"
                aria-hidden
              >
                €/h
              </span>
            </span>
          </span>
        </label>
      </SettingsListFrame>
    </SettingsListSection>
  );
}
