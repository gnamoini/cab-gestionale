import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/mezzo-labels/api-auth.server";
import { resolveMezzoQrToken } from "@/lib/mezzo-labels/domain/tokens.server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim() ?? "";
  if (!token) return NextResponse.json({ error: "Token mancante" }, { status: 400 });

  const resolved = await resolveMezzoQrToken(auth.sb, token);
  if (!resolved.ok) {
    const status = resolved.code === "invalid_format" ? 400 : resolved.code === "inactive" ? 410 : 404;
    return NextResponse.json({ error: "Token non valido", code: resolved.code }, { status });
  }

  const { data: mezzo, error } = await auth.sb
    .from("mezzi")
    .select("id")
    .eq("id", resolved.row.mezzo_id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!mezzo) return NextResponse.json({ error: "Mezzo non trovato" }, { status: 404 });

  return NextResponse.json({ mezzoId: mezzo.id, token: resolved.row.token });
}
