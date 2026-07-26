import { cookies, headers } from "next/headers";
import {
  GESTIONALE_LIST_SURFACE_COOKIE,
  parseViewportWidthClientHint,
  resolveListSurfaceFromRequest,
  type ListSurface,
} from "@/lib/ui/resolve-list-surface";

/** Risoluzione listSurface per page.tsx / loading.tsx — stesso input, stesso output. */
export async function resolveListSurfaceForPage(): Promise<ListSurface> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  return resolveListSurfaceFromRequest({
    cookieValue: cookieStore.get(GESTIONALE_LIST_SURFACE_COOKIE)?.value ?? null,
    viewportWidthHint: parseViewportWidthClientHint(
      headerStore.get("sec-ch-viewport-width") ?? headerStore.get("Sec-CH-Viewport-Width"),
    ),
    userAgent: headerStore.get("user-agent"),
  });
}
