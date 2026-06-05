"use client";

import type { ReactElement, ReactNode } from "react";
import {
  GestionaleInfoCard,
  GestionaleInfoRow,
  GestionaleInfoSubgroup,
} from "@/components/design-system/gestionale-info-card";
import { HubModalPanoramicaPanel, hubPanoramicaDisplayValue } from "@/components/design-system/hub-modal-panoramica";
import { LoadingFormSkeleton, Tooltip } from "@/components/design-system";
import { MagazzinoPrezziLineari } from "@/components/gestionale/magazzino/magazzino-prezzi-lineari";
import { RecordImageManager, type RecordImageLogEvent } from "@/components/gestionale/media/record-image-manager";
import {
  GestionaleLogEntryDismissButton,
  GestionaleLogEntryFourLines,
  gestionaleLogScrollEmbeddedClass,
} from "@/components/gestionale/gestionale-log-ui";
import { capitaleImmobilizzato } from "@/lib/magazzino/calculations";
import type { MagazzinoLogFeedItem } from "@/lib/magazzino/use-magazzino-log-feed";
import {
  formatAutonomiaMesi,
  formatAvgMonthlyMagazzinoIt,
  formatMonthKeyIt,
  type RicambioConsumoDaLog,
} from "@/lib/magazzino/ricambio-consumo-from-log";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

function OptionalTooltip({
  content,
  children,
}: {
  content?: string;
  children: ReactElement;
}) {
  if (!content?.trim()) return children;
  return <Tooltip content={content}>{children}</Tooltip>;
}

function multilineValue(value: string): ReactNode {
  const t = value.trim();
  if (!t) return hubPanoramicaDisplayValue("");
  return <span className="whitespace-pre-wrap text-[color:var(--cab-text)]">{t}</span>;
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
}) {
  const ultimaModifica = new Date(ricambio.dataUltimaModifica).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <HubModalPanoramicaPanel gapClass="gap-4">
      <GestionaleInfoCard title="Dati principali">
        <GestionaleInfoRow label="Marca" value={hubPanoramicaDisplayValue(ricambio.marca)} />
        <GestionaleInfoRow
          label="Cod. OE"
          value={
            <div className="space-y-0.5">
              <span className="font-mono text-[13px] font-semibold tracking-wide">
                {hubPanoramicaDisplayValue(ricambio.codiceFornitoreOriginale)}
              </span>
              {ricambio.codiceFornitoreOriginaleSecondario.trim() ? (
                <span className="block font-mono text-[11px] font-medium tracking-wide text-[color:var(--cab-text-muted)]">
                  {ricambio.codiceFornitoreOriginaleSecondario}
                  {ricambio.marcaOriginaleSecondaria.trim()
                    ? ` · ${ricambio.marcaOriginaleSecondaria}`
                    : ""}
                </span>
              ) : null}
            </div>
          }
          strong
        />
        <GestionaleInfoRow label="Descrizione" value={hubPanoramicaDisplayValue(ricambio.descrizione)} strong />
        <GestionaleInfoRow label="Note" value={multilineValue(ricambio.note)} />
        <GestionaleInfoRow label="Categoria" value={hubPanoramicaDisplayValue(ricambio.categoria)} />
        <GestionaleInfoRow
          label="Tagliando"
          value={ricambio.usatoInTagliandi ? "Sì" : "No"}
        />
        <GestionaleInfoRow label="Compatibilità" value={compatDisplay} />
      </GestionaleInfoCard>

      <RecordImageManager
        scope="magazzino"
        recordId={ricambio.id}
        title="Foto ricambio"
        canEdit={canEditPhotos}
        hubCardLayout
        onImageEvent={onImageEvent}
      />

      <GestionaleInfoCard title="Giacenza e consumo">
        <GestionaleInfoSubgroup title="Giacenza">
          <GestionaleInfoRow label="Scorta" value={String(ricambio.scorta)} mono />
          <GestionaleInfoRow label="Scorta minima" value={String(ricambio.scortaMinima)} mono />
        </GestionaleInfoSubgroup>
        <GestionaleInfoSubgroup title="Consumo (log magazzino)">
          <RicambioConsumoInfoRows consumo={consumo} scorta={ricambio.scorta} />
        </GestionaleInfoSubgroup>
        <GestionaleInfoRow label="Capitale immob." value={formatEur(capitaleImmobilizzato(ricambio))} mono />
        <GestionaleInfoSubgroup title="Audit">
          <GestionaleInfoRow label="Ultima modifica" value={ultimaModifica} />
          <GestionaleInfoRow label="Autore" value={hubPanoramicaDisplayValue(ricambio.autoreUltimaModifica)} />
        </GestionaleInfoSubgroup>
      </GestionaleInfoCard>

      <GestionaleInfoCard title="Fornitori alternativi">
        {(ricambio.fornitoriAlternativi ?? []).length === 0 ? (
          <GestionaleInfoRow label="—" value="Nessun fornitore alternativo" />
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
      </GestionaleInfoCard>

      <MagazzinoPrezziLineari
        formatEur={formatEur}
        listinoOE={ricambio.prezzoFornitoreOriginale}
        scontoOE={ricambio.scontoFornitoreOriginale}
        fornitoriAlternativi={ricambio.fornitoriAlternativi}
        markupPct={ricambio.markupPercentuale}
        prezzoVendita={ricambio.prezzoVendita}
      />

      <GestionaleInfoCard title="Storico modifiche">
        <ul className={`${gestionaleLogScrollEmbeddedClass} min-h-0 max-h-48 max-md:max-h-40 space-y-2 pr-0.5`}>
          {logLoading ? (
            <li className="list-none">
              <LoadingFormSkeleton fields={1} className="py-1" />
            </li>
          ) : logTimeline.length === 0 ? (
            <li className="list-none text-sm text-[color:var(--cab-text-muted)]">Nessuna modifica registrata.</li>
          ) : (
            logTimeline.map((ev) => (
              <li key={ev.id} className="list-none">
                <GestionaleLogEntryFourLines
                  vm={ev.vm}
                  trailing={
                    ev.source === "local" ? (
                      <GestionaleLogEntryDismissButton onDismiss={() => onDismissLogEntry(ev.id)} />
                    ) : undefined
                  }
                />
              </li>
            ))
          )}
        </ul>
      </GestionaleInfoCard>
    </HubModalPanoramicaPanel>
  );
}
