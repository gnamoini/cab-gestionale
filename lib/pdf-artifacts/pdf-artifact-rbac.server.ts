import "server-only";

import type { PdfArtifactType } from "@/lib/pdf-artifacts/pdf-artifact-registry";
import { verifyServerSectionRead } from "@/src/lib/auth/server-permission-guards";

export async function verifyPdfArtifactReadAccess(type: PdfArtifactType): Promise<boolean> {
  switch (type) {
    case "lavorazioni-in-corso":
    case "scheda-ingresso":
    case "scheda-lavorazioni":
    case "scheda-ricambi":
      return verifyServerSectionRead("lavorazioni");
    case "report-bundle":
      return verifyServerSectionRead("report");
    case "preventivo":
      return verifyServerSectionRead("preventivi");
    case "fattura":
      return verifyServerSectionRead("fatturazione");
    case "ddt": {
      if (await verifyServerSectionRead("ddt")) return true;
      return verifyServerSectionRead("preventivi");
    }
    case "ordine-fornitore":
      return verifyServerSectionRead("ordini_fornitori");
    case "dipendenti-aziendale":
    case "dipendenti-dipendente":
      return verifyServerSectionRead("dipendenti");
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
