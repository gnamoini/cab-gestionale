import assert from "node:assert/strict";
import {
  computeModulePermissionDraft,
  modulePermissionDraftEquals,
  modulePermissionsPayloadFromDraft,
  normalizeModuleDraftRow,
  planModulePermissionPersist,
  snapshotModuleDraft,
} from "@/lib/security/user-module-permissions";
import type { UserPermissionRow } from "@/src/types/supabase-tables";

const USER_ID = "11111111-1111-4111-8111-111111111111";

const rows: UserPermissionRow[] = [
  {
    user_id: USER_ID,
    module: "documenti",
    can_read: false,
    can_write: false,
    can_admin: false,
  },
];

const draft = computeModulePermissionDraft("operatore", USER_ID, rows);
const docRow = draft.find((r) => r.module === "documenti");
assert.ok(docRow);
assert.equal(docRow!.isCustomized, true);
assert.equal(docRow!.canRead, false);

const normalized = normalizeModuleDraftRow({ ...docRow!, canRead: false, canWrite: true });
assert.equal(normalized.canWrite, false, "write off when read off");

const plan = planModulePermissionPersist("operatore", draft);
assert.ok(plan.upserts.some((u) => u.module === "documenti"));

const payload = modulePermissionsPayloadFromDraft(
  "operatore",
  draft.map((r) => (r.module === "documenti" ? { ...r, canRead: true, canWrite: false } : r)),
);
assert.ok(payload === null || Array.isArray(payload));

const snapA = snapshotModuleDraft(draft);
const snapB = snapshotModuleDraft([...draft]);
assert.equal(modulePermissionDraftEquals(draft, [...draft]), true);
assert.notEqual(snapA, snapshotModuleDraft(draft.map((r) => ({ ...r, canRead: !r.canRead }))));

console.log("user-module-permissions.test.ts OK");
