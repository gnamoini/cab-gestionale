import { NextResponse } from "next/server";
import { getExportJob } from "@/lib/data-import/core/export-jobs.server";
import { requireImportSession } from "@/lib/data-import/core/import-api-auth.server";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireImportSession();
  if (!auth.ok) return NextResponse.json({ error: auth.response.error }, { status: auth.response.status });

  const { id } = await params;
  const job = await getExportJob(id);
  if (!job) return NextResponse.json({ error: "Job non trovato" }, { status: 404 });
  if (job.user_id !== auth.userId) return NextResponse.json({ error: "Permesso negato" }, { status: 403 });

  return NextResponse.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    resultPath: job.result_path,
    errorMessage: job.error_message,
  });
}
