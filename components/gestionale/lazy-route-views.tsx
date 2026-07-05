"use client";

import dynamic from "next/dynamic";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { ClientLavorazioniPageSkeleton } from "@/components/lavorazioni-clienti/client-lavorazioni-loading-skeleton";

export const DashboardViewLazy = dynamic(
  () => import("@/components/dashboard/dashboard-view").then((m) => m.DashboardView),
  { loading: () => <LoadingSuspenseFallback variant="dashboard" /> },
);

export const LavorazioniViewLazy = dynamic(
  () => import("@/components/gestionale/lavorazioni/lavorazioni-view").then((m) => m.LavorazioniView),
  { loading: () => <LoadingSuspenseFallback variant="lavorazioni" /> },
);

export const MagazzinoViewLazy = dynamic(
  () => import("@/components/gestionale/magazzino/magazzino-view").then((m) => m.MagazzinoView),
  { loading: () => <LoadingSuspenseFallback variant="magazzino" /> },
);

export const DocumentiViewLazy = dynamic(
  () => import("@/components/gestionale/documenti/documenti-view").then((m) => m.DocumentiView),
  { loading: () => <LoadingSuspenseFallback variant="documenti" /> },
);

export const ReportViewLazy = dynamic(
  () => import("@/components/gestionale/report/report-view").then((m) => m.ReportView),
  { loading: () => <LoadingSuspenseFallback variant="report" /> },
);

export const PreventiviViewLazy = dynamic(
  () => import("@/components/preventivi/preventivi-view").then((m) => m.PreventiviView),
  { loading: () => <LoadingSuspenseFallback variant="preventivi" /> },
);

export const FatturazioneViewLazy = dynamic(
  () => import("@/components/fatturazione/fatturazione-view").then((m) => m.FatturazioneView),
  { loading: () => <LoadingSuspenseFallback variant="fatturazione" /> },
);

export const MezziViewLazy = dynamic(
  () => import("@/components/gestionale/mezzi/mezzi-view").then((m) => m.MezziView),
  { loading: () => <LoadingSuspenseFallback variant="mezzi" /> },
);

export const DipendentiViewLazy = dynamic(
  () => import("@/components/gestionale/dipendenti/dipendenti-view").then((m) => m.DipendentiView),
  { loading: () => <LoadingSuspenseFallback variant="dipendenti" /> },
);

export const SistemaImpostazioniPageViewLazy = dynamic(
  () =>
    import("@/components/configurazione/sistema-impostazioni-page").then((m) => m.SistemaImpostazioniPageView),
  { loading: () => <LoadingSuspenseFallback variant="impostazioni" /> },
);

export const ClientLavorazioniViewLazy = dynamic(
  () =>
    import("@/components/lavorazioni-clienti/client-lavorazioni-view").then((m) => m.ClientLavorazioniView),
  { loading: () => <ClientLavorazioniPageSkeleton /> },
);

export const SecurityDashboardViewLazy = dynamic(
  () => import("@/components/dashboard/security-dashboard-view").then((m) => m.SecurityDashboardView),
  { loading: () => <LoadingSuspenseFallback variant="sicurezza" /> },
);

export const ProductionReadinessViewLazy = dynamic(
  () =>
    import("@/components/dashboard/security/production-readiness-view").then(
      (m) => m.ProductionReadinessView,
    ),
  { loading: () => <LoadingSuspenseFallback variant="production-readiness" /> },
);

export const AgendaOfficinaViewLazy = dynamic(
  () =>
    import("@/components/workshop-schedule/agenda-officina-view").then((m) => m.AgendaOfficinaView),
  { loading: () => <LoadingSuspenseFallback variant="agenda" /> },
);
