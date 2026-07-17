import { NextResponse } from "next/server";
import { requireInventoryLabelsRead } from "@/lib/inventory-labels/api-auth.server";
import { getBulkLabelJob } from "@/lib/inventory-labels/jobs/bulk-label-job.server";
import { downloadLabelArtifact } from "@/lib/inventory-labels/storage/artifacts.server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function resultContentType(format: string | null | undefined, path: string | null | undefined): {
  contentType: string;
  ext: string;
} {
  if (format === "zip" || path?.endsWith(".zip")) {
    return { contentType: "application/zip", ext: "zip" };
  }
  return { contentType: "application/pdf", ext: "pdf" };
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireInventoryLabelsRead();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  try {
    const job = await getBulkLabelJob(id);
    if (!job) return NextResponse.json({ error: "Job non trovato" }, { status: 404 });

    if (job.status === "completed" && job.result_storage_path) {
      const bytes = await downloadLabelArtifact(job.result_storage_path);
      if (bytes) {
        const { contentType, ext } = resultContentType(job.format, job.result_storage_path);
        return new Response(Buffer.from(bytes), {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": `attachment; filename="etichette-job-${id.slice(0, 8)}.${ext}"`,
            "X-Job-Status": "completed",
          },
        });
      }
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      progress: typeof job.progress === "number" ? job.progress : 0,
      error: job.error,
      errorCode: job.error_code ?? null,
      format: job.format,
      createdAt: job.created_at,
      completedAt: job.completed_at,
      count: Array.isArray(job.entity_ids) ? job.entity_ids.length : 0,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lettura job fallita" },
      { status: 500 },
    );
  }
}
