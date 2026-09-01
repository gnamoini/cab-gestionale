"use client";

import { useEffect } from "react";
import { DisabledElementTooltip } from "@/components/ui";
import { gestionaleModalFooterSaveBtnClass } from "@/components/design-system";
import { HubIconPencil } from "@/components/design-system/hub-table-action-icons";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { RicambioInfoPanel } from "@/components/gestionale/magazzino/ricambio-info-panel";
import { ricambioModalFormScrollClass } from "@/components/gestionale/magazzino/ricambio-modal-ui";
import type { RecordImageLogEvent } from "@/components/gestionale/media/record-image-manager";
import type { MagazzinoArchiveDuplicateCodeGroup } from "@/lib/magazzino/duplicates";
import type { MagazzinoLogFeedItem } from "@/lib/magazzino/use-magazzino-log-feed";
import type { RicambioConsumoDaLog } from "@/lib/magazzino/ricambio-consumo-from-log";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { displayRicambioCodice, ricambioCodiceForUi } from "@/lib/magazzino/ricambio-codice";
import { RicambioLabelActions } from "@/components/gestionale/magazzino/ricambio-label-actions";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";

function ArchiveDupRicambioRow({
  p,
  onOpen,
}: {
  p: RicambioMagazzino;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(p.id)}
      className="w-full rounded-lg border border-zinc-200/90 bg-white px-2.5 py-2 text-left text-xs transition-colors hover:border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] dark:border-zinc-700 dark:bg-zinc-900/50"
    >
      <div className="font-semibold text-zinc-800 dark:text-zinc-100">{p.marca}</div>
      <div className="mt-0.5 font-mono text-[11px] font-medium text-zinc-700 dark:text-zinc-200">{displayRicambioCodice(p.codiceFornitoreOriginale)}</div>
      <div className="mt-0.5 min-w-0 text-[11px] leading-snug text-zinc-600 dark:text-zinc-300">{p.descrizione}</div>
      <div className="mt-1 font-mono text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">Scorta {p.scorta}</div>
    </button>
  );
}

export function MagazzinoRicambioInfoModal({
  ricambio,
  compatDisplay,
  consumo,
  formatEur,
  magCanCreateRicambio,
  magCanReadRicambio,
  logTimeline,
  logLoading,
  onClose,
  onEdit,
  onImageEvent,
  onDismissLogEntry,
  canAdjustScorta,
  modalitaModifica = false,
  scortaFlash = false,
  stockPolicyRaw,
  onUndoStockMovement,
  undoStockPending,
  onMounted,
}: {
  ricambio: RicambioMagazzino;
  compatDisplay: string;
  consumo: RicambioConsumoDaLog | undefined;
  formatEur: (n: number) => string;
  magCanCreateRicambio: boolean;
  magCanReadRicambio: boolean;
  logTimeline: ReadonlyArray<MagazzinoLogFeedItem>;
  logLoading: boolean;
  onClose: () => void;
  onEdit: () => void;
  onImageEvent: (ev: RecordImageLogEvent) => void;
  onDismissLogEntry: (id: string) => void;
  canAdjustScorta: boolean;
  modalitaModifica?: boolean;
  scortaFlash?: boolean;
  stockPolicyRaw?: unknown;
  onUndoStockMovement?: (movimentoId: string) => void | Promise<void>;
  undoStockPending?: boolean;
  onMounted?: () => void;
}) {
  useEffect(() => {
    onMounted?.();
  }, [onMounted]);

  return (
    <GestionaleModalShell
      modalSize="info"
      modalHeight="standard"
      onRequestClose={onClose}
      title="Scheda ricambio"
      titleId="detail-ricambio-title"
      footer={
        <div className="flex w-full min-w-0 flex-col gap-2">
          <RicambioLabelActions
            ricambioId={ricambio.id}
            codice={ricambioCodiceForUi(ricambio.codiceFornitoreOriginale)}
            canRead={magCanReadRicambio}
            trailingAction={
              <DisabledElementTooltip content={READONLY_PERMISSION_HINT} disabled={!magCanCreateRicambio}>
                <button
                  type="button"
                  onClick={onEdit}
                  className={`${gestionaleModalFooterSaveBtnClass} w-full justify-center disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45`}
                  disabled={!magCanCreateRicambio}
                >
                  <HubIconPencil className="h-4 w-4 shrink-0" />
                  Modifica
                </button>
              </DisabledElementTooltip>
            }
          />
        </div>
      }
    >
      <div className={`${gestionaleModalBodyFlexClass} min-h-0 overflow-hidden`}>
        <GestionaleModalScrollBody className={ricambioModalFormScrollClass}>
          <RicambioInfoPanel
            ricambio={ricambio}
            compatDisplay={compatDisplay}
            consumo={consumo}
            formatEur={formatEur}
            canEditPhotos={magCanCreateRicambio}
            onImageEvent={onImageEvent}
            logTimeline={logTimeline}
            logLoading={logLoading}
            onDismissLogEntry={onDismissLogEntry}
            canAdjustScorta={canAdjustScorta}
            modalitaModifica={modalitaModifica}
            scortaFlash={scortaFlash}
            stockPolicyRaw={stockPolicyRaw}
            onUndoStockMovement={onUndoStockMovement}
            undoStockPending={undoStockPending}
          />
        </GestionaleModalScrollBody>
      </div>
    </GestionaleModalShell>
  );
}

export function MagazzinoDupCodesModal({
  groups,
  onClose,
  onOpenRicambio,
}: {
  groups: readonly MagazzinoArchiveDuplicateCodeGroup[];
  onClose: () => void;
  onOpenRicambio: (id: string) => void;
}) {
  return (
    <GestionaleModalShell
      modalSize="info"
      onRequestClose={onClose}
      title="Codici duplicati in archivio"
      titleId="dup-magazzino-title"
    >
      <GestionaleModalScrollBody className="space-y-3">
        {groups.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Nessun codice duplicato rilevato.</p>
        ) : (
          <ul className="space-y-4">
            {groups.map((g) => (
              <li
                key={g.normalizedKey}
                className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-700 dark:bg-zinc-800/30"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-700 dark:text-zinc-200">
                  Codice <span className="font-mono normal-case">{g.labelCode}</span>
                </p>
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {g.items.length} ricambi con lo stesso codice normalizzato
                </p>
                <ul className="mt-2 space-y-2">
                  {g.items.map((p) => (
                    <li key={p.id}>
                      <ArchiveDupRicambioRow p={p} onOpen={onOpenRicambio} />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </GestionaleModalScrollBody>
    </GestionaleModalShell>
  );
}
