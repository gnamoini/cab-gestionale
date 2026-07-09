import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";

const MINIMAL_PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n",
);

export async function createOrdineImportSmokeImportFile(request: {
  post: (url: string, options?: { data?: unknown }) => Promise<{ ok: () => boolean; status: () => number; json: () => Promise<unknown> }>;
}): Promise<
  | { ok: true; importFileId: string; path: string; source: { type: "import_file"; id: string } }
  | { ok: false; message: string }
> {
  const policyRes = await request.post("/api/import-files/upload-policy", {
    data: {
      kind: "ordine_fornitore",
      fileName: "smoke-ordine-import.pdf",
      expectedMime: "application/pdf",
      expectedSizeBytes: MINIMAL_PDF.byteLength,
    },
  });
  if (!policyRes.ok()) {
    return { ok: false, message: `upload-policy: ${policyRes.status()}` };
  }

  const policy = (await policyRes.json()) as {
    fileId?: string;
    bucket?: string;
    path?: string;
  };
  if (!policy.fileId || !policy.path || !policy.bucket) {
    return { ok: false, message: "upload-policy: risposta incompleta" };
  }

  const serviceKey = readSupabaseServiceRoleKey();
  if (!serviceKey) return { ok: false, message: "SUPABASE_SERVICE_ROLE_KEY assente" };

  const { url } = assertSupabasePublicEnv();
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: uploadError } = await admin.storage
    .from(policy.bucket)
    .upload(policy.path, MINIMAL_PDF, { contentType: "application/pdf", upsert: false });
  if (uploadError) return { ok: false, message: uploadError.message };

  const finalizeRes = await request.post(`/api/import-files/${policy.fileId}/finalize`);
  if (!finalizeRes.ok()) {
    return { ok: false, message: `finalize: ${finalizeRes.status()}` };
  }

  return {
    ok: true,
    importFileId: policy.fileId,
    path: policy.path,
    source: { type: "import_file", id: policy.fileId },
  };
}

/** @deprecated smoke legacy document path — prefer createOrdineImportSmokeImportFile */
export async function createOrdineImportSmokeDocumento(request: {
  post: (url: string, options?: { data?: unknown }) => Promise<{ ok: () => boolean; status: () => number; json: () => Promise<unknown> }>;
}): Promise<
  | { ok: true; documentoId: string; path: string }
  | { ok: false; message: string }
> {
  void randomUUID;
  return createOrdineImportSmokeImportFile(request).then((r) =>
    r.ok
      ? { ok: true as const, documentoId: r.importFileId, path: r.path }
      : r,
  );
}

export { MINIMAL_PDF };
