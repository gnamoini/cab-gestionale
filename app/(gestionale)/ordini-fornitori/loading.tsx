import { OrdiniFornitoriPageStructure } from "@/components/ordini-fornitori/ordini-fornitori-page-structure";
import { resolveListSurfaceForPage } from "@/lib/ui/resolve-list-surface.server";

/** ponytail: PageLayout in page.tsx LEVEL 2 — qui solo body skeleton. */
export default async function OrdiniFornitoriLoading() {
  const listSurface = await resolveListSurfaceForPage();
  return <OrdiniFornitoriPageStructure mode="skeleton" listSurface={listSurface} />;
}
