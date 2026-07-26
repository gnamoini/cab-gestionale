import { LavorazioniPageStructure } from "@/components/gestionale/lavorazioni/lavorazioni-page-structure";
import { resolveListSurfaceForPage } from "@/lib/ui/resolve-list-surface.server";

/** ponytail: PageLayout in page.tsx LEVEL 2 — qui solo body skeleton. */
export default async function LavorazioniLoading() {
  const listSurface = await resolveListSurfaceForPage();
  return <LavorazioniPageStructure mode="skeleton" listSurface={listSurface} />;
}
