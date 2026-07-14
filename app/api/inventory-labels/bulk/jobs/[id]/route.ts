import { NextResponse } from "next/server";
import { requireInventoryLabelsRead } from "@/lib/inventory-labels/api-auth.server";
import { getBulkLabelJob } from "@/lib/inventory-labels/jobs/bulk-label-job.server";
import { downloadLabelArtifact } from "@/lib/inventory-labels/storage/artifacts.server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

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
        return new Response(Buffer.from(bytes), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="etichette-job-${id.slice(0, 8)}.pdf"`,
            "X-Job-Status": "completed",
          },
        });
      }
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      error: job.error,
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
