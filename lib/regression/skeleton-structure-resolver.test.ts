import assert from "node:assert/strict";
import type { SkeletonContract } from "@/components/design-system/loading/skeleton-contract";
import {
  resolveSkeletonStructure,
  type ResolvedSkeletonNode,
} from "@/components/design-system/loading/skeleton-structure-resolver";

const combinedList: SkeletonContract = {
  kind: "combined-list",
  geometry: { height: "inventory-table", width: "full" },
};

const resolved = resolveSkeletonStructure(combinedList);
assert.equal(resolved.type, "shell-card");
assert.match((resolved as Extract<ResolvedSkeletonNode, { type: "shell-card" }>).bodyMinHeightClass, /min-h-/);

const grid: SkeletonContract = {
  kind: "grid",
  geometry: { height: "card-sm" },
  className: "grid grid-cols-2 gap-3",
  itemCount: 2,
};

const gridResolved = resolveSkeletonStructure(grid);
assert.equal(gridResolved.type, "grid");
assert.equal((gridResolved as Extract<ResolvedSkeletonNode, { type: "grid" }>).itemCount, 2);

console.log("skeleton-structure-resolver.test: OK");
