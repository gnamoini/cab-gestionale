import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { deliverPdfArtifact } from "@/lib/pdf-artifacts/pdf-artifact-generate.server";
import type { PdfArtifactType } from "@/lib/pdf-artifacts/pdf-artifact-registry";
import type { CommunicationAttachmentRef } from "@/lib/communications/domain/communication-types";

const ATTACHMENT_TYPE_MAP: Record<string, PdfArtifactType> = {
  preventivo: "preventivo",
  "ordine-fornitore": "ordine-fornitore",
  fattura: "fattura",
  "scheda-ingresso": "scheda-ingresso",
  "scheda-lavorazioni": "scheda-lavorazioni",
  "scheda-ricambi": "scheda-ricambi",
};

export type BuiltAttachment = CommunicationAttachmentRef & {
  content: Uint8Array;
};

export async function buildAttachmentsForTypes(
  attachmentTypes: string[],
  entityType: string,
  entityId: string,
  lavorazioneId?: string | null,
): Promise<BuiltAttachment[]> {
  const out: BuiltAttachment[] = [];

  for (const rawType of attachmentTypes) {
    const pdfType = ATTACHMENT_TYPE_MAP[rawType];
    if (!pdfType) continue;

    try {
      const query: { id?: string; lavorazioneId?: string } = { id: entityId };
      if (pdfType.startsWith("scheda-") && lavorazioneId) {
        query.lavorazioneId = lavorazioneId;
      }

      const result = await deliverPdfArtifact(pdfType, { ...query, skipRbac: true });
      if (!result.success || !result.data) continue;

      out.push({
        type: rawType,
        fileName: result.data.fileName,
        storagePath: undefined,
        content: result.data.bytes,
      });
    } catch {
      // ponytail: attachment best-effort — email senza allegato se PDF fallisce
    }
  }

  return out;
}

export function attachmentRefsWithoutContent(attachments: BuiltAttachment[]): CommunicationAttachmentRef[] {
  return attachments.map((a) => ({
    type: a.type,
    fileName: a.fileName,
    storagePath: a.storagePath,
  }));
}
