"use client";

import { ClientLavorazioneDocumentsPanel } from "@/components/lavorazioni-clienti/client-lavorazione-documents";
import { ClientLavorazionePhotoGallery } from "@/components/lavorazioni-clienti/client-lavorazione-photos";
import { ShellCard } from "@/components/gestionale/shell-card";

export function ClientLavorazioneMediaPanel({ lavorazioneId }: { lavorazioneId: string }) {
  return (
    <ShellCard>
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-zinc-500">Documenti</p>
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Foto</p>
          <ClientLavorazionePhotoGallery lavorazioneId={lavorazioneId} max={5} />
        </div>
        <ClientLavorazioneDocumentsPanel lavorazioneId={lavorazioneId} embedded />
      </div>
    </ShellCard>
  );
}
