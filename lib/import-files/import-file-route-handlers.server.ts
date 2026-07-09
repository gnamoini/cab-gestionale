import "server-only";

import { NextResponse } from "next/server";
import { requireImportFileAuthUser } from "@/lib/import-files/import-file-route-auth.server";
import { finalizeImportFileInTransaction } from "@/lib/import-files/finalize.server";
import { assertImportFileOwner } from "@/lib/import-files/import-file-access.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export async function handleImportFileFinalize(fileId: string) {
  const auth = await requireImportFileAuthUser();
  if (auth instanceof NextResponse) return auth;

  const sb = await createSupabaseServerUserClient();
  const { data: row, error } = await sb
    .from("import_files")
    .select("id, storage_path, status, kind")
    .eq("id", fileId)
    .maybeSingle();

  if (error || !row?.storage_path) {
    return NextResponse.json({ error: "Import file non trovato" }, { status: 404 });
  }

  try {
    await assertImportFileOwner(fileId, auth.userId);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Permesso negato";
    return NextResponse.json({ error: message, code: "FORBIDDEN" }, { status: 403 });
  }

  const result = await finalizeImportFileInTransaction({
    fileId: row.id,
    storagePath: row.storage_path,
  });

  if (!result.ok) {
    const status = result.isPolicyError || result.code === "STORAGE_PERMISSION_DENIED" ? 403 : 400;
    return NextResponse.json({ error: result.message, code: result.code }, { status });
  }

  return NextResponse.json(result);
}

export async function handleImportFileAbandon(fileId: string) {
  const auth = await requireImportFileAuthUser();
  if (auth instanceof NextResponse) return auth;

  try {
    await assertImportFileOwner(fileId, auth.userId);
    const { cancelImportFile } = await import("@/lib/import-files/import-file-lifecycle.server");
    await cancelImportFile(fileId, auth.userId);
    const { cleanupImportStorage } = await import("@/lib/import-files/cleanup-import-storage.server");
    await cleanupImportStorage().catch(() => undefined);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Annullamento non riuscito";
    const code = (e as Error & { code?: string }).code;
    const status = code === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: message, code: code ?? "ABANDON_FAILED" }, { status });
  }
}
