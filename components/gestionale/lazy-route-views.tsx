"use client";

import dynamic from "next/dynamic";
import { LoadingSuspenseFallback } from "@/components/design-system";

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
