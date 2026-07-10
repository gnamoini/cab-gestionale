/**
 * ponytail: local strict path — resolveControlMode reads strict-label-validation.json
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { resolveControlMode } from "@/lib/control/control-mode";

const OUT = path.join(process.cwd(), "strict-label-validation.json");
const prior = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : null;

try {
  fs.writeFileSync(
    OUT,
    `${JSON.stringify({
      approved: true,
      strictEnabled: true,
      labelPresent: true,
      fork: false,
      labelAppliedBy: "maintainer",
      labelAppliedByPermission: "maintain",
      currentActor: "maintainer",
      currentActorPermission: "maintain",
      reason: "local strict path test",
    })}\n`,
  );

  const mode = resolveControlMode();
  assert.equal(mode.shadow, "strict");
  assert.equal(mode.coverage, "strict");
  assert.equal(mode.trigger, "label");
  assert.equal(mode.strictLabelApproved, true);
  console.log("strict-path-local — PASS");
} finally {
  if (prior === null) fs.unlinkSync(OUT);
  else fs.writeFileSync(OUT, prior);
}
