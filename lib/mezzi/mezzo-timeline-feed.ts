import type { MezziHubLogEntry } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { isSystemLogAzione } from "@/lib/gestionale-log/log-summary";
import type { MezzoInterventoLavorazione } from "@/lib/mezzi/types";
import type { MezzoTimelineItem } from "@/src/services/domain/mezzo-domain.service";
import type { MezzoAnagraficaHistoryRow } from "@/src/services/mezzo-anagrafica-history.service";

export const MEZZO_TIMELINE_PAGE_SIZE = 10;

export type MezzoTimelineFilter = "all" | "lavorazioni" | "anagrafica" | "tagliandi" | "sistema";

export type MezzoTimelineEventCategory =
  | "lavorazione"
  | "anagrafica"
  | "tagliando"
  | "movimento"
  | "sistema"
  | "altro";

export type MezzoTimelineFeedEvent = {
  id: string;
  at: string;
  category: MezzoTimelineEventCategory;
  renderKind: "timeline_item" | "log_modifiche" | "anagrafica_history";
  lavorazioneId?: string;
  payload: MezzoTimelineItem | MezziHubLogEntry | MezzoAnagraficaHistoryRow;
};

export type MezzoTimelineLavorazioneBlock = {
  kind: "lavorazioneBlock";
  lavorazioneId: string;
  codice: string;
  mezzoId: string;
  rangeStart: string;
  rangeEnd: string | null;
  eventCount: number;
  categories: MezzoTimelineEventCategory[];
  hasCriticalEvents: boolean;
  events: MezzoTimelineFeedEvent[];
  sortAt: string;
};

export type MezzoTimelineFeedTopItem =
  | MezzoTimelineLavorazioneBlock
  | { kind: "standalone"; event: MezzoTimelineFeedEvent; sortAt: string };

export type MezzoTimelineFeedInput = {
  mezzoId: string;
  timeline: readonly MezzoTimelineItem[];
  logEntries: readonly MezziHubLogEntry[];
  anagraficaHistory: readonly MezzoAnagraficaHistoryRow[];
  interventi: readonly MezzoInterventoLavorazione[];
};

const TAGLIANDO_KINDS = new Set<MezzoTimelineItem["kind"]>([
  "tagliando",
  "preset_assigned",
  "preset_changed",
  "compliance_reviewed",
  "forecast_recomputed",
]);

function categoryFromTimelineItem(item: MezzoTimelineItem): MezzoTimelineEventCategory {
  if (item.kind === "lifecycle") return "sistema";
  if (TAGLIANDO_KINDS.has(item.kind)) return "tagliando";
  if (item.kind === "lavorazione") return "lavorazione";
  if (item.kind === "movimento") return "movimento";
  if (item.kind === "log") {
    const title = item.title.toLowerCase();
    if (
      title.includes("create") ||
      title.includes("creazione") ||
      title.includes("delete") ||
      title.includes("elimin") ||
      title.includes("import")
    ) {
      return "sistema";
    }
    return "anagrafica";
  }
  return "altro";
}

function categoryFromLogEntry(entry: MezziHubLogEntry): MezzoTimelineEventCategory {
  if (entry.tipo === "aggiunta" || entry.tipo === "rimozione") return "sistema";
  if (entry.azione && isSystemLogAzione(entry.azione)) return "sistema";
  return "anagrafica";
}

function categoryFromAnagraficaHistory(row: MezzoAnagraficaHistoryRow): MezzoTimelineEventCategory {
  const o = row.origine.toLowerCase();
  if (o.includes("import") || o.includes("sistema") || o.includes("create")) return "sistema";
  return "anagrafica";
}

function isCriticalEvent(ev: MezzoTimelineFeedEvent): boolean {
  if (ev.renderKind === "log_modifiche") {
    const e = ev.payload as MezziHubLogEntry;
    return e.tipo === "rimozione" || /delete|elimin|archiv/i.test(e.riepilogo);
  }
  if (ev.renderKind === "timeline_item") {
    const item = ev.payload as MezzoTimelineItem;
    return /delete|elimin|archiv/i.test(item.title);
  }
  return false;
}

function aggregateCategories(events: MezzoTimelineFeedEvent[]): MezzoTimelineEventCategory[] {
  return [...new Set(events.map((e) => e.category))];
}

function timelineLogIdFromItem(item: MezzoTimelineItem): string | null {
  if (item.kind !== "log") return null;
  if (item.id.startsWith("log-")) return item.id.slice(4);
  return null;
}

function normalizeEvents(input: MezzoTimelineFeedInput): MezzoTimelineFeedEvent[] {
  const hubLogIds = new Set(input.logEntries.map((e) => e.id));
  const events: MezzoTimelineFeedEvent[] = [];

  for (const entry of input.logEntries) {
    events.push({
      id: `hub-log-${entry.id}`,
      at: entry.at,
      category: categoryFromLogEntry(entry),
      renderKind: "log_modifiche",
      payload: entry,
    });
  }

  for (const item of input.timeline) {
    if (item.kind === "log") {
      const logId = timelineLogIdFromItem(item);
      if (logId && hubLogIds.has(logId)) continue;
    }
    events.push({
      id: `tl-${item.id}`,
      at: item.at,
      category: categoryFromTimelineItem(item),
      renderKind: "timeline_item",
      lavorazioneId: item.ref?.lavorazioneId,
      payload: item,
    });
  }

  for (const row of input.anagraficaHistory) {
    events.push({
      id: `anh-${row.id}`,
      at: row.created_at,
      category: categoryFromAnagraficaHistory(row),
      renderKind: "anagrafica_history",
      lavorazioneId: row.lavorazione_id?.trim() || undefined,
      payload: row,
    });
  }

  const seen = new Set<string>();
  return events.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

function assignToBlocks(
  events: MezzoTimelineFeedEvent[],
  interventi: readonly MezzoInterventoLavorazione[],
  mezzoId: string,
): { blocks: MezzoTimelineLavorazioneBlock[]; standalone: MezzoTimelineFeedEvent[] } {
  const byLav = new Map<string, MezzoTimelineFeedEvent[]>();
  const standalone: MezzoTimelineFeedEvent[] = [];

  for (const ev of events) {
    const lavId = ev.lavorazioneId?.trim();
    if (lavId) {
      const list = byLav.get(lavId) ?? [];
      list.push(ev);
      byLav.set(lavId, list);
    } else {
      standalone.push(ev);
    }
  }

  const interventoById = new Map(interventi.map((i) => [i.id, i]));
  const blocks: MezzoTimelineLavorazioneBlock[] = [];

  for (const [lavorazioneId, blockEvents] of byLav) {
    const intervento = interventoById.get(lavorazioneId);
    const sorted = [...blockEvents].sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    );
    const categories = aggregateCategories(sorted);
    blocks.push({
      kind: "lavorazioneBlock",
      lavorazioneId,
      codice: intervento?.codice?.trim() || lavorazioneId.slice(0, 8),
      mezzoId,
      rangeStart: intervento?.dataIngresso ?? sorted[sorted.length - 1]!.at,
      rangeEnd: intervento?.dataCompletamento ?? null,
      eventCount: sorted.length,
      categories,
      hasCriticalEvents: sorted.some(isCriticalEvent),
      events: sorted,
      sortAt: intervento?.dataIngresso ?? sorted[0]!.at,
    });
  }

  blocks.sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime());
  standalone.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return { blocks, standalone };
}

export function buildMezzoTimelineFeed(input: MezzoTimelineFeedInput): MezzoTimelineFeedTopItem[] {
  const events = normalizeEvents(input);
  const { blocks, standalone } = assignToBlocks(events, input.interventi, input.mezzoId);

  const top: MezzoTimelineFeedTopItem[] = [
    ...blocks,
    ...standalone.map((event) => ({
      kind: "standalone" as const,
      event,
      sortAt: event.at,
    })),
  ];

  top.sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime());
  return top;
}

export function filterMezzoTimelineFeed(
  items: readonly MezzoTimelineFeedTopItem[],
  filter: MezzoTimelineFilter,
): MezzoTimelineFeedTopItem[] {
  if (filter === "all") return [...items];

  if (filter === "lavorazioni") {
    return items.filter((i): i is MezzoTimelineLavorazioneBlock => i.kind === "lavorazioneBlock");
  }

  if (filter === "anagrafica") {
    return items.filter((i) => i.kind === "standalone" && i.event.category === "anagrafica");
  }

  if (filter === "tagliandi") {
    return items.filter((i) => {
      if (i.kind === "standalone") return i.event.category === "tagliando";
      return i.categories.includes("tagliando");
    });
  }

  if (filter === "sistema") {
    return items.filter((i) => i.kind === "standalone" && i.event.category === "sistema");
  }

  return [...items];
}

export function countMezzoTimelineFeedEvents(items: readonly MezzoTimelineFeedTopItem[]): number {
  let n = 0;
  for (const item of items) {
    if (item.kind === "lavorazioneBlock") n += item.eventCount;
    else n += 1;
  }
  return n;
}
