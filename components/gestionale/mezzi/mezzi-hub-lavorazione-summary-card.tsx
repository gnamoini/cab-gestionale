"use client";

import type { CSSProperties } from "react";
import { IconActionButton } from "@/components/design-system";
import { HubIconOpen } from "@/components/design-system/hub-table-action-icons";
import { buildPreventiviLavorazioneFocusHref } from "@/lib/preventivi/preventivi-lavorazione-href";
import {
  getAddettoDisplayLabel,
  getAddettoPillHex,
  type AddettoRef,
} from "@/lib/lavorazioni/addetto-display";
import { statoThemeColor } from "@/lib/lavorazioni/lavorazioni-theme";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import {
  interventionTypePillLabel,
  type LavorazioneInterventionType,
} from "@/lib/maintenance-plans/tagliando-lavorazione-fields";
import type { MezzoInterventoLavorazione } from "@/lib/mezzi/types";
import { dsTableActionBtnPrimary, dsTableActionGlyph } from "@/lib/ui/design-system";
import { useGlobalOptions } from "@/src/hooks/use-global-options";

const LAV_CARD_SHELL =
  "relative overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_32%,var(--cab-card))] py-2.5 pl-4 pr-3 transition-colors hover:bg-[color:color-mix(in_srgb,var(--cab-hover)_45%,var(--cab-card))] sm:pr-3.5";

function formatDateIt(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  try {
    return new Date(iso).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

const HUB_LAV_META_PILL_CLASS =
  "inline-flex shrink-0 max-w-[min(100%,11rem)] items-center truncate rounded-full px-3 py-1.5 text-xs font-bold leading-none";

/** Neutro per tipo intervento — stesso shell delle pill stato/addetto. */
const INTERVENTION_PILL_HEX = "#64748b";

function HubLavMetaPill({ label, style }: { label: string; style: CSSProperties }) {
  return (
    <span className={HUB_LAV_META_PILL_CLASS} style={style} title={label}>
      {label}
    </span>
  );
}

function resolveInterventionType(intervento: MezzoInterventoLavorazione): LavorazioneInterventionType {
  return intervento.interventionType ?? "riparazione";
}

function hasNote(value: string | undefined | null): boolean {
  const t = value?.trim();
  return Boolean(t && t !== "—");
}

function resolveStatoId(intervento: MezzoInterventoLavorazione): string {
  const id = intervento.statoId?.trim();
  if (id) return id;
  return intervento.statoFinale.trim().toLowerCase().replace(/\s+/g, "_") || "bozza";
}

function MetaDot() {
  return (
    <span className="text-[color:color-mix(in_srgb,var(--cab-border)_80%,transparent)]" aria-hidden>
      ·
    </span>
  );
}

export function MezziHubLavorazioneSummaryCard({
  intervento,
  addettoRef,
  onClose,
}: {
  intervento: MezzoInterventoLavorazione;
  addettoRef?: AddettoRef;
  onClose: () => void;
}) {
  const codice = intervento.codice?.trim() || intervento.id.slice(0, 8);
  const note = intervento.descrizione?.trim() ?? "";
  const stato = intervento.statoFinale?.trim() || "—";
  const statoColor = statoThemeColor(resolveStatoId(intervento));
  const statoStyle = readablePillStyleFromHex(statoColor);
  const interventionLabel = interventionTypePillLabel(resolveInterventionType(intervento));
  const interventionStyle = readablePillStyleFromHex(INTERVENTION_PILL_HEX);
  const { lavorazioni: lavOpts } = useGlobalOptions();
  const addettoLabel =
    addettoRef != null ? getAddettoDisplayLabel(lavOpts.addettiRecords, addettoRef).trim() : "";
  const addettoStyle =
    addettoRef != null && addettoLabel && addettoLabel !== "—"
      ? readablePillStyleFromHex(
          getAddettoPillHex(lavOpts.addettiRecords, addettoRef, lavOpts.addettoColors),
        )
      : null;

  return (
    <article className={`${LAV_CARD_SHELL} flex items-center gap-3`}>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-2 left-1.5 w-1 rounded-full"
        style={{ backgroundColor: statoColor }}
      />
      <div className="relative min-w-0 flex-1 space-y-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <h4 className="shrink-0 text-[15px] font-bold leading-none tracking-tight text-[color:var(--cab-text)]">
            Lavorazione{" "}
            <span className="font-mono tabular-nums">{codice}</span>
          </h4>
          <HubLavMetaPill label={interventionLabel} style={interventionStyle} />
          {addettoStyle ? <HubLavMetaPill label={addettoLabel} style={addettoStyle} /> : null}
          <HubLavMetaPill label={stato} style={statoStyle} />
          {intervento.weakMezzoLink ? (
            <span className="rounded-full border border-amber-300/60 bg-amber-50/80 px-2 py-0.5 text-[10px] font-medium text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100">
              Collegamento debole
            </span>
          ) : null}
        </div>

        <p
          className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs leading-relaxed text-[color:var(--cab-text-muted)]"
          title={hasNote(note) ? note : undefined}
        >
          <span>
            Ingresso{" "}
            <span className="font-mono font-medium tabular-nums text-[color:var(--cab-text)]">
              {formatDateIt(intervento.dataIngresso)}
            </span>
          </span>
          <MetaDot />
          <span>
            Fine{" "}
            <span className="font-mono font-medium tabular-nums text-[color:var(--cab-text)]">
              {formatDateIt(intervento.dataCompletamento)}
            </span>
          </span>
          {hasNote(note) ? (
            <>
              <MetaDot />
              <span className="min-w-0 truncate font-medium text-[color:var(--cab-text)]">{note}</span>
            </>
          ) : null}
        </p>
      </div>

      <IconActionButton
        as="link"
        href={buildPreventiviLavorazioneFocusHref(intervento.id, intervento.origine)}
        label="Apri lavorazione"
        tooltipForce
        className={`${dsTableActionBtnPrimary} shrink-0 self-center`}
        onClick={onClose}
      >
        <HubIconOpen className={dsTableActionGlyph} />
      </IconActionButton>
    </article>
  );
}
