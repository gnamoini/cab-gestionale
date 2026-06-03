import { PDF_PREVIEW_API_PATH } from "@/lib/pdf/pdf-preview-config";
import { handlePdfPreviewPost } from "@/lib/pdf/pdf-preview-handler";
import { NextResponse } from "next/server";

/** @deprecated Usare POST {@link PDF_PREVIEW_API_PATH} con blob PDF inline. */
export async function GET() {
  return NextResponse.json(
    { error: `Endpoint deprecato. Usa POST ${PDF_PREVIEW_API_PATH} con il blob PDF.` },
    {
      status: 410,
      headers: {
        Deprecation: "true",
        Link: `<${PDF_PREVIEW_API_PATH}>; rel="successor-version"`,
        "Cache-Control": "no-store",
      },
    },
  );
}

/** @deprecated Proxy verso {@link PDF_PREVIEW_API_PATH}. */
export async function POST(request: Request) {
  return handlePdfPreviewPost(request, {
    deprecated: true,
    successorPath: PDF_PREVIEW_API_PATH,
  });
}
