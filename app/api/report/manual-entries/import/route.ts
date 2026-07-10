import "server-only";

import { NextResponse } from "next/server";
import {
  importReportManualEntriesSpreadsheetServer,
  REPORT_MANUAL_ENTRIES_TEMPLATE_FILENAME,
  buildReportManualEntriesTemplateBuffer,
} from "@/lib/report/report-manual-entries-import.server";
import { verifyServerPageRead, verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const allowed = await verifyServerPageWrite("report");
  if (!allowed) {
    return NextResponse.json({ error: "Permesso negato." }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File mancante." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = await importReportManualEntriesSpreadsheetServer(bytes, file.name);
  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error,
        ...(result.data ?? {}),
      },
      { status: 400 },
    );
  }

  return NextResponse.json(result.data);
}

export async function GET() {
  const allowed = await verifyServerPageRead("report");
  if (!allowed) {
    return NextResponse.json({ error: "Permesso negato." }, { status: 403 });
  }

  const buffer = buildReportManualEntriesTemplateBuffer();
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${REPORT_MANUAL_ENTRIES_TEMPLATE_FILENAME}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
