/**
 * governance.release.contract — legacy release-gate and Control Plane conform to RELEASE_READY SSOT.
 */
import { validateReleaseReadyContract } from "@/lib/control/release-ready-contract";

const blockers = validateReleaseReadyContract();

if (blockers.length > 0) {
  console.error("governance.release.contract — FAIL");
  for (const b of blockers) console.error(`- ${b}`);
  process.exit(1);
}

console.log("governance.release.contract — PASS");
