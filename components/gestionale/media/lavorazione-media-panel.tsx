"use client";

import { RecordImageManager, type RecordImageLogEvent } from "@/components/gestionale/media/record-image-manager";
import { LavorazioneOfficialDocumentsPanel } from "@/components/gestionale/media/lavorazione-official-documents-panel";
import { dsHubModalSection, dsHubModalSectionTitle } from "@/lib/ui/design-system";

export function LavorazioneMediaPanel({
  lavorazioneId,
  canEdit = true,
  onImageEvent,
  onDocumentEvent,
  variant = "legacy",
}: {
  lavorazioneId: string;
  canEdit?: boolean;
  onImageEvent?: (event: RecordImageLogEvent) => void;
  onDocumentEvent?: () => void;
  /** `hub`: dentro GestionaleInfoCard (tab Documenti modal lavorazione). */
  variant?: "legacy" | "hub";
}) {
  void onDocumentEvent;

  if (variant === "hub") {
    return (
      <>
        <RecordImageManager
          scope="lavorazioni"
          recordId={lavorazioneId}
          canEdit={canEdit}
          embedded
          hubCardLayout
          onImageEvent={onImageEvent}
        />
        <LavorazioneOfficialDocumentsPanel lavorazioneId={lavorazioneId} hubCardLayout />
      </>
    );
  }

  return (
    <section className={dsHubModalSection} aria-label="Documenti lavorazione">
      <h3 className={dsHubModalSectionTitle}>Documenti</h3>
      <div className="mt-2 space-y-2">
        <RecordImageManager
          scope="lavorazioni"
          recordId={lavorazioneId}
          title="Foto"
          canEdit={canEdit}
          embedded
          onImageEvent={onImageEvent}
        />
        <LavorazioneOfficialDocumentsPanel lavorazioneId={lavorazioneId} />
      </div>
    </section>
  );
}
