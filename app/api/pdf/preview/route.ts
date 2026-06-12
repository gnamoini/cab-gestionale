import { handlePdfPreviewPost } from "@/lib/pdf/pdf-preview-handler";

export async function POST(request: Request) {
  return handlePdfPreviewPost(request, {
    deprecated: true,
    successorPath: "/api/pdf/artifacts",
  });
}
