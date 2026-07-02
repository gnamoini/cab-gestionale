import { createHash } from "node:crypto";
import { normPhrase } from "@/lib/preventivi/preventivi-learning-storage";
import type { CatalogActivityType } from "@/lib/domain/technical-knowledge-base/types";

const VERB_CANON: Record<string, string> = {
  smontaggio: "smontaggio",
  sostituzione: "sostituzione",
  pulizia: "pulizia",
  controllo: "controllo",
  verifica: "verifica",
  collaudo: "collaudo",
  diagnosi: "diagnosi",
  ripristino: "ripristino",
};

export function semanticFingerprintLine(
  line: string,
  ctx?: { activityType?: CatalogActivityType; componenteSlugs?: string[] },
): string {
  const tokens = normPhrase(line)
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .map((w) => VERB_CANON[w] ?? w)
    .sort();
  const comp = (ctx?.componenteSlugs ?? []).slice().sort().join(",");
  const payload = `${ctx?.activityType ?? ""}|${comp}|${tokens.join(" ")}`;
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export function aggregateLinesFingerprint(
  lines: readonly { text: string; activityType?: CatalogActivityType; componenteSlugs?: string[] }[],
): string {
  return createHash("sha256")
    .update(lines.map((l) => semanticFingerprintLine(l.text, l)).join("|"))
    .digest("hex");
}
