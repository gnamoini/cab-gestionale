"use client";

import { ReportTopClienti, ReportTopMezzi } from "@/components/report/report-tops";
import type { TopClienteReportRow, TopMezzoReportRow } from "@/lib/report/report-classifiche";
import { dsGestionaleInfoCardTitle } from "@/lib/ui/design-system";

const subsectionTitle = dsGestionaleInfoCardTitle;
const subsectionMeta = "text-[11px] leading-snug text-[color:var(--cab-text-muted)]";

export function ReportClassificheOperativePanel({
  mezzi,
  clienti,
  showCompare,
}: {
  mezzi: TopMezzoReportRow[];
  clienti: TopClienteReportRow[];
  showCompare: boolean;
}) {
  return (
    <div className="flex flex-col gap-10 2xl:grid 2xl:grid-cols-[minmax(0,1.22fr)_minmax(280px,0.78fr)] 2xl:items-start 2xl:gap-8">
      <section className="min-w-0">
        <header className="mb-3 flex items-baseline justify-between gap-x-3 gap-y-1 flex-nowrap sm:flex-wrap">
          <h3 className={subsectionTitle}>Mezzi più lavorati</h3>
          <p className={subsectionMeta}>
            {mezzi.length === 0
              ? "Nessuna chiusura nel periodo"
              : `${mezzi.length} ${mezzi.length === 1 ? "mezzo" : "mezzi"} · per numero di lavorazioni chiuse`}
          </p>
        </header>
        <ReportTopMezzi rows={mezzi} showCompare={showCompare} />
      </section>
      <section className="min-w-0">
        <header className="mb-3 flex items-baseline justify-between gap-x-3 gap-y-1 flex-nowrap sm:flex-wrap">
          <h3 className={subsectionTitle}>Clienti più attivi</h3>
          <p className={subsectionMeta}>
            {clienti.length === 0
              ? "Nessun cliente nel periodo"
              : `${clienti.length} ${clienti.length === 1 ? "cliente" : "clienti"} · per interventi chiusi`}
          </p>
        </header>
        <ReportTopClienti rows={clienti} showCompare={showCompare} />
      </section>
    </div>
  );
}
