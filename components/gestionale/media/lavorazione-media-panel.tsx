"use client";

import { RecordImageManager, type RecordImageLogEvent } from "@/components/gestionale/media/record-image-manager";
import { LavorazioneDocumentsManager } from "@/components/gestionale/media/lavorazione-documents-manager";

export function LavorazioneMediaPanel({
  lavorazioneId,
  canEdit = true,
  onImageEvent,
  onDocumentEvent,
}: {
  lavorazioneId: string;
  canEdit?: boolean;
  onImageEvent?: (event: RecordImageLogEvent) => void;
  onDocumentEvent?: () => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-800 dark:text-zinc-100">Documenti</p>
      <div className="space-y-3">
        <RecordImageManager
          scope="lavorazioni"
          recordId={lavorazioneId}
          title="Foto"
          canEdit={canEdit}
          onImageEvent={onImageEvent}
        />
        <LavorazioneDocumentsManager
          lavorazioneId={lavorazioneId}
          canEdit={canEdit}
          onDocumentEvent={onDocumentEvent}
        />
      </div>
    </div>
  );
}
