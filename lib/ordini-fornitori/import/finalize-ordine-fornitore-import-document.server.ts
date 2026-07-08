import "server-only";

import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export async function finalizeOrdineFornitoreImportDocument(input: {
  documentoId: string;
  action: "link" | "unlink";
  ordineId?: string;
  contentHash?: string;
  semanticKey?: string;
  userId: string;
}): Promise<void> {
  const sb = await createSupabaseServerUserClient();
  const { data: doc } = await sb.from("documenti").select("meta").eq("id", input.documentoId).maybeSingle();
  const meta = (doc?.meta && typeof doc.meta === "object" ? doc.meta : {}) as Record<string, unknown>;

  if (input.action === "unlink") {
    await sb
      .from("documenti")
      .update({
        meta: {
          ...meta,
          importStatus: "unlinked",
          importUnlinkedAt: new Date().toISOString(),
        },
      })
      .eq("id", input.documentoId);
    return;
  }

  if (!input.ordineId) throw new Error("ordineId obbligatorio per link.");

  const contentHash = input.contentHash?.trim();
  if (contentHash) {
    const { data: existing } = await sb
      .from("ordini_fornitori_import_log")
      .select("id")
      .eq("content_hash", contentHash)
      .maybeSingle();
    if (existing?.id) {
      await sb
        .from("ordini_fornitori_import_log")
        .update({
          ordine_id: input.ordineId,
          documento_id: input.documentoId,
          semantic_key: input.semanticKey ?? null,
          created_by: input.userId,
        })
        .eq("id", existing.id);
    } else {
      await sb.from("ordini_fornitori_import_log").insert({
        ordine_id: input.ordineId,
        documento_id: input.documentoId,
        content_hash: contentHash,
        semantic_key: input.semanticKey ?? null,
        created_by: input.userId,
      });
    }
  }

  const { data: existingLink } = await sb
    .from("ordini_fornitori_links")
    .select("id")
    .eq("ordine_id", input.ordineId)
    .eq("source_type", "documento")
    .eq("source_id", input.documentoId)
    .maybeSingle();

  if (!existingLink?.id) {
    await sb.from("ordini_fornitori_links").insert({
      ordine_id: input.ordineId,
      source_type: "documento",
      source_id: input.documentoId,
      meta: { ruolo: "preventivo_sorgente", contentHash: contentHash ?? null },
    });
  }

  await sb
    .from("documenti")
    .update({
      meta: {
        ...meta,
        importStatus: "linked",
        importOrdineId: input.ordineId,
        linkedAt: new Date().toISOString(),
      },
    })
    .eq("id", input.documentoId);
}
