import { diffCompatLegacy } from "@/lib/magazzino/compat/build-compat-meta";
import { writeCompatibilitaRicambio } from "@/lib/magazzino/compat/compat-write-gate";
import { parseMagazzinoRicambioMeta } from "@/lib/magazzino/magazzino-meta";
import { normalizeCompatList } from "@/lib/magazzino/compat/compat-normalize";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";

export type CompatHealResult = {
  id: string;
  healed: boolean;
  before: string[];
  after: string[];
};

export type CompatHealBatchResult = {
  results: CompatHealResult[];
  /** Righe con mismatch legacy (dry-run o post-heal). */
  mismatchCount: number;
};

function healLog(log: ((msg: string) => void) | undefined, msg: string): void {
  if (log) log(msg);
  else if (process.env.NODE_ENV !== "production") console.debug(`[compat-auto-heal] ${msg}`);
}

/** Confronta e opzionalmente persiste legacy rigenerato da refs — non tocca refs. */
export async function healMagazzinoCompatBatch(
  rows: readonly MagazzinoRicambioRow[],
  liste: MezziListePrefs,
  opts?: { dryRun?: boolean; log?: (msg: string) => void },
): Promise<CompatHealBatchResult> {
  const dryRun = opts?.dryRun !== false;
  const results: CompatHealResult[] = [];
  let mismatchCount = 0;

  for (const row of rows) {
    const meta = parseMagazzinoRicambioMeta(row.meta ?? {});
    const refs = meta.compatibilitaRefs ?? [];
    if (refs.length === 0) continue;

    const before = normalizeCompatList(meta.compatibilitaMezzi ?? []);
    const { mismatch, expected } = diffCompatLegacy(refs, before, liste);
    if (!mismatch) continue;

    mismatchCount += 1;
    results.push({ id: row.id, healed: !dryRun, before, after: expected });

    if (dryRun) {
      healLog(opts?.log, `dry-run ${row.id}: legacy mismatch (${before.length} → ${expected.length})`);
      continue;
    }

    const c = await getBrowserSupabase();
    const prevMeta =
      row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
        ? { ...(row.meta as Record<string, unknown>) }
        : {};
    const compatMeta = writeCompatibilitaRicambio(
      {
        compatibilitaRefs: refs,
        compatibilitaMezzi: meta.compatibilitaMezzi ?? [],
        ricambioId: row.id,
      },
      liste,
      "compat-auto-heal.healMagazzinoCompatBatch",
    );
    const nextMeta = {
      ...prevMeta,
      compatibilitaRefs: compatMeta.compatibilitaRefs,
      compatibilitaMezzi: compatMeta.compatibilitaMezzi,
    };
    const { error } = await c.from("magazzino_ricambi").update({ meta: nextMeta }).eq("id", row.id);
    if (error) {
      healLog(opts?.log, `heal failed ${row.id}: ${error.message}`);
    }
  }

  return { results, mismatchCount };
}

/** Dry-run heal su lista UI già caricata (no fetch). */
export function scanCompatHealCandidates(
  rows: readonly MagazzinoRicambioRow[],
  liste: MezziListePrefs,
): CompatHealResult[] {
  const out: CompatHealResult[] = [];
  for (const row of rows) {
    const meta = parseMagazzinoRicambioMeta(row.meta ?? {});
    const refs = meta.compatibilitaRefs ?? [];
    if (refs.length === 0) continue;
    const before = normalizeCompatList(meta.compatibilitaMezzi ?? []);
    const { mismatch, expected } = diffCompatLegacy(refs, before, liste);
    if (mismatch) out.push({ id: row.id, healed: false, before, after: expected });
  }
  return out;
}
