import { DipendentiPageStructure } from "@/components/gestionale/dipendenti/dipendenti-page-structure";
import { resolveListSurfaceForPage } from "@/lib/ui/resolve-list-surface.server";

/** ponytail: PageLayout in page.tsx LEVEL 2 — qui solo body skeleton. */
export default async function DipendentiLoading() {
  const listSurface = await resolveListSurfaceForPage();
  return <DipendentiPageStructure mode="skeleton" listSurface={listSurface} />;
}
