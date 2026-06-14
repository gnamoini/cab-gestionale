"use client";

import { type Dispatch, type SetStateAction } from "react";
import { settingsConfigFieldId } from "@/components/dashboard/settings/settings-config-field-id";
import { SettingsUnifiedStringList } from "@/components/dashboard/settings/settings-unified-string-list";
import { SettingsDiscountField, type SettingsSectionLayout } from "@/components/dashboard/settings-list-ui";
import {
  clampScontoRicambiPercent,
  getScontoRicambiCliente,
  renameClienteInListe,
  setScontoRicambiCliente,
} from "@/lib/mezzi/cliente-commerciale";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";

const CARD_DESCRIPTION =
  "Sconto ricambi % applicato automaticamente nei preventivi con lo stesso cliente (vendite, solo ricambi, non manodopera).";

export function SettingsClientiCommercialiList({
  liste,
  setListe,
  onAdd,
  onRemove,
  onRename,
  layout = "flat",
}: {
  liste: MezziListePrefs;
  setListe: Dispatch<SetStateAction<MezziListePrefs>>;
  onAdd: (trimmed: string) => void;
  onRemove: (nome: string) => void;
  onRename: (from: string, to: string) => void;
  layout?: SettingsSectionLayout;
}) {
  return (
    <SettingsUnifiedStringList
      layout={layout}
      title="Clienti"
      description={CARD_DESCRIPTION}
      values={liste.clienti}
      placeholder="Nuovo cliente"
      addAriaLabel="Nuovo cliente"
      onAdd={onAdd}
      onRemove={onRemove}
      onRename={(from, to) => {
        setListe((prev) => renameClienteInListe(prev, from, to));
        onRename(from, to);
      }}
      renderRowTrailing={(nome) => {
        const sconto = getScontoRicambiCliente(liste, nome);
        return (
          <SettingsDiscountField
            id={settingsConfigFieldId("config-sconto-cliente", nome)}
            label="Sconto ricambi %"
            value={sconto}
            ariaLabel={`Sconto ricambi per ${nome}`}
            onChange={(n) => {
              setListe((prev) => setScontoRicambiCliente(prev, nome, clampScontoRicambiPercent(n)));
            }}
          />
        );
      }}
    />
  );
}
