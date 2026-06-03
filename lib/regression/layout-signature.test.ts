/**
 * Visual Layout Linter — layout signature unit tests (no jsdom).
 */
import assert from "node:assert/strict";
import {
  classifyTableDensity,
  extractFlexGroupSignatureFromStyles,
  extractModalSignatureFromStyles,
  extractTableSignatureFromStyles,
  extractToolbarSignatureFromStyles,
  parsePx,
  styleSnapshotFromDeclaration,
} from "@/lib/ui-visual-linter/layout-signature";

function stubStyle(partial: Record<string, string>): CSSStyleDeclaration {
  return partial as unknown as CSSStyleDeclaration;
}

assert.equal(parsePx("8px"), 8);
assert.equal(parsePx("0.5rem"), 8);
assert.equal(parsePx("auto"), 0);
assert.equal(parsePx(""), 0);

assert.equal(classifyTableDensity(56, 4), "normal");
assert.equal(classifyTableDensity(40, 4), "compact");
assert.equal(classifyTableDensity(50, 8), "mixed");

const toolbarRow = styleSnapshotFromDeclaration(
  stubStyle({
    display: "flex",
    flexDirection: "row",
    gap: "12px",
    alignItems: "center",
    justifyContent: "flex-start",
    flexWrap: "nowrap",
    flexGrow: "0",
    flexShrink: "1",
    minWidth: "auto",
    paddingTop: "0",
    paddingBottom: "0",
    paddingLeft: "0",
    paddingRight: "0",
    height: "auto",
    position: "static",
  }),
);

const searchStyle = styleSnapshotFromDeclaration(
  stubStyle({ flexGrow: "1", flexShrink: "1", minWidth: "0" } as Record<string, string>),
);

const toolbarSig = extractToolbarSignatureFromStyles(
  "div.toolbar",
  toolbarRow,
  "flex-safe-row gap-3",
  searchStyle,
  styleSnapshotFromDeclaration(stubStyle({ flexShrink: "0" } as Record<string, string>)),
);

assert.equal(toolbarSig.gapPx, 12);
assert.equal(toolbarSig.layout, "row");
assert.equal(toolbarSig.searchFlexGrow, 1);
assert.equal(toolbarSig.actionsShrink, true);

const thStyle = styleSnapshotFromDeclaration(
  stubStyle({
    paddingTop: "8px",
    paddingBottom: "8px",
    paddingLeft: "10px",
    paddingRight: "10px",
  } as Record<string, string>),
);
const tdStyle = styleSnapshotFromDeclaration(
  stubStyle({ paddingTop: "4px", paddingBottom: "4px", paddingLeft: "8px", paddingRight: "8px" } as Record<string, string>),
);
const rowStyle = styleSnapshotFromDeclaration(stubStyle({ height: "56px" } as Record<string, string>));

const tableSig = extractTableSignatureFromStyles("table.list", thStyle, tdStyle, rowStyle, false);
assert.equal(tableSig.density, "normal");
assert.equal(tableSig.thPaddingY, 8);
assert.equal(tableSig.tdPaddingY, 4);

const headerStyle = styleSnapshotFromDeclaration(
  stubStyle({ paddingTop: "12px", paddingBottom: "12px", alignItems: "center" } as Record<string, string>),
);
const bodyStyle = styleSnapshotFromDeclaration(
  stubStyle({ paddingTop: "16px", paddingLeft: "16px" } as Record<string, string>),
);
const footerStyle = styleSnapshotFromDeclaration(stubStyle({ justifyContent: "flex-end" } as Record<string, string>));

const modalSig = extractModalSignatureFromStyles("div.modal", headerStyle, bodyStyle, footerStyle);
assert.equal(modalSig.headerPaddingY, 12);
assert.equal(modalSig.bodyPadding, 16);
assert.equal(modalSig.footerJustify, "flex-end");

const flexStyle = styleSnapshotFromDeclaration(
  stubStyle({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    minWidth: "0px",
  } as Record<string, string>),
);
const flexSig = extractFlexGroupSignatureFromStyles("div.flex", flexStyle, "flex min-w-0", 2);
assert.equal(flexSig.hasMinW0, true);
assert.equal(flexSig.nestingDepth, 2);

console.log("layout-signature.test.ts OK");
