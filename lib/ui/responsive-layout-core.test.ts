import assert from "node:assert/strict";
import {
  GlobalFlexSystem,
  ResponsiveLayoutCore,
  layoutClass,
  layoutPageContainer,
  layoutPageRoot,
  layoutScrollSafe,
} from "@/lib/ui/responsive-layout-core";

assert.ok(layoutPageContainer.includes("min-w-0"));
assert.ok(layoutPageContainer.includes("max-w-full"));
assert.ok(layoutPageContainer.includes("overflow-x-clip"));

assert.equal(ResponsiveLayoutCore.pageContainer, layoutPageContainer);
assert.equal(ResponsiveLayoutCore.pageRoot, layoutPageRoot);
assert.equal(ResponsiveLayoutCore.scrollSafe, layoutScrollSafe);

assert.equal(ResponsiveLayoutCore.globalFlexSystem, GlobalFlexSystem);
assert.equal(GlobalFlexSystem.flexFillSafe, "flex-fill-safe");
assert.equal(ResponsiveLayoutCore.flexSafeRow, "flex-safe-row");
assert.equal(ResponsiveLayoutCore.textSafe, "text-safe");

assert.equal(layoutClass("a", false, undefined, null, "b"), "a b");

console.log("responsive-layout-core.test.ts OK");
