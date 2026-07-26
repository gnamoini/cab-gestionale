import { FatturazionePageStructure } from "@/components/fatturazione/fatturazione-page-structure";
import { resolveListSurfaceForPage } from "@/lib/ui/resolve-list-surface.server";

/** ponytail: PageLayout in page.tsx LEVEL 2 — qui solo body skeleton. */
export default async function FatturazioneLoading() {
  const listSurface = await resolveListSurfaceForPage();
  return <FatturazionePageStructure mode="skeleton" listSurface={listSurface} />;
}
