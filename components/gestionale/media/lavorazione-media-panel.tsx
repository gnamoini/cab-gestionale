"use client";

import { RecordImageManager, type RecordImageLogEvent } from "@/components/gestionale/media/record-image-manager";
import { LavorazioneDocumentsManager } from "@/components/gestionale/media/lavorazione-documents-manager";
import { LavorazioneDdtPanel } from "@/components/ddt/lavorazione-ddt-panel";
import { LAVORAZIONE_DOCUMENT_SLOTS } from "@/lib/lavorazioni/lavorazione-documents";
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
        {LAVORAZIONE_DOCUMENT_SLOTS.map((slot) => (
          <LavorazioneDocumentsManager
            key={slot.tipo}
            lavorazioneId={lavorazioneId}
            canEdit={canEdit}
            hubCardLayout
            onlyTipo={slot.tipo}
            onDocumentEvent={onDocumentEvent}
          />
        ))}
        <LavorazioneDdtPanel lavorazioneId={lavorazioneId} />
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
        <LavorazioneDocumentsManager
          lavorazioneId={lavorazioneId}
          canEdit={canEdit}
          onDocumentEvent={onDocumentEvent}
        />
        <LavorazioneDdtPanel lavorazioneId={lavorazioneId} />
      </div>
    </section>
  );
}
