import { NextResponse } from "next/server";
import { emitReportAnalysisTelemetry } from "@/lib/report/report-analysis/emit-report-analysis-observability";
import { REPORT_ANALYSIS_CONTEXT_MAX_BYTES } from "@/lib/report/report-analysis/report-analysis-config";
import { isReportAnalysisRateLimited } from "@/lib/report/report-analysis/report-analysis-rate-limit.server";
import { AIReportService } from "@/lib/report/report-analysis/report-analysis-service.server";
import { reportAnalysisRequestSchema } from "@/lib/report/report-analysis/report-analysis-schema";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const t0 = Date.now();
  const allowed = await verifyServerPageRead("report");
  if (!allowed) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const session = await getServerSession();
  const userId = session.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sessione non valida" }, { status: 401 });
  }

  if (await isReportAnalysisRateLimited(userId)) {
    return NextResponse.json(
      { error: "Troppe richieste. Attendi qualche minuto prima di rigenerare." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }

  const parsed = reportAnalysisRequestSchema.safeParse(body);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    console.warn("[report-analysis] invalid request", flattened);

    const fingerprintIssue = parsed.error.issues.some((issue) =>
      issue.path.some((segment) => segment === "snapshotFingerprint"),
    );
    const errorMessage = fingerprintIssue
      ? "Parametri analisi non validi (snapshot troppo lungo)"
      : "Dati report non validi per l'analisi AI";

    emitReportAnalysisTelemetry({ outcome: "empty", latencyMs: Date.now() - t0, code: "validation_failed" });
    return NextResponse.json(
      {
        error: errorMessage,
        ...(process.env.NODE_ENV === "development" ? { details: flattened } : {}),
      },
      { status: 400 },
    );
  }

  const contextBytes = new TextEncoder().encode(JSON.stringify(parsed.data.context)).length;
  if (contextBytes > REPORT_ANALYSIS_CONTEXT_MAX_BYTES) {
    emitReportAnalysisTelemetry({ outcome: "empty", latencyMs: Date.now() - t0, code: "context_too_large" });
    return NextResponse.json({ error: "Context troppo grande" }, { status: 413 });
  }

  const result = await AIReportService.generateReportAnalysis(parsed.data.context);
  if (!result.ok) {
    emitReportAnalysisTelemetry({
      outcome: "failed",
      latencyMs: Date.now() - t0,
      code: result.code,
    });
    const status =
      result.code === "not_configured" ? 503 : result.code === "timeout" ? 504 : 502;
    return NextResponse.json({ error: result.message, code: result.code }, { status });
  }

  emitReportAnalysisTelemetry({ outcome: "completed", latencyMs: Date.now() - t0 });
  return NextResponse.json(result.data);
}
