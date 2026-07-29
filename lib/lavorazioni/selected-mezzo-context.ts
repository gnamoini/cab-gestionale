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
