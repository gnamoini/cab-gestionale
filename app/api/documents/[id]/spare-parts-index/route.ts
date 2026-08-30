import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createClient } from "@supabase/supabase-js";
import { verifyServerPageRead, verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { readDocumentSparePartsMeta } from "@/lib/documents/document-spare-parts-meta";
import { deriveDocumentAiIndexBadges } from "@/lib/documents/document-spare-parts-meta";
import { enqueueDocumentAiIndex } from "@/lib/ai/spare-parts/queue/document-index-queue.server";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { processDocumentAiIndexForDocumento } from "@/lib/ai/spare-parts/workers/spare-parts-worker.server";
import { resolveDocumentContentHashForIndexing } from "@/lib/documents/resolve-document-content-hash.server";

export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

function createSparePartsAdminClient() {
  const serviceKey = readSupabaseServiceRoleKey();
  if (!serviceKey) return null;
  const { url } = assertSupabasePublicEnv();
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function mapEnqueueError(message: string): string {
  if (/row-level security|policy|permission denied|42501/i.test(message)) {
    return "Permesso negato per l'indicizzazione Ricambi AI.";
  }
  if (/duplicate key|unique constraint/i.test(message)) {
    return "Indicizzazione già presente per questo documento.";
  }
  if (/not-null|null value|23502/i.test(message)) {
    return "Errore salvataggio stato indicizzazione. Riprova o contatta l'assistenza.";
  }
  if (/check constraint|23514/i.test(message)) {
    return "Stato indicizzazione non valido. Riprova l'indicizzazione.";
  }
  if (process.env.NODE_ENV !== "production") {
    return `Impossibile avviare l'indicizzazione: ${message}`;
  }
  return "Impossibile avviare l'indicizzazione. Riprova tra poco.";
}

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
    .select(
      "status, understanding_status, index_quality, document_capabilities, updated_at, created_at, attempt_count, error_code, error_message",
    )
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

export async function POST(request: Request, context: RouteContext) {
  const allowed = await verifyServerPageWrite("documenti");
  if (!allowed) return NextResponse.json({ error: "Permesso negato su Documenti." }, { status: 403 });

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { force?: boolean };
  const sb = await createSupabaseServerUserClient();

  const { data: doc } = await sb.from("documenti").select("meta, url_file").eq("id", id).maybeSingle();
  if (!doc?.url_file) return NextResponse.json({ error: "Documento non trovato o file non collegato." }, { status: 404 });

  const meta = (doc.meta as Record<string, unknown>) ?? {};
  const spare = readDocumentSparePartsMeta(meta);
  if (!spare.aiSparePartsEnabled) {
    return NextResponse.json({ error: "Ricambi AI non abilitato per questo documento." }, { status: 400 });
  }

  const admin = createSparePartsAdminClient();
  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Worker indicizzazione non configurato (SUPABASE_SERVICE_ROLE_KEY). Aggiungi la chiave in .env.local e riavvia il server.",
      },
      { status: 503 },
    );
  }

  try {
    const hashResult = await resolveDocumentContentHashForIndexing(admin, id, {
      meta,
      url_file: doc.url_file,
    });
    if (!hashResult.ok) {
      return NextResponse.json({ error: hashResult.error }, { status: 400 });
    }

    const result = await enqueueDocumentAiIndex(admin, {
      documentoId: id,
      contentHash: hashResult.contentHash,
      forceReindex: body.force === true,
    });

    waitUntil(
      processDocumentAiIndexForDocumento(admin, id, result.id).catch(() => undefined),
    );

    return NextResponse.json({
      ok: true,
      indexId: result.id,
      requeued: result.requeued === true,
      contentHashPersisted: hashResult.persisted,
      processing: true,
    });
  } catch (e) {
    const raw = e instanceof Error ? e.message : "Indicizzazione non riuscita";
    return NextResponse.json({ error: mapEnqueueError(raw) }, { status: 500 });
  }
}
