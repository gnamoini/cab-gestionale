/**
 * Genera .eslint-flex-baseline.json — grandfather violazioni flex esistenti.
 * Usage: npx tsx scripts/generate-flex-baseline.ts [--update]
 *
 * Freeze mode: --update requires FLEX_BASELINE_APPROVED=1
 */
import fs from "node:fs";
import path from "node:path";
import {
  buildFlexBaselineFile,
  diffFlexBaseline,
  verifyFlexBaselineIntegrity,
  type FlexBaselineFile,
} from "@/lib/lint/flex-baseline-fingerprint";
import { scanFlexViolations } from "@/lib/lint/scan-flex-violations";
import { buildFlexFreezeManifest } from "@/lib/ui/flex-freeze-manifest";
import {
  FLEX_BASELINE_PATH,
  FLEX_BASELINE_UPDATE_ENV,
  FLEX_FREEZE_MANIFEST_PATH,
  FLEX_SYSTEM_FREEZE_MODE,
  isFlexBaselineUpdateApproved,
} from "@/lib/ui/flex-system-freeze";

const ROOT = process.cwd();
const BASELINE_PATH = path.join(ROOT, FLEX_BASELINE_PATH);

function main(): void {
  const update = process.argv.includes("--update");
  const entries = scanFlexViolations(ROOT);

  if (update || !fs.existsSync(BASELINE_PATH)) {
    if (FLEX_SYSTEM_FREEZE_MODE && update && !isFlexBaselineUpdateApproved()) {
      console.error(`Freeze mode: baseline update requires ${FLEX_BASELINE_UPDATE_ENV}=1`);
      process.exit(1);
    }

    const prevVersion = fs.existsSync(BASELINE_PATH)
      ? (JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")) as FlexBaselineFile).version
      : 0;
    const nextVersion = update && prevVersion > 0 ? prevVersion + 1 : 1;
    const payload = buildFlexBaselineFile(entries, nextVersion);

    fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

    const manifest = buildFlexFreezeManifest(payload);
    const manifestPath = path.join(ROOT, FLEX_FREEZE_MANIFEST_PATH);
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    console.log(
      `Wrote ${payload.entryCount} baseline entries to ${FLEX_BASELINE_PATH} (v${payload.version}, checksum ${payload.checksum.slice(0, 12)}…)`,
    );
    console.log(`Updated ${FLEX_FREEZE_MANIFEST_PATH}`);
    return;
  }

  const existing = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")) as FlexBaselineFile;
  const integrity = verifyFlexBaselineIntegrity(existing);
  if (!integrity.valid) {
    console.error("Baseline integrity failed:");
    for (const e of integrity.errors) console.error(`  ${e}`);
    process.exit(1);
  }

  const { added } = diffFlexBaseline(entries, existing);
  if (added.length > 0) {
    console.error(`Baseline missing ${added.length} violation(s). Run with --update to refresh.`);
    for (const v of added.slice(0, 20)) {
      console.error(`  NEW: ${v.file}:${v.line} [${v.reason}]`);
    }
    process.exit(1);
  }

  if (entries.length < existing.entries.length) {
    console.log(
      `Baseline has ${existing.entries.length - entries.length} stale entry(ies) — run --update to prune.`,
    );
  }

  console.log(`Baseline OK: ${existing.entryCount} entries (scan found ${entries.length})`);
}

main();
