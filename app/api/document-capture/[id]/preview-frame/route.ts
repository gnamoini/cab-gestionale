import "server-only";

import { buildCapturePdfPreviewFrameHtml } from "@/lib/document-capture/capture-pdf-preview-frame-html";
import { computeCapturePdfEmbedHeightPx } from "@/lib/document-capture/capture-pdf-embed-height";
import { resolveServerThemeMode } from "@/lib/theme/cab-theme-storage";
import { verifyServerModuleCan } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function parsePreviewWidthPx(raw: string | null): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n) || n < 200) return 720;
  return Math.min(n, 2400);
}

export async function GET(request: Request, context: RouteContext) {
  if (!(await verifyServerModuleCan("document_capture", "read"))) {
    return NextResponse.json({ error: "Permesso richiesto" }, { status: 403 });
  }

  const { id } = await context.params;
  const viewportWidthPx = parsePreviewWidthPx(new URL(request.url).searchParams.get("w"));
  const theme = resolveServerThemeMode((await cookies()).get("cab-theme")?.value);

  const sb = await createSupabaseServerUserClient();
  const { data: capture, error } = await sb
    .from("document_capture")
    .select("id, storage_path, finalized_at, deleted_at")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!capture?.finalized_at) {
    return NextResponse.json({ error: "document_not_finalized", code: "document_not_finalized" }, { status: 403 });
  }

  const { data: fileData, error: downloadError } = await sb.storage
    .from("document-capture")
    .download(capture.storage_path);

  if (downloadError || !fileData) {
    return NextResponse.json({ error: "File non trovato" }, { status: 404 });
  }

  const bytes = new Uint8Array(await fileData.arrayBuffer());
  let embedHeightPx = viewportWidthPx * 1.4;
  try {
    embedHeightPx = await computeCapturePdfEmbedHeightPx(bytes, viewportWidthPx);
  } catch {
    // ponytail: fallback height if pdf-lib cannot parse — viewer still usable
  }

  const fileUrl = `/api/document-capture/${id}/file`;
  const html = buildCapturePdfPreviewFrameHtml({ fileUrl, embedHeightPx, theme });

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, max-age=300",
    },
  });
}
