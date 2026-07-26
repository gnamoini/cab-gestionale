import { SicurezzaPageStructure } from "@/components/dashboard/sicurezza-page-structure";
import { resolveListSurfaceForPage } from "@/lib/ui/resolve-list-surface.server";

/** ponytail: PageLayout in page.tsx LEVEL 2 — qui solo body skeleton. */
export default async function SicurezzaLoading() {
  const listSurface = await resolveListSurfaceForPage();
  return <SicurezzaPageStructure mode="skeleton" listSurface={listSurface} />;
}
