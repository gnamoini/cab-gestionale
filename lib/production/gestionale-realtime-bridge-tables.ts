import fs from "node:fs";
import path from "node:path";
import { parseExpectedRealtimePublicationTables } from "@/lib/production/expected-realtime-publication";

const INVALIDATE_TARGETS_PATH = path.join(
  process.cwd(),
  "src/lib/react-query/invalidate-targets.ts",
);

/** Estrae chiavi GESTIONALE_TABLE_QUERY_KEYS senza importare moduli client/server. */
export function getGestionaleRealtimeBridgeTables(): string[] {
  const src = fs.readFileSync(INVALIDATE_TARGETS_PATH, "utf8");
  const match = src.match(
    /export const GESTIONALE_TABLE_QUERY_KEYS[^=]*=\s*\{([\s\S]*?)\n\};/,
  );
  if (!match) return [];
  const keys: string[] = [];
  const keyRe = /^\s*([a-z_][a-z0-9_]*)\s*:/gm;
  let m: RegExpExecArray | null;
  while ((m = keyRe.exec(match[1]!)) !== null) {
    keys.push(m[1]!);
  }
  return keys.sort();
}

/** Tabelle bridge non ancora in publication — richiedono migration o rimozione subscription. */
export function getBridgeTablesMissingFromPublication(): string[] {
  const published = new Set(parseExpectedRealtimePublicationTables());
  return getGestionaleRealtimeBridgeTables().filter((t) => !published.has(t));
}

/** Tabelle in publication ma non nel bridge (informativo). */
export function getPublicationTablesMissingFromBridge(): string[] {
  const bridge = new Set(getGestionaleRealtimeBridgeTables());
  return parseExpectedRealtimePublicationTables().filter((t) => !bridge.has(t));
}
