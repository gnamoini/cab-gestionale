"use client";

import dynamic from "next/dynamic";

/** ponytail: route (areas)/loading.tsx owns skeleton — no dynamic loading fallback. */
export const ReportAreaAiViewLazy = dynamic(() =>
  import("@/components/report/areas/report-area-ai-view").then((m) => m.ReportAreaAiView),
);

export const ReportAreaClientiViewLazy = dynamic(() =>
  import("@/components/report/areas/report-area-clienti-view").then((m) => m.ReportAreaClientiView),
);

export const ReportAreaContestoViewLazy = dynamic(() =>
  import("@/components/report/areas/report-area-contesto-view").then((m) => m.ReportAreaContestoView),
);

export const ReportAreaDipendentiViewLazy = dynamic(() =>
  import("@/components/report/areas/report-area-dipendenti-view").then((m) => m.ReportAreaDipendentiView),
);

export const ReportAreaEconomiaViewLazy = dynamic(() =>
  import("@/components/report/areas/report-area-economia-view").then((m) => m.ReportAreaEconomiaView),
);

export const ReportAreaLavorazioniViewLazy = dynamic(() =>
  import("@/components/report/areas/report-area-lavorazioni-view").then((m) => m.ReportAreaLavorazioniView),
);

export const ReportAreaMagazzinoViewLazy = dynamic(() =>
  import("@/components/report/areas/report-area-magazzino-view").then((m) => m.ReportAreaMagazzinoView),
);

export const ReportAreaMezziViewLazy = dynamic(() =>
  import("@/components/report/areas/report-area-mezzi-view").then((m) => m.ReportAreaMezziView),
);

export const ReportAreaPanoramicaViewLazy = dynamic(() =>
  import("@/components/report/areas/report-area-panoramica-view").then((m) => m.ReportAreaPanoramicaView),
);

export const ReportAreaPreventiviViewLazy = dynamic(() =>
  import("@/components/report/areas/report-area-preventivi-view").then((m) => m.ReportAreaPreventiviView),
);

export const ReportAreaTrasversaliViewLazy = dynamic(() =>
  import("@/components/report/areas/report-area-trasversali-view").then((m) => m.ReportAreaTrasversaliView),
);
