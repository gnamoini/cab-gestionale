import { NextResponse } from "next/server";
import { vat_admin_create_code, vat_admin_create_configuration_version } from "@/lib/vat/vat-admin.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export async function GET() {
  try {
    const supabase = await createSupabaseServerUserClient();
    const { data: codes, error: codesErr } = await supabase.from("vat_codes").select("id, code, active").order("code");
    if (codesErr) throw new Error(codesErr.message);

    const { data: configs, error: cfgErr } = await supabase
      .from("vat_code_configurations")
      .select("id, vat_code_id, description, rate, direction, valid_from, valid_to, active")
      .order("valid_from", { ascending: false });
    if (cfgErr) throw new Error(cfgErr.message);

    return NextResponse.json({ codes: codes ?? [], configurations: configs ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore elenco codici IVA";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "create_code");

    if (action === "create_version") {
      const result = await vat_admin_create_configuration_version(body);
      return NextResponse.json(result);
    }

    const result = await vat_admin_create_code(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore operazione IVA";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
