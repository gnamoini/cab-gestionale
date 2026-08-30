"use client";

import { Tooltip } from "@/components/ui";
import type { DocumentoGestionale } from "@/lib/types/gestionale";
import type { DocumentAiIndexRow } from "@/lib/documents/document-ai-list-status";
import {
  deriveDocumentAiListStatus,
  documentAiListStatusBadgeClass,
  documentAiListStatusGlyph,
  documentAiListStatusLabel,
  documentAiListStatusTooltip,
  documentoRicambiAiCandidate,
} from "@/lib/documents/document-ai-list-status";

const BADGE_BASE =
  "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1";

export function DocumentAiRowStatus({
  doc,
  index,
}: {
  doc: DocumentoGestionale;
  index?: DocumentAiIndexRow | null;
}) {
  const isCandidate = documentoRicambiAiCandidate(doc);
  const status = deriveDocumentAiListStatus({
    aiEnabled: doc.aiSparePartsEnabled === true,
    isCandidate,
    index,
  });

  if (status === "off") return null;

  const label = documentAiListStatusLabel(status);
  const tooltip = documentAiListStatusTooltip(status);
  const tone = documentAiListStatusBadgeClass(status);
  const glyph = documentAiListStatusGlyph(status);

  return (
    <Tooltip content={tooltip}>
      <span className={`${BADGE_BASE} ${tone}`}>
        <span aria-hidden>{glyph}</span>
        {label}
      </span>
    </Tooltip>
  );
}
