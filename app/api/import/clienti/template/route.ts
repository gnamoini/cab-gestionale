import { legacyImportTemplateRoute } from "@/lib/data-import/core/import-legacy-route.server";

export const runtime = "nodejs";

/** @deprecated Thin alias → generic import router. */
export async function GET() {
  return legacyImportTemplateRoute("clienti");
}
