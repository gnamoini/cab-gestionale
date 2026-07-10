/**
 * governance.regression.classification — ogni test in esattamente una suite P0-P3
 */
import {
  P0_MAX,
  P0_MIN,
  REGRESSION_ALL_CLASSIFIED,
  REGRESSION_LEGACY_ALL,
  REGRESSION_P0,
  REGRESSION_P1,
  REGRESSION_P2,
  REGRESSION_P3,
} from "@/lib/control/suites/regression-partition";
import {
  SECURITY_RBAC_HARDENING_SUITE,
  SECURITY_RBAC_SUITE,
} from "@/lib/control/suites/security-rbac.suite";

const suites = [
  { name: "P0", files: REGRESSION_P0 },
  { name: "P1", files: REGRESSION_P1 },
  { name: "P2", files: REGRESSION_P2 },
  { name: "P3", files: REGRESSION_P3 },
  { name: "RBAC", files: [...SECURITY_RBAC_SUITE, ...SECURITY_RBAC_HARDENING_SUITE] },
] as const;

const blockers: string[] = [];

const seen = new Map<string, string>();
for (const suite of suites) {
  for (const file of suite.files) {
    const prev = seen.get(file);
    if (prev) blockers.push(`${file} in both ${prev} and ${suite.name}`);
    else seen.set(file, suite.name);
  }
}

const classifiedSet = new Set(REGRESSION_ALL_CLASSIFIED);
const legacySet = new Set(REGRESSION_LEGACY_ALL);

for (const file of REGRESSION_LEGACY_ALL) {
  if (!classifiedSet.has(file)) blockers.push(`orphan (not classified): ${file}`);
}
const securitySet = new Set([...SECURITY_RBAC_SUITE, ...SECURITY_RBAC_HARDENING_SUITE]);
for (const file of REGRESSION_ALL_CLASSIFIED) {
  if (!legacySet.has(file) && !securitySet.has(file)) {
    blockers.push(`extra (not in legacy lists): ${file}`);
  }
}

if (REGRESSION_P0.length < P0_MIN) {
  blockers.push(`P0 too small: ${REGRESSION_P0.length} (min ${P0_MIN})`);
}
if (REGRESSION_P0.length > P0_MAX) {
  blockers.push(`P0 too large: ${REGRESSION_P0.length} (max ${P0_MAX})`);
}

if (blockers.length > 0) {
  console.error("governance.regression.classification — FAIL");
  for (const b of blockers) console.error(`- ${b}`);
  process.exit(1);
}

console.log("governance.regression.classification — PASS");
console.log(
  `P0=${REGRESSION_P0.length} P1=${REGRESSION_P1.length} P2=${REGRESSION_P2.length} P3=${REGRESSION_P3.length}`,
);
