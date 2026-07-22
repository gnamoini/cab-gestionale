import { NextResponse } from "next/server";
import {
  buildDevProdParitySnapshot,
  compareParitySnapshots,
  type DevProdParitySnapshot,
} from "@/lib/document-capture/audit/dev-prod-parity-audit.server";
import { requireOpsAdmin } from "@/lib/ops/ops-api-auth.server";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const snapshot = await buildDevProdParitySnapshot();
  return NextResponse.json(snapshot);
}

export async function POST(request: Request) {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let baseline: DevProdParitySnapshot | null = null;
  try {
    const body = (await request.json()) as { baseline?: DevProdParitySnapshot };
    baseline = body.baseline ?? null;
  } catch {
    baseline = null;
  }

  const current = await buildDevProdParitySnapshot();
  if (!baseline) {
    return NextResponse.json({ current, diff: null });
  }

  const diff = compareParitySnapshots(baseline, current);
  const critical = diff.filter((d) => d.status === "MISMATCH" || d.status === "MISSING");
  return NextResponse.json({ current, baseline, diff, criticalCount: critical.length });
}
