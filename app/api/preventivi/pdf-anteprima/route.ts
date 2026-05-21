import { storePdfPreview, readPdfPreview } from "@/lib/preventivi/pdf-preview-cache";
import { verifyServerSectionRead } from "@/src/lib/auth/server-permission-guards";
import { NextResponse } from "next/server";

const MAX_PDF_BYTES = 15 * 1024 * 1024;

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

export async function GET(request: Request) {
  if (!(await verifyServerSectionRead("preventivi"))) {
    return new Response("Non autorizzato", { status: 403 });
  }

  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return new Response("Anteprima non valida", { status: 400 });
  }

  const hit = readPdfPreview(token);
  if (!hit) {
    return new Response("Anteprima scaduta o non valida. Rigenera il PDF.", { status: 404 });
  }

  return new Response(Buffer.from(hit.bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDispositionInline(hit.fileName),
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  if (!(await verifyServerSectionRead("preventivi"))) {
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
  if (bytes.length > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "PDF troppo grande" }, { status: 413 });
  }

  const token = storePdfPreview(bytes, fileName);
  const previewUrl = `/api/preventivi/pdf-anteprima?token=${encodeURIComponent(token)}`;
  return NextResponse.json({ previewUrl });
}
