/**
 * Flex ESLint baseline — fingerprint + integrity helpers.
 */

import { createHash } from "node:crypto";

export type FlexBaselineEntry = {
  file: string;
  line: number;
  reason: string;
};

export type FlexBaselineFile = {
  version: number;
  frozenAt?: string;
  entryCount: number;
  checksum: string;
  entries: FlexBaselineEntry[];
};

export function normalizeFlexBaselinePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

/** Strip absolute path to repo-relative `components/...` or `app/...`. */
export function toRepoRelativePath(filePath: string): string {
  const f = normalizeFlexBaselinePath(filePath);
  for (const marker of ["/components/", "/app/"]) {
    const idx = f.indexOf(marker);
    if (idx >= 0) return f.slice(idx + 1);
  }
  if (f.startsWith("components/") || f.startsWith("app/")) return f;
  return f;
}

export function flexViolationFingerprint(entry: FlexBaselineEntry): string {
  const file = normalizeFlexBaselinePath(entry.file);
  return `${file}:${entry.line}:${entry.reason}`;
}

export function isFlexViolationBaselined(
  entry: FlexBaselineEntry,
  baseline: FlexBaselineFile,
): boolean {
  const fp = flexViolationFingerprint(entry);
  return baseline.entries.some((e) => flexViolationFingerprint(e) === fp);
}

export function dedupeFlexBaselineEntries(entries: FlexBaselineEntry[]): FlexBaselineEntry[] {
  const seen = new Set<string>();
  const out: FlexBaselineEntry[] = [];

  for (const entry of entries) {
    const normalized: FlexBaselineEntry = {
      file: normalizeFlexBaselinePath(entry.file),
      line: entry.line,
      reason: entry.reason,
    };
    const fp = flexViolationFingerprint(normalized);
    if (seen.has(fp)) continue;
    seen.add(fp);
    out.push(normalized);
  }

  out.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.reason.localeCompare(b.reason));
  return out;
}

export function computeFlexBaselineChecksum(entries: FlexBaselineEntry[]): string {
  const sorted = dedupeFlexBaselineEntries(entries);
  const payload = sorted.map(flexViolationFingerprint).join("\n");
  return createHash("sha256").update(payload).digest("hex");
}

export function buildFlexBaselineFile(entries: FlexBaselineEntry[], version = 1): FlexBaselineFile {
  const deduped = dedupeFlexBaselineEntries(entries);
  return {
    version,
    frozenAt: new Date().toISOString().slice(0, 10),
    entryCount: deduped.length,
    checksum: computeFlexBaselineChecksum(deduped),
    entries: deduped,
  };
}

export function verifyFlexBaselineIntegrity(file: FlexBaselineFile): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(file.entries)) {
    errors.push("baseline entries must be an array");
    return { valid: false, errors };
  }

  if (file.entryCount !== file.entries.length) {
    errors.push(`entryCount mismatch: declared ${file.entryCount}, actual ${file.entries.length}`);
  }

  const expected = computeFlexBaselineChecksum(file.entries);
  if (file.checksum !== expected) {
    errors.push(`checksum mismatch: declared ${file.checksum}, expected ${expected}`);
  }

  return { valid: errors.length === 0, errors };
}

export function diffFlexBaseline(
  current: FlexBaselineEntry[],
  baseline: FlexBaselineFile,
): { added: FlexBaselineEntry[]; removed: FlexBaselineEntry[] } {
  const baselineFps = new Set(baseline.entries.map(flexViolationFingerprint));
  const currentFps = new Set(current.map(flexViolationFingerprint));

  const added = dedupeFlexBaselineEntries(current).filter(
    (e) => !baselineFps.has(flexViolationFingerprint(e)),
  );
  const removed = baseline.entries.filter((e) => !currentFps.has(flexViolationFingerprint(e)));

  return { added, removed };
}
