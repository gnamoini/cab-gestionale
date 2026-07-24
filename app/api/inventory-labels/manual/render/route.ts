import { NextResponse } from "next/server";
import { requireInventoryLabelsRead } from "@/lib/inventory-labels/api-auth.server";
import { labelPayloadFromManualInput } from "@/lib/inventory-labels/domain/manual-payload.server";
import { getLabelTemplate } from "@/lib/inventory-labels/domain/templates";
import { renderLabelPng } from "@/lib/inventory-labels/render/png";
import { renderSingleLabelPdf } from "@/lib/inventory-labels/render/pdf";
import { renderLabelSvg } from "@/lib/inventory-labels/render/svg";
import { sanitizeFilenamePart } from "@/lib/inventory-labels/render/pdf-pipeline";
import { manualLabelRenderSchema } from "@/lib/inventory-labels/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

const CONTENT_TYPES = {
  png: "image/png",
  svg: "image/svg+xml",
  pdf: "application/pdf",
} as const;

function manualLabelFileName(codice: string, format: keyof typeof CONTENT_TYPES): string {
  const safe = sanitizeFilenamePart(codice || "manuale");
  return `etichetta-${safe}.${format}`;
}

export async function POST(request: Request) {
  const auth = await requireInventoryLabelsRead();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }

  const parsed = manualLabelRenderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  }

  const { marca, descrizione, codice, preset, format, quantity } = parsed.data;
  const template = getLabelTemplate(preset, "manual");
  if (!template) {
    return NextResponse.json({ error: "Formato etichetta non valido" }, { status: 400 });
  }

  const payload = labelPayloadFromManualInput({ marca, descrizione, codice });
  const qrUrl = "";

  try {
    let buffer: Buffer;
    if (format === "png") {
      buffer = await renderLabelPng(template, payload, qrUrl, { labelKind: "manual" });
    } else if (format === "svg") {
      const svg = await renderLabelSvg(template, payload, qrUrl, { labelKind: "manual" });
      buffer = Buffer.from(svg);
    } else {
      const pdf = await renderSingleLabelPdf(template, payload, qrUrl, { labelKind: "manual" }, quantity);
      buffer = Buffer.from(pdf);
    }

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": CONTENT_TYPES[format],
        "Content-Disposition": `inline; filename="${manualLabelFileName(codice, format)}"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Rendering non riuscito" },
      { status: 500 },
    );
  }
}
