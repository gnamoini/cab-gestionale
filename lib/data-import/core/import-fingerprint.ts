import { createHash } from "node:crypto";
import type { ImportEntity } from "@/lib/data-import/core/types";

export type ImportFingerprint = {
  fileSha256: string;
  schemaHash: string;
  entity: ImportEntity;
  importMode: string;
  rowCount: number;
  decisionsHash: string;
};

export function hashImportFingerprint(fp: ImportFingerprint): string {
  const canonical = [
    fp.fileSha256,
    fp.schemaHash,
    fp.entity,
    fp.importMode,
    String(fp.rowCount),
    fp.decisionsHash,
  ].join("|");
  return createHash("sha256").update(canonical).digest("hex");
}

export function hashDecisions(decisions: unknown): string {
  return createHash("sha256").update(JSON.stringify(decisions)).digest("hex").slice(0, 32);
}

export type FingerprintCheckResult =
  | { status: "new" }
  | { status: "duplicate"; batchId: string; finishedAt: string | null };

/** ponytail: in-memory dedup per sessione; DB unique index su import_batches.fingerprint_hash in migration */
const sessionSuccessFingerprints = new Map<string, { batchId: string; finishedAt: string | null }>();

export function rememberSuccessfulFingerprint(
  fingerprintHash: string,
  batchId: string,
  finishedAt: string | null,
): void {
  sessionSuccessFingerprints.set(fingerprintHash, { batchId, finishedAt });
}

export function checkImportFingerprint(
  fingerprintHash: string,
  existingFromDb?: { batchId: string; finishedAt: string | null } | null,
): FingerprintCheckResult {
  const hit = existingFromDb ?? sessionSuccessFingerprints.get(fingerprintHash);
  if (!hit) return { status: "new" };
  return { status: "duplicate", batchId: hit.batchId, finishedAt: hit.finishedAt };
}
