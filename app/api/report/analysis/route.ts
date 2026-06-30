import { NextResponse } from "next/server";
import { REPORT_ANALYSIS_CONTEXT_MAX_BYTES } from "@/lib/report/report-analysis/report-analysis-config";
import { isReportAnalysisRateLimited } from "@/lib/report/report-analysis/report-analysis-rate-limit.server";
import { AIReportService } from "@/lib/report/report-analysis/report-analysis-service.server";
import { reportAnalysisRequestSchema } from "@/lib/report/report-analysis/report-analysis-schema";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import { verifyServerSectionRead } from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const allowed = await verifyServerSectionRead("report");
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
    return NextResponse.json({ error: "Context troppo grande" }, { status: 413 });
  }

  const result = await AIReportService.generateReportAnalysis(parsed.data.context);
  if (!result.ok) {
    const status =
      result.code === "not_configured" ? 503 : result.code === "timeout" ? 504 : 502;
    return NextResponse.json({ error: result.message, code: result.code }, { status });
  }

  return NextResponse.json(result.data);
}
