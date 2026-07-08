"use client";

import { type Dispatch, type SetStateAction } from "react";
import { settingsConfigFieldId } from "@/components/dashboard/settings/settings-config-field-id";
import { SettingsFornitoreAnagraficaFields } from "@/components/dashboard/settings/settings-fornitore-anagrafica-fields";
import { SettingsUnifiedStringList } from "@/components/dashboard/settings/settings-unified-string-list";
import { SettingsDiscountField, type SettingsSectionLayout } from "@/components/dashboard/settings-list-ui";
import { clampScontoRicambiPercent } from "@/lib/mezzi/cliente-commerciale";
import {
  getFornitoreAnagraficaSettings,
  setFornitoreAnagraficaSettings,
} from "@/lib/magazzino/fornitore-anagrafica";
import {
  getScontoFornitoreAlternativo,
  registerFornitoreInMagazzinoMaster,
  removeFornitoreFromMagazzinoMaster,
  renameFornitoreInMagazzinoMaster,
  setScontoFornitoreAlternativo,
} from "@/lib/magazzino/fornitore-alternativo-sconto";
import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";

export function SettingsMagazzinoFornitoriList({
  mag,
  setMag,
  onRename,
  layout = "flat",
}: {
  mag: MagazzinoMasterPrefs;
  setMag: Dispatch<SetStateAction<MagazzinoMasterPrefs>>;
  onRename: (from: string, to: string) => void;
  layout?: SettingsSectionLayout;
}) {
  return (
    <SettingsUnifiedStringList
      layout={layout}
      title="Fornitori alternativi"
      description="Fornitore alternativo: sconto % su acquisti ricambi e anagrafica per ordini fornitori."
      values={mag.fornitori}
      placeholder="Nuovo fornitore"
      onAdd={(t) => {
        setMag((prev) => registerFornitoreInMagazzinoMaster(prev, t));
      }}
      onRemove={(nome) => {
        setMag((prev) => removeFornitoreFromMagazzinoMaster(prev, nome));
      }}
      onRename={(from, to) => {
        setMag((prev) => renameFornitoreInMagazzinoMaster(prev, from, to));
        onRename(from, to);
      }}
      renderRowTrailing={(nome) => {
        const sconto = getScontoFornitoreAlternativo(mag, nome);
        return (
          <SettingsDiscountField
            id={settingsConfigFieldId("config-sconto-fornitore", nome)}
            label="Sconto listino %"
            value={sconto}
            step={0.1}
            ariaLabel={`Sconto listino fornitore alternativo ${nome}`}
            onChange={(n) => {
              setMag((prev) => setScontoFornitoreAlternativo(prev, nome, clampScontoRicambiPercent(n)));
            }}
          />
        );
      }}
      renderRowBelow={(nome) => (
        <SettingsFornitoreAnagraficaFields
          anagrafica={getFornitoreAnagraficaSettings(mag, nome)}
          onChange={(patch) => {
            setMag((prev) => setFornitoreAnagraficaSettings(prev, nome, patch));
          }}
        />
      )}
    />
  );
}
