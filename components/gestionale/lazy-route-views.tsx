"use client";

import dynamic from "next/dynamic";

/** ponytail: route loading.tsx owns full-page skeleton — no dynamic loading fallback. */
export const DashboardViewLazy = dynamic(() =>
  import("@/components/dashboard/dashboard-view").then((m) => m.DashboardView),
);

export const LavorazioniViewLazy = dynamic(() =>
  import("@/components/gestionale/lavorazioni/lavorazioni-view").then((m) => m.LavorazioniView),
);

export const DocumentiViewLazy = dynamic(() =>
  import("@/components/gestionale/documenti/documenti-view").then((m) => m.DocumentiView),
);

export const ReportViewLazy = dynamic(() =>
  import("@/components/gestionale/report/report-view").then((m) => m.ReportView),
);

export const OrdiniFornitoriPageViewLazy = dynamic(() =>
  import("@/components/ordini-fornitori/ordini-fornitori-page-view").then((m) => m.OrdiniFornitoriPageView),
);

export const PreventiviViewLazy = dynamic(() =>
  import("@/components/preventivi/preventivi-view").then((m) => m.PreventiviView),
);

export const FatturazioneViewLazy = dynamic(() =>
  import("@/components/fatturazione/fatturazione-view").then((m) => m.FatturazioneView),
);

export const MezziViewLazy = dynamic(() =>
  import("@/components/gestionale/mezzi/mezzi-view").then((m) => m.MezziView),
);

export const DipendentiViewLazy = dynamic(() =>
  import("@/components/gestionale/dipendenti/dipendenti-view").then((m) => m.DipendentiView),
);

export const SistemaImpostazioniPageViewLazy = dynamic(() =>
  import("@/components/configurazione/sistema-impostazioni-page").then((m) => m.SistemaImpostazioniPageView),
);

export const ClientLavorazioniViewLazy = dynamic(() =>
  import("@/components/lavorazioni-clienti/client-lavorazioni-view").then((m) => m.ClientLavorazioniView),
);

export const ClientLavorazioneDetailViewLazy = dynamic(() =>
  import("@/components/lavorazioni-clienti/client-lavorazione-detail-view").then(
    (m) => m.ClientLavorazioneDetailView,
  ),
);

export const SecurityDashboardViewLazy = dynamic(() =>
  import("@/components/dashboard/security-dashboard-view").then((m) => m.SecurityDashboardView),
);

export const ProductionReadinessViewLazy = dynamic(() =>
  import("@/components/dashboard/security/production-readiness-view").then((m) => m.ProductionReadinessView),
);

export const AgendaOfficinaViewLazy = dynamic(() =>
  import("@/components/workshop-schedule/agenda-officina-view").then((m) => m.AgendaOfficinaView),
);
