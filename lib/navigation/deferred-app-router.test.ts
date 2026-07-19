import assert from "node:assert/strict";
import { deferredRouterReplace } from "@/lib/navigation/deferred-app-router";

let replaced: string | null = null;
const router = {
  replace(href: string) {
    replaced = href;
  },
};

deferredRouterReplace(router, "/dashboard");
assert.equal(replaced, null, "replace is deferred");

setTimeout(() => {
  assert.equal(replaced, "/dashboard");
  console.log("deferred-app-router.test: OK");
}, 20);
