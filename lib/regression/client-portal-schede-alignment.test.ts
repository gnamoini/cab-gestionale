import assert from "node:assert/strict";
import { schedeEnsureQueryKey } from "@/lib/schede/schede-sync-adapter";

const ids = ["lav-schede-align"];
assert.notEqual(
  JSON.stringify(schedeEnsureQueryKey(ids, false)),
  JSON.stringify(schedeEnsureQueryKey(ids, true)),
  "portal vs core ensure keys must differ",
);
assert.ok(
  JSON.stringify(schedeEnsureQueryKey(ids, true)).includes("portal"),
  "portal ensure key includes portal suffix",
);

console.log("client-portal-schede-alignment.test.ts OK");
