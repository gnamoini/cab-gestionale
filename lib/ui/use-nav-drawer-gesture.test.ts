import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const gestureSrc = readFileSync(join(root, "lib/ui/use-nav-drawer-gesture.ts"), "utf8");
assert.match(gestureSrc, /usePointerGesture/);
assert.match(gestureSrc, /drawerStateRef/);
assert.match(gestureSrc, /canEdgeSwipeRef/);
assert.match(gestureSrc, /canDismissRef/);
assert.doesNotMatch(gestureSrc, /mode:\s*["']open["']/);
assert.doesNotMatch(gestureSrc, /onTouchStart/);
assert.match(gestureSrc, /onEdgeDragStart/);
assert.match(gestureSrc, /onDismissDragStart/);
assert.match(gestureSrc, /armSelectorGhostClickGuard/);
assert.match(gestureSrc, /requestAnimationFrame/);
assert.match(gestureSrc, /enabled:\s*enabled\s*\|\|\s*gestureActive/);

const appShellSrc = readFileSync(join(root, "components/gestionale/app-shell.tsx"), "utf8");
assert.match(appShellSrc, /useNavDrawerGesture/);
assert.match(appShellSrc, /canEdgeSwipe:\s*flags\.canEdgeSwipe/);
assert.match(appShellSrc, /canDismiss:\s*flags\.canDismiss/);
assert.doesNotMatch(appShellSrc, /useSwipeFromEdgeToOpen/);

const sidebarSrc = readFileSync(join(root, "components/gestionale/app-shell-sidebar.tsx"), "utf8");
assert.doesNotMatch(sidebarSrc, /useSwipeToDismiss/);
assert.doesNotMatch(sidebarSrc, /onTouchStart/);
assert.match(sidebarSrc, /navGesturePanelProps/);

console.log("use-nav-drawer-gesture.test.ts ok");
