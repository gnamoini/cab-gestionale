/** ESLint — native title on HTML elements (AST via typescript) */

import ts from "typescript";

const MESSAGE = "[ui-contract] Native title on HTML element — use @/components/ui Tooltip";
const HTML_TAGS = new Set(["button", "span", "td", "th", "a", "div", "input", "textarea", "label", "img", "svg"]);
const DISABLE_RE = /ui-contract-disable-next-line\s+native-title-tooltip:\s*.+/;

function hasTitle(attrs) {
  return attrs.properties.some((p) => {
    if (p.kind !== ts.SyntaxKind.JsxAttribute) return false;
    if (p.name.getText() !== "title") return false;
    if (!p.initializer) return true;
    if (p.initializer.kind === ts.SyntaxKind.StringLiteral) return p.initializer.text.length > 0;
    return true;
  });
}

function scanSource(text, filename) {
  const kind = filename.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true, kind);
  const hits = [];
  const lines = text.split(/\r?\n/);

  function visit(node) {
    const opening = node.kind === ts.SyntaxKind.JsxElement
      ? node.openingElement
      : node.kind === ts.SyntaxKind.JsxSelfClosingElement
        ? node
        : null;
    if (opening?.tagName?.kind === ts.SyntaxKind.Identifier) {
      const tag = opening.tagName.text;
      if (HTML_TAGS.has(tag) && hasTitle(opening.attributes)) {
        const pos = sf.getLineAndCharacterOfPosition(opening.getStart());
        const line = pos.line + 1;
        const prev = lines[pos.line - 1] ?? "";
        if (!DISABLE_RE.test(prev)) {
          hits.push({ line, column: pos.character + 1 });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return hits;
}

/** @type {import('eslint').Rule.RuleModule} */
export const noNativeTitleTooltip = {
  meta: {
    type: "problem",
    docs: { description: "Disallow native title on HTML elements for tooltips" },
    schema: [],
    messages: { nativeTitle: MESSAGE },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (!/\.(tsx|jsx)$/.test(filename)) return {};
    if (filename.includes("report-charts.tsx")) return {};

    return {
      Program(node) {
        const source = context.sourceCode.getText();
        const rel = filename.replace(/\\/g, "/");
        for (const hit of scanSource(source, rel)) {
          context.report({
            node,
            loc: { line: hit.line, column: hit.column },
            messageId: "nativeTitle",
          });
        }
      },
    };
  },
};
