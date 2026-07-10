/**
 * AST scan: native HTML title attribute (hover tooltip).
 * SSOT for audit + ESLint adapter.
 */

import ts from "typescript";
import { TOOLTIP_CONTRACT } from "@/lib/ui-design-system-lock/component-contracts";

export type NativeTitleViolation = {
  file: string;
  line: number;
  column: number;
  element: string;
  message: string;
  fix: string;
};

const HTML_TAGS_WITH_TITLE_BAN = new Set([
  "button",
  "span",
  "td",
  "th",
  "a",
  "div",
  "input",
  "textarea",
  "label",
  "img",
  "svg",
]);

const DISABLE_COMMENT_RE =
  /ui-contract-disable-next-line\s+native-title-tooltip:\s*(.{10,})/;

function lineCol(sourceFile: ts.SourceFile, pos: number): { line: number; column: number } {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
  return { line: line + 1, column: character + 1 };
}

function hasTitleAttr(attrs: ts.JsxAttributes): boolean {
  return attrs.properties.some((p) => {
    if (!ts.isJsxAttribute(p)) return false;
    const name = p.name.getText();
    if (name !== "title") return false;
    if (!p.initializer) return true;
    if (ts.isStringLiteral(p.initializer)) return p.initializer.text.length > 0;
    if (ts.isJsxExpression(p.initializer) && p.initializer.expression) {
      const expr = p.initializer.expression;
      if (expr.kind === ts.SyntaxKind.Identifier && expr.getText() === "undefined") return false;
      return true;
    }
    return true;
  });
}

function isDisabledByComment(sourceFile: ts.SourceFile, line: number): string | null {
  const lines = sourceFile.text.split(/\r?\n/);
  const prev = lines[line - 2] ?? "";
  const match = prev.match(DISABLE_COMMENT_RE);
  return match ? match[1].trim() : null;
}

export function scanNativeTitleInSource(
  fileRel: string,
  content: string,
): { violations: NativeTitleViolation[]; exceptions: { file: string; line: number; reason: string }[] } {
  const violations: NativeTitleViolation[] = [];
  const exceptions: { file: string; line: number; reason: string }[] = [];
  const kind = fileRel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(fileRel, content, ts.ScriptTarget.Latest, true, kind);

  function visit(node: ts.Node) {
    const opening =
      ts.isJsxElement(node)
        ? node.openingElement
        : ts.isJsxSelfClosingElement(node)
          ? node
          : null;

    if (opening && ts.isIdentifier(opening.tagName)) {
      const tag = opening.tagName.text;
      if (HTML_TAGS_WITH_TITLE_BAN.has(tag) && hasTitleAttr(opening.attributes)) {
        const { line, column } = lineCol(sourceFile, opening.getStart());
        const reason = isDisabledByComment(sourceFile, line);
        if (reason) {
          exceptions.push({ file: fileRel, line, reason });
        } else {
          violations.push({
            file: fileRel,
            line,
            column,
            element: tag,
            message: `Native title on <${tag}>`,
            fix: `Use ${TOOLTIP_CONTRACT.consumerImportPath} Tooltip or TruncatedTextTooltip`,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { violations, exceptions };
}
