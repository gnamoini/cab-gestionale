import { NextResponse } from "next/server";
import { verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";
import { SPARE_PARTS_UPLOAD_LIMITS } from "@/lib/ai/spare-parts/constants";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { sanitizeStorageFileName } from "@/src/lib/storage/storage-paths";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const allowed = await verifyServerPageWrite("identifica_ricambio");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { searchId: string; fileName: string; fileSize: number; mimeType: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  if (!body.searchId || !body.fileName) {
    return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 });
  }

  if (body.fileSize > SPARE_PARTS_UPLOAD_LIMITS.maxPhotoBytes) {
    return NextResponse.json({ error: "File troppo grande" }, { status: 413 });
  }

  if (!SPARE_PARTS_UPLOAD_LIMITS.allowedMimeTypes.includes(body.mimeType as (typeof SPARE_PARTS_UPLOAD_LIMITS.allowedMimeTypes)[number])) {
    return NextResponse.json({ error: "Tipo file non supportato" }, { status: 415 });
  }

  const sb = await createSupabaseServerUserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: search } = await sb
    .from("ai_part_searches")
    .select("id, created_by")
    .eq("id", body.searchId)
    .maybeSingle();
  if (!search) return NextResponse.json({ error: "Ricerca non trovata" }, { status: 404 });
  if (search.created_by !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const safeName = sanitizeStorageFileName(body.fileName, "foto");
  const path = `ai_part_search/${body.searchId}/${crypto.randomUUID()}-${safeName}`;

  const { data: asset, error: assetErr } = await sb
    .from("ai_part_search_assets")
    .insert({
      search_id: body.searchId,
      storage_path: path,
      kind: "part_photo",
      mime_type: body.mimeType,
      file_size_bytes: body.fileSize,
    })
    .select("id")
    .single();

  if (assetErr) return NextResponse.json({ error: assetErr.message }, { status: 500 });

  return NextResponse.json({
    bucket: STORAGE_BUCKETS.images,
    path,
    assetId: asset.id,
  });
}
