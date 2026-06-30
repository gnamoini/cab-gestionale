import type { DdtKpi } from "@/lib/ddt/types";
import type { DdtDocumentRow } from "@/src/types/supabase-tables";

export function buildDdtKpi(documents: readonly DdtDocumentRow[]): DdtKpi {
  let bozze = 0;
  let confermati = 0;
  let stampati = 0;
  let consegnati = 0;
  let annullati = 0;

  for (const d of documents) {
    switch (d.status) {
      case "bozza":
        bozze += 1;
        break;
      case "confermato":
        confermati += 1;
        break;
      case "stampato":
        stampati += 1;
        break;
      case "consegnato":
        consegnati += 1;
        break;
      case "annullato":
        annullati += 1;
        break;
      default:
        break;
    }
  }

  return {
    totale: documents.length,
    bozze,
    confermati,
    stampati,
    consegnati,
    annullati,
  };
}
