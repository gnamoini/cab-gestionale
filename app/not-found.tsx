import type { Metadata } from "next";
import { NotFoundView } from "@/components/gestionale/not-found-view";

export const metadata: Metadata = {
  title: "Pagina non trovata | CAB Gestionale Officina",
  description: "La pagina richiesta non esiste nel gestionale CAB.",
};

export default function NotFound() {
  return <NotFoundView variant="standalone" />;
}
