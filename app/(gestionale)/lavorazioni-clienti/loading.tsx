import { ClientiPageStructure } from "@/components/lavorazioni-clienti/client-lavorazioni-page-structure";
import { resolveListSurfaceForPage } from "@/lib/ui/resolve-list-surface.server";

/** ponytail: PageLayout in page.tsx LEVEL 2 — qui solo body skeleton. */
export default async function LavorazioniClientiLoading() {
  const listSurface = await resolveListSurfaceForPage();
  return <ClientiPageStructure mode="skeleton" listSurface={listSurface} />;
}
