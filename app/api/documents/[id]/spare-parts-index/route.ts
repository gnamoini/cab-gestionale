import { NextResponse } from "next/server";
import { verifyServerPageRead, verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { readDocumentSparePartsMeta } from "@/lib/documents/document-spare-parts-meta";
import { deriveDocumentAiIndexBadges } from "@/lib/documents/document-spare-parts-meta";
import { enqueueDocumentAiIndex } from "@/lib/ai/spare-parts/queue/document-index-queue.server";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { createClient } from "@supabase/supabase-js";
import { waitUntil } from "@vercel/functions";
import { processSparePartsQueues } from "@/lib/ai/spare-parts/workers/spare-parts-worker.server";
import { readDocumentIntelligenceMeta } from "@/lib/documents/document-meta";

export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const allowed = await verifyServerPageRead("documenti");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  const sb = await createSupabaseServerUserClient();

  const { data: doc } = await sb.from("documenti").select("meta").eq("id", id).maybeSingle();
  if (!doc) return NextResponse.json({ error: "Documento non trovato" }, { status: 404 });

  const meta = (doc.meta as Record<string, unknown>) ?? {};
  const spare = readDocumentSparePartsMeta(meta);

  const { data: index } = await sb
    .from("document_ai_index")
    .select("status, understanding_status, index_quality, document_capabilities")
    .eq("documento_id", id)
    .eq("is_active", true)
    .maybeSingle();

  const badges = deriveDocumentAiIndexBadges({
    aiEnabled: spare.aiSparePartsEnabled === true,
    status: index?.status as string | undefined,
    understandingStatus: index?.understanding_status as string | undefined,
    indexQuality: index?.index_quality as string | undefined,
    capabilities: (index?.document_capabilities as Record<string, boolean>) ?? {},
  });

  return NextResponse.json({
    aiSparePartsEnabled: spare.aiSparePartsEnabled === true,
    index: index ?? null,
    badges,
  });
}

export async function POST(_request: Request, context: RouteContext) {
  const allowed = await verifyServerPageWrite("documenti");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  const sb = await createSupabaseServerUserClient();

  const { data: doc } = await sb.from("documenti").select("meta, url_file").eq("id", id).maybeSingle();
  if (!doc?.url_file) return NextResponse.json({ error: "Documento non trovato" }, { status: 404 });

  const meta = (doc.meta as Record<string, unknown>) ?? {};
  const spare = readDocumentSparePartsMeta(meta);
  if (!spare.aiSparePartsEnabled) {
    return NextResponse.json({ error: "Ricambi AI non abilitato per questo documento" }, { status: 400 });
  }

  const intelligence = readDocumentIntelligenceMeta(meta);
  const contentHash = intelligence.contentHash;
  if (!contentHash) {
    return NextResponse.json({ error: "Hash contenuto mancante — ricarica il documento" }, { status: 400 });
  }

  const result = await enqueueDocumentAiIndex(sb, { documentoId: id, contentHash });

  const serviceKey = readSupabaseServiceRoleKey();
  if (serviceKey) {
    const { url } = assertSupabasePublicEnv();
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    waitUntil(processSparePartsQueues(admin));
  }

  return NextResponse.json({ ok: true, indexId: result.id, created: result.created });
}
