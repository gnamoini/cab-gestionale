import { NextResponse } from "next/server";
import { reviewTagliandoCompliance } from "@/lib/maintenance-plans/review-tagliando-compliance.server";
import type { ComplianceReview } from "@/lib/maintenance-plans/maintenance-task";

export async function POST(req: Request) {
  const body = (await req.json()) as { serviceId?: string; review?: ComplianceReview };
  if (!body.serviceId || !body.review) {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }
  const result = await reviewTagliandoCompliance({ serviceId: body.serviceId, review: body.review });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
