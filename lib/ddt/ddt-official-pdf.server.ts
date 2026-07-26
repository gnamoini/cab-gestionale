import "server-only";

import { loadBrandingLogoDataUrlServer } from "@/lib/branding/branding-logo-for-pdf.server";
import { fetchClienteAnagraficaByLabelServer } from "@/lib/clienti/clienti-anagrafica-fetch.server";
import { fetchDdtDetailServer } from "@/lib/ddt/ddt-fetch-server";
import { ddtPdfFileName, generateDdtPdfBytes } from "@/lib/ddt/ddt-pdf-generate";
import { stableHashPayload } from "@/lib/pdf-artifacts/pdf-artifact-registry";
import { buildPdfArtifactObjectPath } from "@/lib/pdf-artifacts/pdf-artifact-paths";
import { uploadPdfArtifact } from "@/lib/pdf-artifacts/pdf-artifact-storage.server";
import { verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";

export async function persistDdtOfficialPdfServer(ddtId: string): Promise<ServiceResult<{ artifactId: string }>> {
  const allowed = await verifyServerPageWrite("preventivi");
  if (!allowed) return err("Permesso richiesto.");

  const id = ddtId.trim();
  if (!id) return err("DDT non valido.");

  const detail = await fetchDdtDetailServer(id);
  if (!detail) return err("DDT non trovato.");

  try {
    const clienteAnag = await fetchClienteAnagraficaByLabelServer(detail.document.cliente_label);
    const logo = await loadBrandingLogoDataUrlServer();
    const bytes = generateDdtPdfBytes(detail, logo, {
      clienteAnagrafica: clienteAnag?.anagrafica ?? null,
      codiceFiscale: clienteAnag?.codiceFiscale,
    });
    const hash = stableHashPayload({
      id: detail.document.id,
      updatedAt: detail.document.updated_at,
      status: detail.document.status,
      anagUpdatedAt: clienteAnag?.updatedAt ?? null,
    });
    const storagePath = buildPdfArtifactObjectPath("ddt", id, hash);
    await uploadPdfArtifact(storagePath, bytes);
    void ddtPdfFileName(detail);

    const sb = await createSupabaseServerUserClient();
    const { data: artifactId, error: rpcErr } = await sb.rpc("commit_ddt_pdf_artifact", {
      p_ddt_id: id,
      p_storage_path: storagePath,
      p_hash: hash,
    });
    if (rpcErr) return err(rpcErr.message);
    if (!artifactId) return err("Commit artifact DDT non riuscito.");

    return success({ artifactId: String(artifactId) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generazione PDF DDT non riuscita";
    return err(message);
  }
}
