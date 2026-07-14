import type { Metadata } from "next";
import { OfflinePageView } from "@/components/pwa/offline-page-view";

export const metadata: Metadata = {
  title: "Offline | CAB",
  description: "Connessione assente — CAB Gestionale Officina",
};

export default function OfflinePage() {
  return <OfflinePageView />;
}
