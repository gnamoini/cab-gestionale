import { handleImportFileUploadPolicy } from "@/lib/import-files/import-file-route-auth.server";

export const runtime = "nodejs";

type UploadPolicyBody = {
  kind?: string;
  fileName?: string;
  expectedMime?: string;
  expectedSizeBytes?: number;
  importSessionId?: string;
};

export async function POST(request: Request) {
  let body: UploadPolicyBody;
  try {
    body = (await request.json()) as UploadPolicyBody;
  } catch {
    return Response.json({ error: "Body JSON non valido" }, { status: 400 });
  }
  return handleImportFileUploadPolicy(body);
}
