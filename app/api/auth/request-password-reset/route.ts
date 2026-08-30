import { NextResponse } from "next/server";
import {
  PASSWORD_RESET_ADMIN_GENERIC_MESSAGE,
  resolvePasswordResetRedirectUrl,
} from "@/lib/auth/password-reset";
import { sendBrandedPasswordResetEmail } from "@/lib/auth/password-reset-email.server";
import { isValidEmail } from "@/lib/validation/email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { email?: string } = {};
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: "Body JSON non valido." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Inserisci un indirizzo email valido." }, { status: 400 });
  }

  const origin = request.headers.get("origin")?.trim();
  if (!origin) {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const redirectTo = resolvePasswordResetRedirectUrl(origin);
  const result = await sendBrandedPasswordResetEmail({ email, redirectTo });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 503 });
  }

  return NextResponse.json({ ok: true, message: PASSWORD_RESET_ADMIN_GENERIC_MESSAGE });
}
