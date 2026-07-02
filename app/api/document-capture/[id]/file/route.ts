import "server-only";

import { verifyServerModuleCan } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!(await verifyServerModuleCan("document_capture", "read"))) {
    return NextResponse.json({ error: "Permesso richiesto" }, { status: 403 });
  }

  const { id } = await context.params;
  const sb = await createSupabaseServerUserClient();

  const { data: capture, error } = await sb
    .from("document_capture")
    .select("id, storage_path, finalized_at, file_name, mime, deleted_at")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!capture) {
    return NextResponse.json({ error: "Capture non trovato" }, { status: 404 });
  }

  if (!capture.finalized_at) {
    return NextResponse.json({ error: "document_not_finalized", code: "document_not_finalized" }, { status: 403 });
  }

  const { data: fileData, error: downloadError } = await sb.storage
    .from("document-capture")
    .download(capture.storage_path);

  if (downloadError || !fileData) {
    return NextResponse.json({ error: "File non trovato" }, { status: 404 });
  }

  const bytes = await fileData.arrayBuffer();
  const contentType = capture.mime ?? fileData.type ?? "application/octet-stream";
  const safeName = capture.file_name.replace(/[^\w.\- ]+/g, "_");

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
