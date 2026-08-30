/**
 * Generate lib/ui/ui-final-stability-manifest.json — frozen UI stability scores.
 * Usage: npx tsx scripts/generate-ui-final-stability-manifest.ts [--update]
 *
 * Update requires UI_FINAL_STABILITY_APPROVED=1
 */
import fs from "node:fs";
import path from "node:path";
import {
  buildUiFinalStabilityManifest,
  isUiFinalStabilityUpdateApproved,
  UI_FINAL_STABILITY_MANIFEST_PATH,
  UI_FINAL_STABILITY_UPDATE_ENV,
  verifyUiFinalStabilityManifest,
  type UiFinalStabilityManifest,
} from "@/lib/ui/ui-final-stability-manifest";
import { FLEX_SYSTEM_ABSOLUTE_FINAL_STATE } from "@/lib/ui/flex-system-freeze";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, UI_FINAL_STABILITY_MANIFEST_PATH);

function main(): void {
  if (!FLEX_SYSTEM_ABSOLUTE_FINAL_STATE) {
    console.error("generate-ui-final-stability-manifest: FLEX_SYSTEM_ABSOLUTE_FINAL_STATE must be true");
    process.exit(1);
  }

  const update = process.argv.includes("--update");

  if (update || !fs.existsSync(MANIFEST_PATH)) {
    if (update && !isUiFinalStabilityUpdateApproved()) {
      console.error(`Manifest update requires ${UI_FINAL_STABILITY_UPDATE_ENV}=1`);
      process.exit(1);
    }

    const prevVersion = fs.existsSync(MANIFEST_PATH)
      ? (JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as UiFinalStabilityManifest).version
      : 0;
    const nextVersion = update && prevVersion > 0 ? prevVersion + 1 : 1;
    const payload = buildUiFinalStabilityManifest(undefined, nextVersion);

    fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log(`Wrote ${UI_FINAL_STABILITY_MANIFEST_PATH} (v${nextVersion}, checksum ${payload.checksum.slice(0, 12)}…)`);
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as UiFinalStabilityManifest;
  const verification = verifyUiFinalStabilityManifest(manifest);
  if (!verification.valid) {
    console.error("ui-final-stability-manifest drift detected:");
    for (const e of verification.errors) console.error(`  ${e}`);
    process.exit(1);
  }

  console.log(`ui-final-stability-manifest OK (v${manifest.version})`);
}

main();
