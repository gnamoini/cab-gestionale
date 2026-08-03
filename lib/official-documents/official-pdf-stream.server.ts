import "server-only";

import {
  deliverPdfArtifact,
  type PdfArtifactDelivery,
} from "@/lib/pdf-artifacts/pdf-artifact-generate.server";
import { err, success, type ServiceResult } from "@/src/services/service-result";

type OfficialPdfStreamOptions = {
  /** Portale cliente: RBAC già verificato via token / visibilità RPC. */
  skipRbac?: boolean;
};

/** SSOT identico a `/api/pdf/artifacts/*` e pagina Preventivi. */
export async function streamOfficialPreventivoPdfServer(
  preventivoId: string,
  autore?: string,
  options?: OfficialPdfStreamOptions,
): Promise<ServiceResult<PdfArtifactDelivery>> {
  const generated = await deliverPdfArtifact(
    "preventivo",
    { id: preventivoId, autore },
    { skipRbac: options?.skipRbac },
  );
  if (!generated.success || !generated.data) {
    return err(generated.error ?? "PDF non disponibile");
  }
  return success(generated.data);
}

export async function streamOfficialDdtPdfServer(
  ddtId: string,
  options?: OfficialPdfStreamOptions,
): Promise<ServiceResult<PdfArtifactDelivery>> {
  const generated = await deliverPdfArtifact("ddt", { id: ddtId }, { skipRbac: options?.skipRbac });
  if (!generated.success || !generated.data) {
    return err(generated.error ?? "PDF non disponibile");
  }
  return success(generated.data);
}
