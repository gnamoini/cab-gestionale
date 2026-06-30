import { NextResponse } from "next/server";
import { z } from "zod";
import { requireImportSession } from "@/lib/data-import/core/import-api-auth.server";
import {
  deleteImportMappingPreset,
  listImportMappingPresets,
  saveImportMappingPreset,
} from "@/lib/data-import/core/preset-store.server";
import type { ImportEntity } from "@/lib/data-import/core/types";

export const runtime = "nodejs";

const saveSchema = z.object({
  entity: z.string(),
  name: z.string().min(1).max(80),
  mapping: z.object({
    headerRowIndex: z.number().int().min(0),
    dataStartRowIndex: z.number().int().min(0),
    sheetIndex: z.number().int().min(0),
    columns: z.array(z.object({ sourceColumn: z.number().int().min(0), targetField: z.string() })),
  }),
});

export async function GET(request: Request) {
  const auth = await requireImportSession();
  if (!auth.ok) return NextResponse.json({ error: auth.response.error }, { status: auth.response.status });

  const url = new URL(request.url);
  const entity = url.searchParams.get("entity") as ImportEntity | null;

  try {
    const presets = await listImportMappingPresets(auth.userId, entity ?? undefined);
    return NextResponse.json({ presets });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Errore" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireImportSession();
  if (!auth.ok) return NextResponse.json({ error: auth.response.error }, { status: auth.response.status });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }

  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });

  try {
    const preset = await saveImportMappingPreset({
      userId: auth.userId,
      entity: parsed.data.entity as ImportEntity,
      name: parsed.data.name,
      mapping: parsed.data.mapping,
    });
    return NextResponse.json({ preset });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Errore" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireImportSession();
  if (!auth.ok) return NextResponse.json({ error: auth.response.error }, { status: auth.response.status });

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id richiesto" }, { status: 400 });

  try {
    await deleteImportMappingPreset(auth.userId, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Errore" }, { status: 500 });
  }
}
