/**
 * governance.rbac.sync-check — advisory TS seed structure (experimental)
 */
import { allGestionalePageKeys } from "@/src/lib/permissions/gestionale-pages";
import { RBAC_PAGE_SEED_MATRIX } from "@/lib/rbac-page-seed";

const blockers: string[] = [];
const pageKeys = allGestionalePageKeys();

if (!pageKeys.length) blockers.push("GESTIONALE_PAGE_KEYS empty");
if (!Object.keys(RBAC_PAGE_SEED_MATRIX).length) blockers.push("RBAC_PAGE_SEED_MATRIX empty");

for (const role of Object.keys(RBAC_PAGE_SEED_MATRIX)) {
  const pages = RBAC_PAGE_SEED_MATRIX[role as keyof typeof RBAC_PAGE_SEED_MATRIX];
  if (!pages || typeof pages !== "object") blockers.push(`invalid seed for role ${role}`);
}

if (blockers.length > 0) {
  console.error("governance.rbac.sync-check — FAIL");
  for (const b of blockers) console.error(`- ${b}`);
  process.exit(1);
}

console.log("governance.rbac.sync-check — PASS (static seed structure)");
