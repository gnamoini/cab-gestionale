import { handleImportFileAbandon } from "@/lib/import-files/import-file-route-handlers.server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleImportFileAbandon(id);
}
