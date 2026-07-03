import assert from "node:assert/strict";
import { isNavTargetCurrent, isSidebarNavLinkCurrent, scheduleRouteTransitionBegin } from "./route-transition";

assert.equal(isNavTargetCurrent("/impostazioni", "/impostazioni"), true);
assert.equal(isNavTargetCurrent("/lavorazioni/abc", "/lavorazioni"), true);
assert.equal(isNavTargetCurrent("/dashboard/foo", "/dashboard"), false);

assert.equal(
  isSidebarNavLinkCurrent(
    {
      closest: () => ({
        getAttribute: (name: string) => (name === "href" ? "/lavorazioni-clienti" : null),
      }),
    } as unknown as Element,
    "/lavorazioni-clienti",
  ),
  true,
);
assert.equal(
  isSidebarNavLinkCurrent(
    {
      closest: () => ({
        getAttribute: (name: string) => (name === "href" ? "/lavorazioni-clienti" : null),
      }),
    } as unknown as Element,
    "/dashboard",
  ),
  false,
);

let beginCalls = 0;
scheduleRouteTransitionBegin({ defaultPrevented: false }, () => {
  beginCalls += 1;
});
await Promise.resolve();
assert.equal(beginCalls, 1);

let blockedCalls = 0;
scheduleRouteTransitionBegin({ defaultPrevented: true }, () => {
  blockedCalls += 1;
});
await Promise.resolve();
assert.equal(blockedCalls, 0);

console.log("route-transition.test.ts: ok");
