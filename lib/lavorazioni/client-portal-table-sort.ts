import type { ClientPortalRowBundle } from "@/lib/lavorazioni/client-portal-list-filters";
import { statoWorkflowOrderIndex } from "@/lib/lavorazioni/stato-order";
import type { GlobalTableSortPhase } from "@/lib/ui/global-table";
export type ClientPortalSortKey =
  | "ingresso"
  | "cliente"
  | "cantiere"
  | "attrezzatura"
  | "mezzoIdent"
  | "note"
  | "stato"
  | "completamento"
  | "addetto";

function cmpStr(a: string, b: string): number {
  return a.localeCompare(b, "it", { sensitivity: "base" });
}

function noteText(bundle: ClientPortalRowBundle): string {
  return bundle.fields.noteIntervento.trim();
}

function cmpBundle(
  a: ClientPortalRowBundle,
  b: ClientPortalRowBundle,
  key: ClientPortalSortKey,
  phase: Exclude<GlobalTableSortPhase, "natural">,
  variant: "active" | "archive",
  statoOrderIds: readonly string[],
): number {
  const dir = phase === "desc" ? -1 : 1;
  const t = (x: number) => x * dir;
  const { row: ra, fields: fa } = a;
  const { row: rb, fields: fb } = b;

  switch (key) {
    case "ingresso": {
      const da = new Date(fa.dataIngressoAt).getTime();
      const db = new Date(fb.dataIngressoAt).getTime();
      return t(da === db ? 0 : da < db ? -1 : 1);
    }
    case "cliente":
      return t(
        cmpStr(
          `${fa.cliente}\t${fa.utilizzatore}`,
          `${fb.cliente}\t${fb.utilizzatore}`,
        ),
      );
    case "cantiere":
      return t(cmpStr(fa.cantiere, fb.cantiere));
    case "attrezzatura":
      return t(cmpStr(fa.attrezzatura, fb.attrezzatura));
    case "mezzoIdent":
      return t(
        cmpStr(
          `${fa.targa}\t${fa.matricola}\t${fa.nScuderia}`,
          `${fb.targa}\t${fb.matricola}\t${fb.nScuderia}`,
        ),
      );
    case "note":
      return t(cmpStr(noteText(a), noteText(b)));
    case "addetto":
      return t(cmpStr(fa.addetto, fb.addetto));
    case "stato":
      if (variant === "archive") return 0;
      return t(
        statoWorkflowOrderIndex(ra.stato, statoOrderIds) -
          statoWorkflowOrderIndex(rb.stato, statoOrderIds),
      );
    case "completamento": {
      const ua = new Date(ra.archived_at ?? ra.data_uscita ?? ra.updated_at).getTime();
      const ub = new Date(rb.archived_at ?? rb.data_uscita ?? rb.updated_at).getTime();
      return t(ua === ub ? 0 : ua < ub ? -1 : 1);
    }
    default:
      return 0;
  }
}

export function sortClientPortalBundles(
  bundles: ClientPortalRowBundle[],
  sortColumn: ClientPortalSortKey | null,
  sortPhase: GlobalTableSortPhase,
  variant: "active" | "archive",
  statoOrderIds: readonly string[],
): ClientPortalRowBundle[] {
  const rows = [...bundles];
  rows.sort((a, b) => {
    if (sortPhase === "natural" || sortColumn === null) {
      const da = new Date(a.row.created_at).getTime();
      const db = new Date(b.row.created_at).getTime();
      if (db !== da) return db - da;
      return b.row.id.localeCompare(a.row.id);
    }
    const p = cmpBundle(a, b, sortColumn, sortPhase, variant, statoOrderIds);
    if (p !== 0) return p;
    return b.row.id.localeCompare(a.row.id);
  });
  return rows;
}
