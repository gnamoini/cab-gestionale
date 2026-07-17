import type { Metadata } from "next";
import { OfflinePageViewLazy } from "@/components/public-surfaces/public-surface-loaders";

export const metadata: Metadata = {
  title: "Offline | CAB",
  description: "Connessione assente — CAB Gestionale Officina",
};

export default function OfflinePage() {
  return <OfflinePageViewLazy />;
}
