/**
 * Overflow root-cause audit policy — pure logic + jsdom fixture.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import {
  computeElementOverflowMetrics,
  parseCssLength,
  pickOverflowKind,
  promoteToRootElement,
  scoreWidthConstraint,
} from "../observability/overflow-root-cause-audit";

const ROOT = process.cwd();

function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

assert.match(read("lib/observability/overflow-root-cause-audit.ts"), /NEXT_PUBLIC_OVERFLOW_ROOT_CAUSE_AUDIT === "1"/);
assert.match(read("lib/observability/overflow-root-cause-audit.ts"), /__cabOverflowAudit/);
assert.match(read("components/gestionale/dev-audit-mounts.tsx"), /OverflowRootCauseAuditMount/);
assert.match(read("components/observability/observability-diagnostics-pack-inner.tsx"), /overflow-root-cause-audit/);
assert.match(read("lib/ui/responsive-layout-audit.ts"), /intentional-horizontal-scroll/);

assert.equal(parseCssLength("960px"), 960);
assert.equal(parseCssLength("12rem", 16), 192);

const ctx = { innerWidth: 390, mainRight: 380, mainClientWidth: 360 };
const metrics = computeElementOverflowMetrics(
  {
    rectLeft: 0,
    rectRight: 412,
    rectWidth: 412,
    scrollWidth: 412,
    clientWidth: 360,
    minWidthPx: 960,
  },
  ctx,
);
assert.ok(metrics.viewportOverflowPx > 0);
assert.equal(metrics.kind, "viewport");
assert.equal(pickOverflowKind(22, 0, 0, false), "viewport");

const flexScore = scoreWidthConstraint(
  "flex flex-nowrap gap-2 min-w-[12rem]",
  {
    width: "auto",
    minWidth: "192px",
    maxWidth: "none",
    flexBasis: "auto",
    flexGrow: "0",
    flexShrink: "1",
    display: "flex",
    overflow: "visible",
    overflowX: "visible",
    position: "static",
    transform: "none",
    marginLeft: "0px",
    marginRight: "0px",
    boxSizing: "border-box",
    whiteSpace: "normal",
    flexWrap: "nowrap",
  },
  300,
  500,
  500,
  ctx,
);
assert.ok(flexScore.score >= 8, `expected flex nowrap score, got ${flexScore.score}`);

const dom = new JSDOM(
  `<!DOCTYPE html><html><body>
    <main class="cab-app-shell main" style="width:360px;overflow:hidden">
      <div id="toolbar" class="flex flex-nowrap" style="width:500px;min-width:500px;display:flex;flex-wrap:nowrap">
        <span id="leaf" style="width:420px;display:inline-block">leaf</span>
      </div>
    </main>
  </body></html>`,
  { pretendToBeVisual: true },
);

const { window } = dom;
const main = window.document.querySelector("main")!;
const leaf = window.document.getElementById("leaf")!;
const toolbar = window.document.getElementById("toolbar")!;

Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
Object.defineProperty(window, "getComputedStyle", {
  value: (el: Element) => {
    const htmlEl = el as HTMLElement;
    const style = htmlEl.style;
    return {
      width: style.width || "auto",
      minWidth: style.minWidth || "0px",
      maxWidth: style.maxWidth || "none",
      flexBasis: "auto",
      flexGrow: "0",
      flexShrink: "1",
      display: style.display || "block",
      overflow: style.overflow || "visible",
      overflowX: style.overflowX || "visible",
      position: "static",
      transform: "none",
      marginLeft: "0px",
      marginRight: "0px",
      boxSizing: "border-box",
      whiteSpace: "normal",
      flexWrap: style.flexWrap || "wrap",
    } as CSSStyleDeclaration;
  },
});

leaf.getBoundingClientRect = () =>
  ({
    left: 0,
    right: 420,
    width: 420,
    height: 20,
    top: 0,
    bottom: 20,
  }) as DOMRect;

toolbar.getBoundingClientRect = () =>
  ({
    left: 0,
    right: 500,
    width: 500,
    height: 40,
    top: 0,
    bottom: 40,
  }) as DOMRect;

main.getBoundingClientRect = () =>
  ({
    left: 0,
    right: 360,
    width: 360,
    height: 600,
    top: 0,
    bottom: 600,
  }) as DOMRect;

Object.defineProperty(leaf, "scrollWidth", { value: 420 });
Object.defineProperty(leaf, "clientWidth", { value: 360 });
Object.defineProperty(toolbar, "scrollWidth", { value: 500 });
Object.defineProperty(toolbar, "clientWidth", { value: 500 });

const jsdomCtx = { innerWidth: 390, mainRight: 360, mainClientWidth: 360 };
const promoted = promoteToRootElement(
  leaf as unknown as HTMLElement,
  main as unknown as HTMLElement,
  jsdomCtx,
);

assert.equal(promoted.element.id, "toolbar", "should promote leaf overflow to flex toolbar root");

console.log("overflow-root-cause-policy.test.ts OK");
