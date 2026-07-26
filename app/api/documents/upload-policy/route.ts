import { buildRequestContextFromServer } from "@/lib/decision/request-context";
import { getRouteClassification, shouldBypassCache } from "@/lib/decision/request-decision-registry";
import { documentBlobExists } from "@/lib/documents/document-blob-storage.server";
import { classifyDocumentSemantic } from "@/lib/documents/document-semantic-classify";
import {
  parseContentHash,
  validateUploadPolicyBody,
  type UploadPolicyBody,
} from "@/lib/edge/validators/upload-policy-schema";
import {
  buildDocumentBlobStoragePath,
  buildDocumentoStoragePath,
} from "@/src/lib/storage/storage-paths";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";
import { verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: UploadPolicyBody;
  try {
    body = (await request.json()) as UploadPolicyBody;
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }

  const validation = validateUploadPolicyBody(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const ctx = buildRequestContextFromServer(request);
  void getRouteClassification(ctx);
  void shouldBypassCache(ctx);

  const { source, fileName, mimeType } = validation.normalized;

  if (source === "archive") {
    if (!(await verifyServerPageWrite("documenti"))) {
      return NextResponse.json({ error: "Permesso richiesto" }, { status: 403 });
    }
    const semanticClass = classifyDocumentSemantic({
      fileName,
      mimeType,
      categoria: body.categoria,
    });
    const contentHash = parseContentHash(body.contentHash);
    if (contentHash) {
      const path = buildDocumentBlobStoragePath(contentHash);
      const deduplicated = await documentBlobExists(path);
      return NextResponse.json({
        bucket: STORAGE_BUCKETS.documenti,
        path,
        contentHash,
        semanticClass,
        deduplicated,
      });
    }
    const path = buildDocumentoStoragePath(fileName);
    return NextResponse.json({
      bucket: STORAGE_BUCKETS.documenti,
      path,
      semanticClass,
      deduplicated: false,
    });
  }

  if (source === "lavorazione") {
    return NextResponse.json(
      { error: "Upload documenti lavorazione disabilitato. Usare preventivi/DDT ufficiali." },
      { status: 410 },
    );
  }

  return NextResponse.json({ error: "Sorgente upload non supportata" }, { status: 400 });
}
