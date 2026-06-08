/**
 * Gate publication realtime Supabase — sanity (PR) / full (cert).
 * Uso: npx tsx scripts/verify-supabase-publication.ts --mode=sanity|full
 */
import {
  DEPRECATED_REALTIME_TABLES,
  diffPublicationSets,
  parseExpectedRealtimePublicationTables,
} from "@/lib/production/expected-realtime-publication";
import { fetchRealtimePublicationTables } from "@/lib/production/fetch-realtime-publication-tables";
import { exitWithGate, printGateResult } from "@/lib/ci/gate-output";

const GATE_NAME = "Supabase realtime publication";

type Mode = "sanity" | "full";

function parseMode(): Mode {
  const arg = process.argv.find((a) => a.startsWith("--mode="));
  const mode = arg?.split("=")[1]?.trim();
  if (mode === "full") return "full";
  return "sanity";
}

function isStrict(): boolean {
  return process.env.PUBLICATION_CHECK_STRICT !== "0";
}

async function main(): Promise<void> {
  const mode = parseMode();
  const strict = isStrict();
  const blockers: string[] = [];
  const warnings: string[] = [];

  const expected = parseExpectedRealtimePublicationTables();
  if (expected.length === 0) {
    blockers.push("Nessuna tabella attesa da migrations — verificare supabase/migrations");
  }

  for (const dep of DEPRECATED_REALTIME_TABLES) {
    if (expected.includes(dep)) {
      blockers.push(`Tabella deprecata ${dep} ancora nel set atteso repo (migrations)`);
    }
  }

  const live = await fetchRealtimePublicationTables();

  if (!live.connected) {
    const msg = live.error ?? "connessione publication non disponibile";
    if (strict && process.env.CI === "true") {
      blockers.push(msg);
    } else {
      warnings.push(`${msg} (PUBLICATION_CHECK_STRICT=0 o non-CI: solo static SSOT)`);
    }
  } else {
    const deprecatedLive = DEPRECATED_REALTIME_TABLES.filter((t) => live.tables.includes(t));
    if (deprecatedLive.length > 0) {
      blockers.push(`Tabelle deprecate ancora in publication live: ${deprecatedLive.join(", ")}`);
    }

    const { missing, extra } = diffPublicationSets(expected, live.tables);

    if (mode === "full") {
      if (missing.length > 0) {
        blockers.push(`Tabelle mancanti in publication: ${missing.join(", ")}`);
      }
      if (extra.length > 0) {
        blockers.push(`Tabelle extra in publication: ${extra.join(", ")}`);
      }
    } else {
      if (extra.length > 0) {
        blockers.push(`Drift publication (extra): ${extra.join(", ")}`);
      }
      if (missing.length > 0) {
        warnings.push(`Tabelle mancanti in publication (sanity): ${missing.join(", ")}`);
      }
    }

    if (mode === "sanity" && live.tables.length !== expected.length) {
      warnings.push(`Count publication ${live.tables.length} vs atteso repo ${expected.length}`);
    }
  }

  const status = blockers.length === 0 ? "PASS" : "FAIL";
  printGateResult({ name: `${GATE_NAME} (${mode})`, status, blockers, warnings });
  exitWithGate(status);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
