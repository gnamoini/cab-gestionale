import { NextResponse } from "next/server";
import { z } from "zod";
import { runPreventivoPolish } from "@/lib/preventivi/description-engine/preventivo-polish.server";
import { verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

const bodySchema = z.object({
  description: z.string().min(1).max(20_000),
  technicalFingerprint: z.string().min(8).max(128),
  guardContext: z.object({
    lineCount: z.number().int().min(0),
    ricambiCodes: z.array(z.string()),
    ricambiQuantities: z.array(z.number()),
    sourceText: z.string(),
  }),
});

export async function POST(request: Request) {
  const canWrite = await verifyServerPageWrite("preventivi");
  if (!canWrite) {
    return NextResponse.json({ error: "Permesso negato", code: "PERMISSION_DENIED" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON non valido", code: "INVALID_BODY" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parametri non validi", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await runPreventivoPolish(parsed.data);
  return NextResponse.json(result);
}
