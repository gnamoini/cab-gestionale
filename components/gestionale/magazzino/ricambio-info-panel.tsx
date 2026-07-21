"use client";

import type { ReactNode } from "react";
import { OptionalTooltip } from "@/components/ui";
import {
  GestionaleInfoRow,
  GestionaleInfoSubgroup,
} from "@/components/design-system/gestionale-info-card";
import { hubPanoramicaDisplayValue } from "@/components/design-system/hub-modal-panoramica";
import { RicambioInfoRiepilogoSection, RicambioCodiceIdentitaBlock } from "@/components/gestionale/magazzino/ricambio-info-riepilogo-section";
import { LoadingFormSkeleton } from "@/components/design-system";
import { MagazzinoPrezziLineari } from "@/components/gestionale/magazzino/magazzino-prezzi-lineari";
import { RicambioCollapsibleSection } from "@/components/gestionale/magazzino/ricambio-modal-ui";
import { MagazzinoScortaInfoStepper } from "@/components/gestionale/magazzino/magazzino-scorta-adjust-actions";
import { RecordImageManager, type RecordImageLogEvent } from "@/components/gestionale/media/record-image-manager";
import {
  GestionaleLogEntryDismissButton,
  GestionaleLogEntryFourLines,
  GestionaleLogEntryUndoButton,
} from "@/components/gestionale/gestionale-log-ui";
import { capitaleImmobilizzato } from "@/lib/magazzino/calculations";
import type { MagazzinoLogFeedItem } from "@/lib/magazzino/use-magazzino-log-feed";
import { formatRicambioUnitaMisuraLabel } from "@/lib/magazzino/ricambio-unita-misura";
import {
  formatAutonomiaMesi,
  formatAvgMonthlyMagazzinoIt,
  formatMonthKeyIt,
  type RicambioConsumoDaLog,
} from "@/lib/magazzino/ricambio-consumo-from-log";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { RicambioOperationalStatusCard } from "@/components/gestionale/magazzino/ricambio-operational-status-card";
import { RicambioOrdiniSection } from "@/components/gestionale/magazzino/ricambio-ordini-section";

function multilineValue(value: string): ReactNode {
  const t = value.trim();
  if (!t) return hubPanoramicaDisplayValue("");
  return <span className="whitespace-pre-wrap text-[color:var(--cab-text)]">{t}</span>;
}

export function RicambioConsumoDetailRows({ consumo }: { consumo: RicambioConsumoDaLog | undefined }) {
  return (
    <>
      <GestionaleInfoRow label="Ultimo mese consumato" value={formatMonthKeyIt(consumo?.lastExitMonthKey ?? null)} />
      <GestionaleInfoRow
        label="Mesi osservati"
        value={consumo && consumo.monthsObserved > 0 ? String(consumo.monthsObserved) : "—"}
      />
    </>
  );
}

export function RicambioConsumoInfoRows({
  consumo,
  scorta,
  autonomiaTooltip = "Scorta attuale ÷ consumo medio mensile",
}: {
  consumo: RicambioConsumoDaLog | undefined;
  scorta: number;
  autonomiaTooltip?: string;
}) {
  return (
    <>
      <GestionaleInfoRow
        label="Consumo medio mensile"
        value={
          consumo?.avgMonthly != null ? formatAvgMonthlyMagazzinoIt(consumo.avgMonthly) : "dati insufficienti"
        }
      />
      <GestionaleInfoRow label="Ultimo mese consumato" value={formatMonthKeyIt(consumo?.lastExitMonthKey ?? null)} />
      <GestionaleInfoRow
        label="Mesi osservati"
        value={consumo && consumo.monthsObserved > 0 ? String(consumo.monthsObserved) : "—"}
      />
      <GestionaleInfoRow
        label="Autonomia stimata"
        value={
          <OptionalTooltip content={autonomiaTooltip}>
            <span>{formatAutonomiaMesi(scorta, consumo?.avgMonthly ?? null)}</span>
          </OptionalTooltip>
        }
      />
    </>
  );
}

export function RicambioInfoPanel({
  ricambio,
  compatDisplay,
  consumo,
  formatEur,
  canEditPhotos,
  onImageEvent,
  logTimeline,
  logLoading,
  onDismissLogEntry,
  canAdjustScorta,
  modalitaModifica = false,
  scortaFlash = false,
  onAdjustScorta,
  onSetScorta,
  stockPolicyRaw,
  onUndoStockMovement,
  undoStockPending = false,
}: {
  ricambio: RicambioMagazzino;
  compatDisplay: string;
  consumo: RicambioConsumoDaLog | undefined;
  formatEur: (n: number) => string;
  canEditPhotos: boolean;
  onImageEvent: (event: RecordImageLogEvent) => void;
  logTimeline: ReadonlyArray<MagazzinoLogFeedItem>;
  logLoading: boolean;
  onDismissLogEntry: (id: string) => void;
  canAdjustScorta?: boolean;
  modalitaModifica?: boolean;
  scortaFlash?: boolean;
  onAdjustScorta?: (delta: number) => void;
  onSetScorta?: (target: number) => void;
  stockPolicyRaw?: unknown;
  onUndoStockMovement?: (movimentoId: string) => void | Promise<void>;
  undoStockPending?: boolean;
}) {
  const low = ricambio.scorta < ricambio.scortaMinima;
  const ultimaModifica = new Date(ricambio.dataUltimaModifica).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="space-y-3">
      <RicambioInfoRiepilogoSection
        ricambio={ricambio}
        compatDisplay={compatDisplay}
        ultimaModificaLabel={ultimaModifica}
        canAdjustScorta={canAdjustScorta}
        modalitaModifica={modalitaModifica}
        scortaFlash={scortaFlash}
        onAdjustScorta={onAdjustScorta}
        onSetScorta={onSetScorta}
        consumo={consumo}
        stockPolicyRaw={stockPolicyRaw}
      />

      <RicambioCollapsibleSection title="Giacenza e consumo" defaultCollapsed={false}>
        <RicambioOperationalStatusCard
          embedded
          descrizione={ricambio.descrizione}
          scorta={ricambio.scorta}
          scortaMinima={ricambio.scortaMinima}
          consumo={consumo}
          stockPolicyRaw={stockPolicyRaw}
        />
        {onAdjustScorta ? (
          <GestionaleInfoRow
            label="Scorta"
            value={
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
            }
          />
        ) : null}
        <GestionaleInfoSubgroup title="Consumo (log magazzino)" borderless>
          <RicambioConsumoDetailRows consumo={consumo} />
        </GestionaleInfoSubgroup>
        <GestionaleInfoRow label="Capitale immob." value={formatEur(capitaleImmobilizzato(ricambio))} mono />
        <GestionaleInfoSubgroup title="Audit" borderless>
          <GestionaleInfoRow label="Ultima modifica" value={ultimaModifica} />
          <GestionaleInfoRow label="Autore" value={hubPanoramicaDisplayValue(ricambio.autoreUltimaModifica)} />
        </GestionaleInfoSubgroup>
      </RicambioCollapsibleSection>

      <RicambioCollapsibleSection title="Dati principali" defaultCollapsed={false}>
        {ricambio.listinoImport?.generatoAutomaticamente ? (
          <div className="mb-2 rounded-lg border border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--cab-primary)_85%,var(--cab-text))]">
              Generato da listino
            </p>
            <p className="mt-0.5 text-xs text-[color:var(--cab-text-muted)]">
              {ricambio.listinoImport.documentoNome}
              {ricambio.listinoImport.importatoAt
                ? ` · ${new Date(ricambio.listinoImport.importatoAt).toLocaleDateString("it-IT")}`
                : ""}
            </p>
          </div>
        ) : null}
        <GestionaleInfoRow label="Marca" value={hubPanoramicaDisplayValue(ricambio.marca)} />
        <GestionaleInfoRow
          label="Cod. OE"
          value={<RicambioCodiceIdentitaBlock ricambio={ricambio} />}
          strong
        />
        <GestionaleInfoRow label="Descrizione" value={hubPanoramicaDisplayValue(ricambio.descrizione)} strong />
        <GestionaleInfoRow label="Note" value={multilineValue(ricambio.note)} />
        <GestionaleInfoRow label="Categoria" value={hubPanoramicaDisplayValue(ricambio.categoria)} />
        <GestionaleInfoRow
          label="Tagliando"
          value={ricambio.usatoInTagliandi ? "Sì" : "No"}
        />
        <GestionaleInfoRow
          label="Unità di misura"
          value={formatRicambioUnitaMisuraLabel(ricambio.unitaMisura)}
        />
        <GestionaleInfoRow label="Compatibilità" value={compatDisplay} />
      </RicambioCollapsibleSection>

      <RicambioCollapsibleSection title="Foto" defaultCollapsed>
        <RecordImageManager
          scope="magazzino"
          recordId={ricambio.id}
          canEdit={canEditPhotos}
          hubCardLayout
          onImageEvent={onImageEvent}
        />
      </RicambioCollapsibleSection>

      <RicambioCollapsibleSection
        title="Fornitori alternativi"
        defaultCollapsed={(ricambio.fornitoriAlternativi ?? []).length === 0}
      >
        {(ricambio.fornitoriAlternativi ?? []).length === 0 ? (
          <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun fornitore alternativo</p>
        ) : (
          (ricambio.fornitoriAlternativi ?? []).map((alt, i) => (
            <GestionaleInfoSubgroup key={alt.id || i} title={`Alternativo ${i + 1}`}>
              <GestionaleInfoRow label="Fornitore" value={hubPanoramicaDisplayValue(alt.fornitore)} />
              <GestionaleInfoRow label="Produttore" value={hubPanoramicaDisplayValue(alt.produttore)} />
              <GestionaleInfoRow
                label="Codice"
                value={
                  alt.codice.trim() ? (
                    <span className="font-mono">{alt.codice}</span>
                  ) : (
                    "—"
                  )
                }
                mono
              />
              <GestionaleInfoRow label="Prezzo" value={formatEur(alt.prezzo)} mono />
              <GestionaleInfoRow label="Sconto" value={`${alt.sconto}%`} mono />
            </GestionaleInfoSubgroup>
          ))
        )}
      </RicambioCollapsibleSection>

      <MagazzinoPrezziLineari
        variant="info"
        formatEur={formatEur}
        listinoOE={ricambio.prezzoFornitoreOriginale}
        scontoOE={ricambio.scontoFornitoreOriginale}
        fornitoriAlternativi={ricambio.fornitoriAlternativi}
        markupPct={ricambio.markupPercentuale}
        prezzoVendita={ricambio.prezzoVendita}
      />

      <RicambioOrdiniSection ricambioId={ricambio.id} />

      <RicambioCollapsibleSection title="Storico e movimenti" defaultCollapsed>
        <ul className="space-y-2">
          {logLoading ? (
            <li className="list-none">
              <LoadingFormSkeleton fields={1} className="py-1" />
            </li>
          ) : logTimeline.length === 0 ? (
            <li className="list-none text-sm text-[color:var(--cab-text-muted)]">Nessuna attività registrata.</li>
          ) : (
            logTimeline.map((ev) => (
              <li key={ev.id} className="list-none">
                <GestionaleLogEntryFourLines
                  vm={ev.vm}
                  trailing={
                    <div className="flex items-center gap-0.5">
                      {ev.source === "server" &&
                      canAdjustScorta &&
                      ev.movimentoId &&
                      !ev.vm.annullato &&
                      onUndoStockMovement ? (
                        <GestionaleLogEntryUndoButton
                          pending={undoStockPending}
                          onUndo={() => onUndoStockMovement(ev.movimentoId!)}
                        />
                      ) : null}
                      {ev.source === "local" ? (
                        <GestionaleLogEntryDismissButton onDismiss={() => onDismissLogEntry(ev.id)} />
                      ) : null}
                    </div>
                  }
                />
              </li>
            ))
          )}
        </ul>
      </RicambioCollapsibleSection>
    </div>
  );
}
