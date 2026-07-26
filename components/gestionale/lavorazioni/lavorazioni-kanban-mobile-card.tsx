"use client";

import { memo, type KeyboardEvent } from "react";
import { LavorazioneIngressoDateCell } from "@/components/gestionale/lavorazioni/lavorazioni-table-shared";
import { TablePillReadonly } from "@/components/gestionale/lavorazioni/lavorazioni-table-pill-readonly";
import {
  addettoPillShellClassDynamic,
  prioritaLabel,
  prioritaPillShellClassDynamic,
  prioritaPillShellStyle,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { resolveLavorazioneNote } from "@/lib/lavorazioni/lavorazione-display-helpers";
import { getAddettoPillStyle } from "@/lib/lavorazioni/addetto-display";
import { addettoRefFromFields } from "@/components/domain/addetti";
import { resolveAddettoSnapshotRef } from "@/lib/lavorazioni/resolve-addetto-display";
import { kanbanCardPriorityVisual } from "@/lib/lavorazioni/kanban-card-priority-style";
import { prioritaDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import type { PrioritaLav } from "@/lib/lavorazioni/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { PrioritaLavorazione } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore } from "@/types/schede";
import type { KanbanCardMobileProps } from "@/components/gestionale/lavorazioni/lavorazioni-kanban-mobile-types";

function kanbanCardOpenKey(e: KeyboardEvent, onOpen: () => void) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    onOpen();
  }
}

export const KanbanCardMobile = memo(function KanbanCardMobile({
  row,
  schedeStore,
  addettiRecords,
  prioritaColors,
  addettoColors,
  flash,
  onOpen,
  macchina,
  cliente,
  identSummary,
  addetto,
}: KanbanCardMobileProps) {
  const p = row.priorita as PrioritaLavorazione;
  const prioLav = p as PrioritaLav;
  const prioVisual = kanbanCardPriorityVisual(prioLav, prioritaColors as Partial<Record<PrioritaLav, string>>);
  const prioHex = prioritaDisplayColor(prioLav, prioritaColors);
  const addettoRef = addettoRefFromFields(resolveAddettoSnapshotRef(row, schedeStore));
  const addettoPillStyle = getAddettoPillStyle(addettiRecords ?? [], addettoRef, addettoColors as Record<string, string>);
  const note = resolveLavorazioneNote(row);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => kanbanCardOpenKey(e, onOpen)}
      style={prioVisual.style}
      className={[
        "lavorazioni-kanban-mobile-card w-full min-h-[44px] cursor-pointer rounded-xl border border-[color:var(--cab-border)] p-3 text-left transition-[border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--cab-primary)] focus-visible:ring-offset-2",
        prioVisual.className,
        flash ? "lavorazioni-kanban-card-flash" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start gap-2.5">
        <span className={prioVisual.dotClassName} style={prioVisual.dotStyle} aria-label={prioritaLabel(p)} role="img" />
        <div className="min-w-0 flex-1 space-y-0.5">
          {macchina ? (
            <p className="text-[15px] font-semibold leading-snug text-[color:var(--cab-text)]">{macchina}</p>
          ) : null}
          {cliente ? (
            <p className="truncate text-sm font-medium text-[color:var(--cab-text)]">{cliente}</p>
          ) : null}
          {identSummary ? (
            <p className="truncate font-mono text-xs text-[color:var(--cab-text-muted)]">{identSummary}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-2.5 flex min-w-0 max-w-full flex-nowrap items-center gap-2 sm:flex-wrap">
        <TablePillReadonly
          shellClass={prioritaPillShellClassDynamic()}
          shellStyle={prioritaPillShellStyle(prioHex)}
          fitContent
        >
          {prioritaLabel(p)}
        </TablePillReadonly>
        <TablePillReadonly
          shellClass={addettoPillShellClassDynamic()}
          shellStyle={addettoPillStyle}
          fitContent
        >
          <span className="max-w-[9rem] truncate">{addetto}</span>
        </TablePillReadonly>
      </div>

      <div className="mt-2 text-xs text-[color:var(--cab-text-muted)]">
        <LavorazioneIngressoDateCell row={row} schedeStore={schedeStore} layout="inline" />
      </div>

      {note.trim() ? (
        <p className="mt-2 line-clamp-1 text-xs text-[color:var(--cab-text-muted)]">{note}</p>
      ) : null}
    </div>
  );
});

KanbanCardMobile.displayName = "KanbanCardMobile";
