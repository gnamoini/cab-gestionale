import "server-only";

import type { PdfArtifactType } from "@/lib/pdf-artifacts/pdf-artifact-registry";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";

export async function verifyPdfArtifactReadAccess(type: PdfArtifactType): Promise<boolean> {
  switch (type) {
    case "lavorazioni-in-corso":
    case "scheda-ingresso":
    case "scheda-lavorazioni":
    case "scheda-ricambi":
      return verifyServerPageRead("lavorazioni");
    case "report-bundle":
      return verifyServerPageRead("report");
    case "preventivo":
      return verifyServerPageRead("preventivi");
    case "fattura":
      return verifyServerPageRead("fatturazione");
    case "ddt": {
      if (await verifyServerPageRead("preventivi")) return true;
      return verifyServerPageRead("preventivi");
    }
    case "ordine-fornitore":
      return verifyServerPageRead("preventivi");
    case "dipendenti-aziendale":
    case "dipendenti-dipendente":
      return verifyServerPageRead("dipendenti");
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
