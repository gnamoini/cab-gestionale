import { NextResponse } from "next/server";
import { fetchInventoryReceivingDocument } from "@/lib/inventory-receiving/extraction/ddt-extraction-processor.server";
import { getImportFileBytes } from "@/lib/import-files/import-file-bytes.server";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const canRead = await verifyServerPageRead("magazzino_carichi");
  if (!canRead) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const session = await getServerSession();
  const userId = session.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sessione non valida" }, { status: 401 });
  }

  const { id } = await context.params;
  const data = await fetchInventoryReceivingDocument(id);
  if (!data?.document) {
    return NextResponse.json({ error: "Documento non trovato" }, { status: 404 });
  }

  const filePath = data.document.file_path;
  const importFileId = data.document.import_file_id;

  if (importFileId) {
    const download = await getImportFileBytes(importFileId, userId);
    if (download.ok && download.storagePath && download.bucket) {
      const sb = await createSupabaseServerUserClient();
      const { data: signed, error } = await sb.storage
        .from(download.bucket)
        .createSignedUrl(download.storagePath, 3600);
      if (!error && signed?.signedUrl) {
        return NextResponse.json({ url: signed.signedUrl, mime: download.mime });
      }
    }
  }

  if (filePath) {
    const sb = await createSupabaseServerUserClient();
    const { data: signed, error } = await sb.storage.from("import-sources").createSignedUrl(filePath, 3600);
    if (!error && signed?.signedUrl) {
      return NextResponse.json({ url: signed.signedUrl });
    }
  }

  return NextResponse.json({ error: "Anteprima non disponibile" }, { status: 404 });
}
