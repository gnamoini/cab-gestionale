import "server-only";

import { createHash } from "node:crypto";
import { jsPDF } from "jspdf";
import {
  drawSchedaBlankPdf,
  schedaBlankPdfFileName,
  type SchedaBlankTipo,
} from "@/lib/pdf/schede-blank-layout";
import { SCHEDA_BLANK_RENDERER_HASH } from "@/lib/document-capture/scheda-blank-template-meta";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export function generateSchedaBlankPdfBytes(tipo: SchedaBlankTipo): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const now = new Date();
  drawSchedaBlankPdf(doc, tipo, now);
  const buf = doc.output("arraybuffer");
  return new Uint8Array(buf);
}

export function computeSchedaBlankArtifactHash(tipo: SchedaBlankTipo, bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function persistSchedaPdfGeneration(input: {
  tipo: SchedaBlankTipo;
  bytes: Uint8Array;
}): Promise<void> {
  const sb = await createSupabaseServerUserClient();
  const { data: auth } = await sb.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return;

  const { data: template } = await sb
    .from("scheda_pdf_templates")
    .select("id, renderer_hash")
    .eq("tipo", input.tipo)
    .eq("version", "1")
    .maybeSingle();

  if (!template?.id) return;

  const expectedRendererHash = SCHEDA_BLANK_RENDERER_HASH[input.tipo];
  if (template.renderer_hash !== expectedRendererHash) {
    console.warn("[scheda-blank-pdf] renderer_hash mismatch template vs runtime", {
      tipo: input.tipo,
      template: template.renderer_hash,
      expected: expectedRendererHash,
    });
  }

  const artifactHash = computeSchedaBlankArtifactHash(input.tipo, input.bytes);
  await sb.from("scheda_pdf_generations").insert({
    template_id: template.id,
    artifact_hash: artifactHash,
    renderer_hash: expectedRendererHash,
    generated_by: userId,
    params_json: {
      tipo: input.tipo,
      templateVersion: "1",
      layoutKey: "schede-blank-layout",
    },
  });
}

export function schedaBlankArtifactFileName(tipo: SchedaBlankTipo): string {
  return schedaBlankPdfFileName(tipo);
}

export function isSchedaBlankArtifactType(value: string): value is SchedaBlankTipo {
  return value === "scheda-ingresso-blank" || value === "scheda-lavorazioni-blank" || value === "scheda-ricambi-blank";
}

export function schedaBlankTipoFromArtifact(type: string): SchedaBlankTipo | null {
  if (type === "scheda-ingresso-blank") return "ingresso";
  if (type === "scheda-lavorazioni-blank") return "lavorazioni";
  if (type === "scheda-ricambi-blank") return "ricambi";
  return null;
}
