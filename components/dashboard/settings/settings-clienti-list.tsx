"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import dynamic from "next/dynamic";
import { settingsConfigFieldId } from "@/components/dashboard/settings/settings-config-field-id";
import { SettingsUnifiedStringList } from "@/components/dashboard/settings/settings-unified-string-list";
import { SettingsDiscountField, type SettingsSectionLayout } from "@/components/dashboard/settings-list-ui";
import { dsBtnNeutralForm, dsTableActionsGroupEnd } from "@/lib/ui/design-system";
import {
  clampScontoRicambiPercent,
  getScontoRicambiCliente,
  renameClienteInListe,
  setScontoRicambiCliente,
} from "@/lib/mezzi/cliente-commerciale";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { ClientiImportEntry } from "@/components/dashboard/settings/clienti-import-entry";
import { clientiAnagraficaService } from "@/src/services/clienti-anagrafica.service";

const ClienteAnagraficaHubModal = dynamic(
  () =>
    import("@/components/dashboard/settings/cliente-anagrafica-hub-modal").then((m) => m.ClienteAnagraficaHubModal),
  { ssr: false },
);

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
  const [anagraficaNome, setAnagraficaNome] = useState<string | null>(null);

  return (
    <>
      <div className="mb-3 flex w-full min-w-0 max-w-full justify-end">
        <ClientiImportEntry />
      </div>
      <SettingsUnifiedStringList
        layout={layout}
        title="Clienti"
        description={CARD_DESCRIPTION}
        values={liste.clienti}
        placeholder="Nuovo cliente"
        addAriaLabel="Nuovo cliente"
        onAdd={onAdd}
        onRemove={(nome) => {
          onRemove(nome);
          void clientiAnagraficaService.markRemovedFromLista(nome);
        }}
        onRename={(from, to) => {
          setListe((prev) => renameClienteInListe(prev, from, to));
          onRename(from, to);
        }}
        renderRowTrailing={(nome) => {
          const sconto = getScontoRicambiCliente(liste, nome);
          return (
            <div className={dsTableActionsGroupEnd}>
              <button type="button" className={dsBtnNeutralForm} onClick={() => setAnagraficaNome(nome)}>
                Anagrafica
              </button>
              <SettingsDiscountField
                id={settingsConfigFieldId("config-sconto-cliente", nome)}
                label="Sconto ricambi %"
                value={sconto}
                ariaLabel={`Sconto ricambi per ${nome}`}
                onChange={(n) => {
                  setListe((prev) => setScontoRicambiCliente(prev, nome, clampScontoRicambiPercent(n)));
                }}
              />
            </div>
          );
        }}
      />
      {anagraficaNome ? (
        <ClienteAnagraficaHubModal nomeDisplay={anagraficaNome} onRequestClose={() => setAnagraficaNome(null)} />
      ) : null}
    </>
  );
}
