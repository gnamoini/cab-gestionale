import { NextResponse } from "next/server";
import { generateElectronicInvoiceXml } from "@/lib/fatturazione/einvoice/generate-electronic-invoice-xml.server";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await generateElectronicInvoiceXml(id, { persist: true });
  if (!result.ok) {
    return NextResponse.json({ error: result.message, code: result.code, issues: result.issues }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    schemaVersion: result.result.schemaVersion,
    transmissionFormat: result.result.transmissionFormat,
    documentType: result.result.documentType,
    documentNumber: result.result.documentNumber,
    documentDate: result.result.documentDate,
    sha256: result.result.sha256,
    filename: result.result.filename,
    xmlDocumentId: result.xmlDocumentId,
  });
}
