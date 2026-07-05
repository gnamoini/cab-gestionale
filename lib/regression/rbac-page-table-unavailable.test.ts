import assert from "node:assert/strict";
import { isRbacPageTableUnavailableError } from "@/src/lib/rbac/load-rbac-data";

assert.equal(
  isRbacPageTableUnavailableError(
    "Could not find the table 'public.user_page_overrides' in the schema cache",
  ),
  true,
);
assert.equal(
  isRbacPageTableUnavailableError("Could not find the table 'public.role_page_access' in the schema cache"),
  true,
);
assert.equal(isRbacPageTableUnavailableError("permission denied for table user_page_overrides"), false);
assert.equal(isRbacPageTableUnavailableError(null), false);

console.log("rbac-page-table-unavailable.test.ts OK");
