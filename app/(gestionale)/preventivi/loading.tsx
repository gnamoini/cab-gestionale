import { PreventiviPageStructure } from "@/components/preventivi/preventivi-page-structure";
import { resolveListSurfaceForPage } from "@/lib/ui/resolve-list-surface.server";

/** ponytail: PageLayout in page.tsx LEVEL 2 — qui solo body skeleton. */
export default async function PreventiviLoading() {
  const listSurface = await resolveListSurfaceForPage();
  return <PreventiviPageStructure mode="skeleton" listSurface={listSurface} />;
}
