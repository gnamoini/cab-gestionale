import { isPdfArtifactType } from "@/lib/pdf-artifacts/pdf-artifact-registry";
import { invalidatePdfArtifactScope } from "@/lib/pdf-artifacts/pdf-artifact-invalidate.server";
import { verifyServerPermission } from "@/src/lib/auth/server-permission-guards";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!(await verifyServerPermission("manageSettings"))) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  let body: { type?: string; scopeId?: string };
  try {
    body = (await request.json()) as { type?: string; scopeId?: string };
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }

  const type = body.type?.trim() ?? "";
  const scopeId = body.scopeId?.trim() || "global";
  if (!isPdfArtifactType(type)) {
    return NextResponse.json({ error: "Tipo artifact non valido" }, { status: 400 });
  }

  try {
    const removed = await invalidatePdfArtifactScope(type, scopeId);
    return NextResponse.json({ ok: true, removed });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalidazione non riuscita";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
