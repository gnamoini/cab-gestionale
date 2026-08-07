export type MezzoSelectionSource =
  | "search"
  | "recent"
  | "cliente-group"
  | "qr"
  | "ai"
  | "capture"
  | "manual";

export type SelectedMezzoContext =
  | { mode: "existing"; mezzoId: string; source: MezzoSelectionSource }
  | { mode: "new"; source: "manual" };

export function selectedMezzoDefaultId(ctx: SelectedMezzoContext | null | undefined): string | null {
  if (!ctx || ctx.mode !== "existing") return null;
  const id = ctx.mezzoId.trim();
  return id || null;
}

export function selectedMezzoWizardKey(ctx: SelectedMezzoContext | null | undefined): string {
  if (!ctx) return "none";
  if (ctx.mode === "new") return "new";
  return `existing:${ctx.mezzoId}:${ctx.source}`;
}

/** Origine esplicita del flusso creazione — non dedurre dai campi scheda. */
export type LavorazioneMezzoEntryOrigin = "catalog_selected" | "new_mezzo";

export function resolveMezzoEntryOrigin(
  ctx: SelectedMezzoContext | null | undefined,
): LavorazioneMezzoEntryOrigin {
  if (ctx?.mode === "existing") return "catalog_selected";
  return "new_mezzo";
}

/** Mezzo scelto nel wizard — immutabile per tutta la sessione di creazione. */
export function resolvePrelinkedMezzoId(ctx: SelectedMezzoContext | null | undefined): string | null {
  return selectedMezzoDefaultId(ctx);
}
