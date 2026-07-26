import type { MezziHubTabId } from "@/components/gestionale/mezzi/mezzi-hub-ui";
import type { TagliandoStatoUi } from "@/lib/maintenance-plans/tagliando-stato-labels";

export const Q_MEZZI_VIEW = "view";
export const Q_TAGLIANDI_SECTION = "tagliandiSection";
export const Q_MEZZI_HUB = "hubMezzo";
export const Q_MEZZI_HUB_TAB = "hubTab";
export const Q_TAGLIANDI_PRESET = "preset";
export const Q_TAGLIANDI_STATO = "stato";
export const Q_TAGLIANDI_HIGHLIGHT = "highlight";

export type MezziPageViewParam = "anagrafica" | "tagliandi";
export type TagliandiSectionParam = "panoramica" | "preset";

export function parseMezziViewFromSearchParam(raw: string | null): MezziPageViewParam | null {
  const v = raw?.trim();
  if (v === "anagrafica" || v === "tagliandi") return v;
  return null;
}

export function parseTagliandiSectionFromSearchParam(raw: string | null): TagliandiSectionParam | null {
  const v = raw?.trim();
  if (v === "panoramica" || v === "preset") return v;
  return null;
}

export function parseTagliandoStatoFilter(raw: string | null): TagliandoStatoUi | "" {
  const v = raw?.trim();
  if (v === "programmato" || v === "imminente" || v === "scaduto" || v === "completato") return v;
  return "";
}

export function buildMezziAnagraficaHubHref(input: {
  mezzoId: string;
  hubTab?: MezziHubTabId;
}): string {
  const sp = new URLSearchParams();
  sp.set(Q_MEZZI_VIEW, "anagrafica");
  sp.set(Q_MEZZI_HUB, input.mezzoId.trim());
  sp.set(Q_MEZZI_HUB_TAB, input.hubTab ?? "panoramica");
  return `/mezzi?${sp.toString()}`;
}

export function buildMezziTagliandiHubHref(input: {
  mezzoId: string;
  hubTab?: MezziHubTabId;
  highlight?: string;
}): string {
  const sp = new URLSearchParams();
  sp.set(Q_MEZZI_VIEW, "tagliandi");
  sp.set(Q_TAGLIANDI_SECTION, "panoramica");
  sp.set(Q_MEZZI_HUB, input.mezzoId.trim());
  sp.set(Q_MEZZI_HUB_TAB, input.hubTab ?? "tagliandi");
  if (input.highlight?.trim()) sp.set(Q_TAGLIANDI_HIGHLIGHT, input.highlight.trim());
  return `/mezzi?${sp.toString()}`;
}

export function buildMezziTagliandiOverviewHref(input?: {
  presetId?: string;
  stato?: TagliandoStatoUi;
  highlight?: string;
}): string {
  const sp = new URLSearchParams();
  sp.set(Q_MEZZI_VIEW, "tagliandi");
  sp.set(Q_TAGLIANDI_SECTION, "panoramica");
  if (input?.presetId?.trim()) sp.set(Q_TAGLIANDI_PRESET, input.presetId.trim());
  if (input?.stato) sp.set(Q_TAGLIANDI_STATO, input.stato);
  if (input?.highlight?.trim()) sp.set(Q_TAGLIANDI_HIGHLIGHT, input.highlight.trim());
  return `/mezzi?${sp.toString()}`;
}

export function buildMezziTagliandiPresetsHref(): string {
  const sp = new URLSearchParams();
  sp.set(Q_MEZZI_VIEW, "tagliandi");
  sp.set(Q_TAGLIANDI_SECTION, "preset");
  return `/mezzi?${sp.toString()}`;
}
