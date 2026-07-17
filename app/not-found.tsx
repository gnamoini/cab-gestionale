import type { Metadata } from "next";
import { NotFoundViewLazy } from "@/components/public-surfaces/public-surface-loaders";

export const metadata: Metadata = {
  title: "Pagina non trovata | CAB Gestionale Officina",
  description: "La pagina richiesta non esiste nel gestionale CAB.",
};

export default function NotFound() {
  return <NotFoundViewLazy variant="standalone" />;
}
