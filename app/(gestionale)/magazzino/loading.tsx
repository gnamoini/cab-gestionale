import { MagazzinoPageStructure } from "@/components/gestionale/magazzino/magazzino-page-structure";
import { resolveListSurfaceForPage } from "@/lib/ui/resolve-list-surface.server";

/** ponytail: PageLayout in page.tsx LEVEL 2 — qui solo body skeleton. */
export default async function MagazzinoLoading() {
  const listSurface = await resolveListSurfaceForPage();
  return <MagazzinoPageStructure mode="skeleton" listSurface={listSurface} />;
}
