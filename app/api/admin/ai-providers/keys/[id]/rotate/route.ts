import { NextResponse } from "next/server";
import { rotateProviderKey } from "@/lib/ai/runtime/key-ingest";
import { requireOpsAdmin } from "@/lib/ops/ops-api-auth.server";
import type { AiProviderId } from "@/lib/ai/runtime/types";

export const runtime = "nodejs";
export const maxDuration = 30;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const body = (await request.json()) as {
    newApiKey?: string;
    newSlot?: string;
    provider?: AiProviderId;
  };

  if (!body.newApiKey?.trim()) {
    return NextResponse.json({ error: "newApiKey obbligatoria" }, { status: 400 });
  }

  const result = await rotateProviderKey({
    oldKeyId: id,
    provider: body.provider ?? "google",
    newSlot: body.newSlot?.trim() || `rotated-${Date.now()}`,
    newApiKey: body.newApiKey.trim(),
    actorId: auth.userId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json({ ok: true, newId: result.newId });
}
