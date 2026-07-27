import assert from "node:assert/strict";

/**
 * Documents preset list visibility: status is SSOT; deleted_at must not hide active/draft.
 */
function isVisibleInPresetAdminList(input: {
  status: string;
  deletedAt: string | null;
  includeArchived: boolean;
}): boolean {
  if (input.includeArchived) return true;
  return input.status === "active" || input.status === "draft";
}

assert.equal(
  isVisibleInPresetAdminList({ status: "active", deletedAt: "2026-07-26", includeArchived: true }),
  true,
);
assert.equal(
  isVisibleInPresetAdminList({ status: "archived", deletedAt: "2026-07-26", includeArchived: true }),
  true,
);
assert.equal(
  isVisibleInPresetAdminList({ status: "archived", deletedAt: null, includeArchived: false }),
  false,
);
assert.equal(
  isVisibleInPresetAdminList({ status: "active", deletedAt: "2026-07-26", includeArchived: false }),
  true,
);

console.log("maintenance-plan-archive-visibility.test.ts OK");
