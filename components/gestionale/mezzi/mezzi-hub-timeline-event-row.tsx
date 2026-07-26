"use client";

import { IconActionButton } from "@/components/design-system";
import { HubIconOpen } from "@/components/design-system/hub-table-action-icons";
import {
  MezziHubListMeta,
  MezziHubListSubtitle,
  MezziHubListTitle,
  MezziHubTimelineKindBadge,
  fmtMezziHubDt,
} from "@/components/gestionale/mezzi/mezzi-hub-ui";
import { buildPreventiviLavorazioneFocusHref } from "@/lib/preventivi/preventivi-lavorazione-href";
import type { MezzoTimelineFeedEvent } from "@/lib/mezzi/mezzo-timeline-feed";
import type { MezzoTimelineItem } from "@/src/services/domain/mezzo-domain.service";
import { dsTableActionBtnPrimary, dsTableActionGlyph, dsTypoCaption } from "@/lib/ui/design-system";

const NESTED_EVENT_SHELL =
  "rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_40%,var(--cab-card))] px-3 py-2.5";

export function MezziHubTimelineEventRow({
  event,
  onClose,
  nested = false,
}: {
  event: MezzoTimelineFeedEvent;
  onClose: () => void;
  nested?: boolean;
}) {
  if (event.renderKind !== "timeline_item") return null;
  const ev = event.payload as MezzoTimelineItem;

  const openHref =
    ev.ref?.lavorazioneId && ev.ref.origine
      ? buildPreventiviLavorazioneFocusHref(ev.ref.lavorazioneId, ev.ref.origine)
      : null;

  const openAction = openHref ? (
    <IconActionButton
      as="link"
      href={openHref}
      label="Apri lavorazione"
      tooltipForce
      className={dsTableActionBtnPrimary}
      onClick={onClose}
    >
      <HubIconOpen className={dsTableActionGlyph} />
    </IconActionButton>
  ) : null;

  if (nested) {
    return (
      <div className={NESTED_EVENT_SHELL}>
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className={`${dsTypoCaption} font-mono tabular-nums text-[color:var(--cab-text-muted)]`}>
              {fmtMezziHubDt(ev.at)}
            </p>
            <MezziHubListTitle>
              {ev.title}
              {ev.targetBadge ? (
                <span className="ml-1.5 inline-flex rounded border border-[color:var(--cab-border)] bg-[var(--cab-surface-2)] px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
                  {ev.targetBadge}
                </span>
              ) : null}
            </MezziHubListTitle>
            {ev.subtitle ? <MezziHubListSubtitle>{ev.subtitle}</MezziHubListSubtitle> : null}
          </div>
          {openAction ? <div className="flex shrink-0 items-start pt-0.5">{openAction}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <MezziHubTimelineKindBadge kind={ev.kind} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <MezziHubListMeta>{fmtMezziHubDt(ev.at)}</MezziHubListMeta>
            <MezziHubListTitle>
              {ev.title}
              {ev.targetBadge ? (
                <span className="ml-1.5 inline-flex rounded border border-[color:var(--cab-border)] bg-[var(--cab-surface-2)] px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
                  {ev.targetBadge}
                </span>
              ) : null}
            </MezziHubListTitle>
            {ev.subtitle ? <MezziHubListSubtitle>{ev.subtitle}</MezziHubListSubtitle> : null}
          </div>
          {openAction ? <div className="flex shrink-0 items-start">{openAction}</div> : null}
        </div>
      </div>
    </div>
  );
}
