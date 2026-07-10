import { canReadPage } from "@/src/lib/rbac/resolve-page-access";
import { isPdfPreviewPostRateLimited } from "@/lib/preventivi/pdf-preview-rate-limit";
import { PDF_MAGIC, PDF_PREVIEW_MAX_BYTES } from "@/lib/pdf/pdf-preview-config";
import { verifyServerModuleCan } from "@/src/lib/auth/server-permission-guards";
import { resolveServerEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions.server";
import { NextResponse } from "next/server";

function contentDispositionInline(fileName: string): string {
  const trimmed = fileName.trim().replace(/\s+/g, "_") || "documento.pdf";
  const withExt = trimmed.toLowerCase().endsWith(".pdf") ? trimmed : `${trimmed}.pdf`;
  const asciiFallback = withExt.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_") || "documento.pdf";
  return `inline; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(withExt)}`;
}

async function readPdfBytes(formData: FormData): Promise<Uint8Array | null> {
  const pdf = formData.get("pdf");
  if (pdf instanceof Blob && pdf.size > 0) {
    return new Uint8Array(await pdf.arrayBuffer());
  }

  const b64 = formData.get("pdfBase64");
  if (typeof b64 === "string" && b64.trim()) {
    try {
      return Uint8Array.from(Buffer.from(b64, "base64"));
    } catch {
      return null;
    }
  }

  return null;
}

function isPdfMagicBytes(bytes: Uint8Array): boolean {
  if (bytes.length < PDF_MAGIC.length) return false;
  for (let i = 0; i < PDF_MAGIC.length; i += 1) {
    if (bytes[i] !== PDF_MAGIC[i]) return false;
  }
  return true;
}

async function canUsePdfPreview(): Promise<boolean> {
  if (await verifyServerModuleCan("preventivi", "read")) return true;
  if (await verifyServerModuleCan("lavorazioni", "read")) return true;
  if (await verifyServerModuleCan("dipendenti", "read")) return true;

  const snap = await resolveServerEffectivePermissions();
  if (!snap?.resolved) return false;
  // can_read_operational: almeno una pagina operativa leggibile (fail-closed altrimenti).
  return (
    canReadPage(snap.resolved, "lavorazioni") ||
    canReadPage(snap.resolved, "dashboard") ||
    canReadPage(snap.resolved, "dipendenti")
  );
}

export type PdfPreviewHandlerOptions = {
  /** Header Deprecation sulla risposta di successo (route legacy). */
  deprecated?: boolean;
  successorPath?: string;
};

export async function handlePdfPreviewPost(
  request: Request,
  options?: PdfPreviewHandlerOptions,
): Promise<Response> {
  if (await isPdfPreviewPostRateLimited(request)) {
    return NextResponse.json({ error: "Troppe richieste. Riprova tra poco." }, { status: 429 });
  }

  if (!(await canUsePdfPreview())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  const fileName = String(formData.get("fileName") ?? "").trim().replace(/\s+/g, "_") || "documento.pdf";
  const bytes = await readPdfBytes(formData);
  if (!bytes || bytes.length === 0) {
    return NextResponse.json({ error: "PDF mancante" }, { status: 400 });
  }
  if (bytes.length > PDF_PREVIEW_MAX_BYTES) {
    return NextResponse.json({ error: "PDF troppo grande" }, { status: 413 });
  }
  if (!isPdfMagicBytes(bytes)) {
    return NextResponse.json({ error: "Il file non è un PDF valido" }, { status: 400 });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/pdf",
    "Content-Disposition": contentDispositionInline(fileName),
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  };

  if (options?.deprecated) {
    headers.Deprecation = "true";
    if (options.successorPath) {
      headers.Link = `<${options.successorPath}>; rel="successor-version"`;
    }
  }

  return new Response(Buffer.from(bytes), { status: 200, headers });
}
