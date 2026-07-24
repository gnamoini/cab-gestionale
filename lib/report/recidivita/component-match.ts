import type { LavorazioneSchedeBundle } from "@/types/schede";

export type ComponentKey = {
  ricambioId: string | null;
  ricambioNome: string;
};

export function extractComponentsFromBundle(
  bundle: LavorazioneSchedeBundle | null | undefined,
): ComponentKey[] {
  const rows = bundle?.ricambi?.campi.righe ?? [];
  const out: ComponentKey[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const key = r.ricambioId?.trim()
      ? `id:${r.ricambioId.trim()}`
      : `name:${(r.ricambioNome ?? r.codice ?? "").trim().toLowerCase()}`;
    if (!key || key === "name:" || seen.has(key)) continue;
    seen.add(key);
    out.push({
      ricambioId: r.ricambioId?.trim() || null,
      ricambioNome: (r.ricambioNome ?? r.codice ?? "").trim(),
    });
  }
  return out;
}

export function componentOverlapScore(a: readonly ComponentKey[], b: readonly ComponentKey[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const keysB = new Set(
    b.map((c) => (c.ricambioId ? `id:${c.ricambioId}` : `name:${c.ricambioNome.toLowerCase()}`)),
  );
  let matches = 0;
  for (const c of a) {
    const key = c.ricambioId ? `id:${c.ricambioId}` : `name:${c.ricambioNome.toLowerCase()}`;
    if (keysB.has(key)) matches += 1;
  }
  return matches / Math.max(a.length, b.length);
}
