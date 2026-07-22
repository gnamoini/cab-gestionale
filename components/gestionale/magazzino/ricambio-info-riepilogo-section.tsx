"use client";

import type { ReactNode } from "react";
import { GestionaleInfoRow } from "@/components/design-system/gestionale-info-card";
import { hubPanoramicaDisplayValue } from "@/components/design-system/hub-modal-panoramica";
import { MagazzinoScortaInfoStepper } from "@/components/gestionale/magazzino/magazzino-scorta-adjust-actions";
import { RicambioStockStatusLabel } from "@/components/gestionale/magazzino/ricambio-operational-status-card";
import { RicambioCollapsibleSection } from "@/components/gestionale/magazzino/ricambio-modal-ui";
import type { RicambioConsumoDaLog } from "@/lib/magazzino/ricambio-consumo-from-log";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { displayRicambioCodice } from "@/lib/magazzino/ricambio-codice";

export const RICAMBIO_SCHEDA_RIEPILOGO_COLLAPSE_SCOPE = "magazzino";
export const RICAMBIO_SCHEDA_RIEPILOGO_COLLAPSE_KEY = "scheda-ricambio-riepilogo";

export function RicambioCodiceIdentitaBlock({ ricambio }: { ricambio: RicambioMagazzino }) {
  return (
    <div className="space-y-0.5">
      <span className="font-mono text-[13px] font-semibold tracking-wide">
        {displayRicambioCodice(ricambio.codiceFornitoreOriginale)}
      </span>
      {ricambio.codiceFornitoreOriginaleSecondario.trim() ? (
        <span className="block font-mono text-[11px] font-medium tracking-wide text-[color:var(--cab-text-muted)]">
          {ricambio.codiceFornitoreOriginaleSecondario}
          {ricambio.marcaOriginaleSecondaria.trim() ? ` · ${ricambio.marcaOriginaleSecondaria}` : ""}
        </span>
      ) : null}
    </div>
  );
}

function riepilogoMultilineValue(value: string): ReactNode {
  const t = value.trim();
  if (!t) return "—";
  return <span className="whitespace-pre-wrap break-words text-[color:var(--cab-text)]">{t}</span>;
}

export function RicambioInfoRiepilogoSection({
  ricambio,
  compatDisplay,
  ultimaModificaLabel,
  canAdjustScorta,
  modalitaModifica = false,
  scortaFlash = false,
  onAdjustScorta,
  onSetScorta,
  consumo,
  stockPolicyRaw,
}: {
  ricambio: RicambioMagazzino;
  compatDisplay: string;
  ultimaModificaLabel: string;
  canAdjustScorta?: boolean;
  modalitaModifica?: boolean;
  scortaFlash?: boolean;
  onAdjustScorta?: (delta: number) => void;
  onSetScorta?: (target: number) => void;
  consumo?: RicambioConsumoDaLog;
  stockPolicyRaw?: unknown;
}) {
  const low = ricambio.scorta < ricambio.scortaMinima;

  return (
    <RicambioCollapsibleSection
      title="Riepilogo"
      defaultCollapsed={false}
      persistScope={RICAMBIO_SCHEDA_RIEPILOGO_COLLAPSE_SCOPE}
      persistKey={RICAMBIO_SCHEDA_RIEPILOGO_COLLAPSE_KEY}
    >
      <div className="grid gap-x-3 sm:grid-cols-2">
        <GestionaleInfoRow label="Marca" value={hubPanoramicaDisplayValue(ricambio.marca)} />
        <GestionaleInfoRow
          label="Cod. OE"
          value={<RicambioCodiceIdentitaBlock ricambio={ricambio} />}
          strong
        />
      </div>

      <GestionaleInfoRow
        label="Descrizione"
        value={hubPanoramicaDisplayValue(ricambio.descrizione)}
        strong
      />

      <div className="grid gap-x-3 sm:grid-cols-2">
        <GestionaleInfoRow label="Categoria" value={hubPanoramicaDisplayValue(ricambio.categoria)} />
        <GestionaleInfoRow label="Scorta minima" value={String(ricambio.scortaMinima)} mono />
      </div>

      <GestionaleInfoRow label="Note" value={riepilogoMultilineValue(ricambio.note)} />
      <GestionaleInfoRow label="Compatibilità" value={riepilogoMultilineValue(compatDisplay)} />

      {onAdjustScorta ? (
        <GestionaleInfoRow
          label="Scorta attuale"
          value={
            <div className="space-y-1">
              <MagazzinoScortaInfoStepper
                value={ricambio.scorta}
                low={low}
                canAdjust={canAdjustScorta ?? false}
                modalitaModifica={modalitaModifica}
                successFlash={scortaFlash}
                onDecrease={() => onAdjustScorta(-1)}
                onIncrease={() => onAdjustScorta(1)}
                onSetValue={(target) => onSetScorta?.(target)}
              />
              <RicambioStockStatusLabel
                quantita={ricambio.scorta}
                scortaMinima={ricambio.scortaMinima}
                consumo={consumo}
                stockPolicyRaw={stockPolicyRaw}
              />
            </div>
          }
        />
      ) : (
        <GestionaleInfoRow
          label="Scorta attuale"
          value={
            <div className="space-y-1">
              <span className="font-mono tabular-nums">{ricambio.scorta}</span>
              <RicambioStockStatusLabel
                quantita={ricambio.scorta}
                scortaMinima={ricambio.scortaMinima}
                consumo={consumo}
                stockPolicyRaw={stockPolicyRaw}
              />
            </div>
          }
        />
      )}

      <GestionaleInfoRow label="Ultima modifica" value={ultimaModificaLabel} />
    </RicambioCollapsibleSection>
  );
}
