import "server-only";

import { fetchCurrentPdfArtifactForEntityServer } from "@/lib/pdf-artifacts/pdf-artifact-db.server";
import { deliverPdfArtifact } from "@/lib/pdf-artifacts/pdf-artifact-generate.server";
import { verifyPdfArtifactReadAccess } from "@/lib/pdf-artifacts/pdf-artifact-rbac.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";
import { normalizeStorageObjectPath } from "@/src/lib/storage/storage-paths";

export type OfficialPdfStreamResult = {
  bytes: Uint8Array;
  fileName: string;
};

export async function streamOfficialPreventivoPdfServer(
  preventivoId: string,
  autore?: string,
): Promise<ServiceResult<OfficialPdfStreamResult>> {
  if (!(await verifyPdfArtifactReadAccess("preventivo"))) {
    return err("Permesso richiesto.");
  }

  const artifactRes = await fetchCurrentPdfArtifactForEntityServer("preventivo", preventivoId);
  if (artifactRes.success && artifactRes.data?.storage_path) {
    const sb = await createSupabaseServerUserClient();
    const path = normalizeStorageObjectPath(artifactRes.data.storage_path);
    const { data, error } = await sb.storage.from(STORAGE_BUCKETS.pdfArtifacts).download(path);
    if (!error && data) {
      const bytes = new Uint8Array(await data.arrayBuffer());
      return success({ bytes, fileName: `preventivo-${preventivoId}.pdf` });
    }
  }

  const generated = await deliverPdfArtifact("preventivo", { id: preventivoId, autore });
  if (!generated.success || !generated.data) {
    return err(generated.error ?? "PDF non disponibile");
  }
  return success({ bytes: generated.data.bytes, fileName: generated.data.fileName });
}

export async function streamOfficialDdtPdfServer(ddtId: string): Promise<ServiceResult<OfficialPdfStreamResult>> {
  if (!(await verifyPdfArtifactReadAccess("ddt"))) {
    return err("Permesso richiesto.");
  }

  const artifactRes = await fetchCurrentPdfArtifactForEntityServer("ddt", ddtId);
  if (artifactRes.success && artifactRes.data?.storage_path) {
    const sb = await createSupabaseServerUserClient();
    const path = normalizeStorageObjectPath(artifactRes.data.storage_path);
    const { data, error } = await sb.storage.from(STORAGE_BUCKETS.pdfArtifacts).download(path);
    if (!error && data) {
      const bytes = new Uint8Array(await data.arrayBuffer());
      return success({ bytes, fileName: `ddt-${ddtId}.pdf` });
    }
  }

  const generated = await deliverPdfArtifact("ddt", { id: ddtId });
  if (!generated.success || !generated.data) {
    return err(generated.error ?? "PDF non disponibile");
  }
  return success({ bytes: generated.data.bytes, fileName: generated.data.fileName });
}
