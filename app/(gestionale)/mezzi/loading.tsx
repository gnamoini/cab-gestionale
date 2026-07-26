import { MezziPageStructure } from "@/components/gestionale/mezzi/mezzi-page-structure";
import { resolveListSurfaceForPage } from "@/lib/ui/resolve-list-surface.server";

/** ponytail: PageLayout in page.tsx LEVEL 2 — qui solo body skeleton. */
export default async function MezziLoading() {
  const listSurface = await resolveListSurfaceForPage();
  return <MezziPageStructure mode="skeleton" listSurface={listSurface} />;
}
