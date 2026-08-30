"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { SettingsEliminaConfirmDialog } from "@/components/dashboard/settings-elimina-confirm-dialog";
import { settingsConfigFieldId } from "@/components/dashboard/settings/settings-config-field-id";
import {
  SettingsDiscountField,
  SettingsEditableStringRow,
  SettingsEmptyState,
  SettingsListBody,
  SettingsListSection,
  SettingsListToolbar,
  SETTINGS_LIST_DIVIDER_UL,
  SETTINGS_LIST_DIVIDER_UL_SPACED,
  type SettingsSectionLayout,
} from "@/components/dashboard/settings-list-ui";
import { commitSettingsListDelete } from "@/lib/settings/settings-list-delete";
import { useSettingsSimilarGate } from "@/components/dashboard/use-settings-similar-gate";
import { clampScontoRicambiPercent } from "@/lib/mezzi/cliente-commerciale";
import {
  getFornitoreAnagraficaSettings,
  setFornitoreAnagraficaSettings,
} from "@/lib/magazzino/fornitore-anagrafica";
import {
  getScontoFornitoreMarca,
  registerMarcaInMagazzinoMaster,
  removeMarcaFromMagazzinoMaster,
  renameMarcaInMagazzinoMaster,
  setScontoFornitoreMarca,
} from "@/lib/magazzino/marca-fornitore-sconto";
import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";
import { filterSettingsStringList } from "@/lib/settings/settings-list-search";
import { ColorSwatchButton } from "@/components/gestionale/lavorazioni/lavorazioni-settings-ui";
import { SettingsFornitoreAnagraficaFields } from "@/components/dashboard/settings/settings-fornitore-anagrafica-fields";
import {
  getMarcaBadgeColorHex,
  MAGAZZINO_MARCA_BADGE_GRAY,
  setMarcaBadgeColor,
} from "@/lib/magazzino/marca-badge-color";

const SETTINGS_DRAFT_ROW_KEY = "__settings-draft__";

const CARD_DESCRIPTION =
  "Fornitore originale (marca ricambio): colore badge lista, sconto % sul listino OE e anagrafica ordini.";

export function SettingsMagazzinoMarcheList({
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
  const [q, setQ] = useState("");
  const [draftOpen, setDraftOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const { gate, similarDialog } = useSettingsSimilarGate();
  const filtered = useMemo(() => filterSettingsStringList(mag.marche, q), [mag.marche, q]);
  const listUlClass = layout === "flat" ? SETTINGS_LIST_DIVIDER_UL : SETTINGS_LIST_DIVIDER_UL_SPACED;

  const tryAdd = (raw: string) => {
    gate(mag.marche, raw, undefined, () => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      setMag((prev) => registerMarcaInMagazzinoMaster(prev, trimmed));
      setDraftOpen(false);
    });
  };

  const tryRename = (from: string, next: string) => {
    const t = next.trim();
    if (!t || t === from) return;
    gate(mag.marche, t, from, () => {
      setMag((prev) => renameMarcaInMagazzinoMaster(prev, from, t));
      onRename(from, t);
    });
  };

  const showList = draftOpen || filtered.length > 0;

  return (
    <SettingsListSection layout={layout} title="Marche ricambi" description={CARD_DESCRIPTION}>
      <SettingsListToolbar
        onStartAdd={() => setDraftOpen(true)}
        addDisabled={draftOpen}
        searchValue={q}
        onSearchChange={setQ}
        searchAriaLabel="Filtra marche ricambi"
      />
      <SettingsListBody
        layout={layout}
        showList={showList}
        empty={
          <SettingsEmptyState inline={layout === "flat"}>
            Nessuna marca. Usa Aggiungi per inserire la prima.
          </SettingsEmptyState>
        }
      >
        <ul className={listUlClass}>
          {draftOpen ? (
            <SettingsEditableStringRow
              key={SETTINGS_DRAFT_ROW_KEY}
              draft
              value=""
              placeholder="Nuova marca"
              onRenameBlur={(_, next) => tryAdd(next)}
              onDraftCancel={() => setDraftOpen(false)}
              onRemove={() => setDraftOpen(false)}
            />
          ) : null}
          {filtered.map((nome) => {
            const sconto = getScontoFornitoreMarca(mag, nome);
            return (
              <SettingsEditableStringRow
                key={nome}
                value={nome}
                onRenameBlur={tryRename}
                onRemove={() => setPendingDelete(nome)}
                trailing={
                  <div className="flex shrink-0 items-center justify-end gap-2 min-w-0 flex-nowrap sm:flex-wrap">
                    <ColorSwatchButton
                      value={getMarcaBadgeColorHex(mag, nome) ?? MAGAZZINO_MARCA_BADGE_GRAY}
                      onChange={(hex) => {
                        setMag((prev) => setMarcaBadgeColor(prev, nome, hex));
                      }}
                      ariaLabel={`Colore badge marca ${nome}`}
                      tooltipContent="Colore badge in lista magazzino"
                    />
                    <SettingsDiscountField
                      id={settingsConfigFieldId("config-sconto-marca", nome)}
                      label="Sconto listino %"
                      value={sconto}
                      step={0.1}
                      ariaLabel={`Sconto listino per ${nome}`}
                      onChange={(n) => {
                        setMag((prev) => setScontoFornitoreMarca(prev, nome, clampScontoRicambiPercent(n)));
                      }}
                    />
                  </div>
                }
                footer={
                  <SettingsFornitoreAnagraficaFields
                    anagrafica={getFornitoreAnagraficaSettings(mag, nome)}
                    onChange={(patch) => {
                      setMag((prev) => setFornitoreAnagraficaSettings(prev, nome, patch));
                    }}
                  />
                }
              />
            );
          })}
        </ul>
      </SettingsListBody>
      {similarDialog}
      <SettingsEliminaConfirmDialog
        open={pendingDelete != null}
        itemLabel={pendingDelete ?? undefined}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() =>
          commitSettingsListDelete(
            pendingDelete,
            (nome) => setMag((prev) => removeMarcaFromMagazzinoMaster(prev, nome)),
            () => setPendingDelete(null),
          )
        }
      />
    </SettingsListSection>
  );
}
