import { legacyImportParseRoute } from "@/lib/data-import/core/import-legacy-route.server";

export const runtime = "nodejs";

/** @deprecated Prefer `/api/import/magazzino/parse` via generic `[entity]` route — thin alias. */
export async function POST(request: Request) {
  return legacyImportParseRoute("magazzino", request);
}
