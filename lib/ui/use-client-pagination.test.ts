import assert from "node:assert/strict";
import { clientPaginationPageForIndex } from "@/lib/ui/use-client-pagination";

assert.equal(clientPaginationPageForIndex(0, 25), 1);
assert.equal(clientPaginationPageForIndex(24, 25), 1);
assert.equal(clientPaginationPageForIndex(25, 25), 2);
assert.equal(clientPaginationPageForIndex(-1, 25), 1);

console.log("use-client-pagination.test.ts OK");
