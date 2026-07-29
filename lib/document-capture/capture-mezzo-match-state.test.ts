import assert from "node:assert/strict";
import {
  canConfirmCaptureMezzoMatch,
  deriveMezzoMatchStateFromMerge,
  hasUnresolvedStrongIdentityConflicts,
} from "@/lib/document-capture/capture-mezzo-match-state";

const conflicts = [
  { field: "targa" as const, severity: "strong_identity" as const },
];

assert.equal(hasUnresolvedStrongIdentityConflicts(conflicts, {}), true);
assert.equal(hasUnresolvedStrongIdentityConflicts(conflicts, { targa: "registry" }), false);

assert.equal(
  deriveMezzoMatchStateFromMerge("candidate_found", conflicts, {}),
  "conflict_pending",
);

assert.equal(
  canConfirmCaptureMezzoMatch({
    state: "candidate_found",
    matchStrength: "strong",
    conflicts,
    conflictResolutions: {},
  }),
  false,
);

assert.equal(
  canConfirmCaptureMezzoMatch({
    state: "candidate_found",
    matchStrength: "strong",
    conflicts,
    conflictResolutions: { targa: "scan" },
  }),
  true,
);

console.log("capture-mezzo-match-state.test.ts OK");
