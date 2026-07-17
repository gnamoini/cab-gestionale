const HEAVY_MODULES = [
  "jspdf",
  "@react-pdf/renderer",
  "lodash",
  "moment",
  "chart.js",
  "recharts",
];

/** @type {import('eslint').Rule.RuleModule} */
export const noHeavyImportInClient = {
  meta: {
    type: "problem",
    docs: { description: "Block heavy static imports in client components" },
    schema: [],
    messages: {
      heavyImport: "Heavy module '{{name}}' must be lazy-loaded — use dynamic() or server-only path",
    },
  },
  create(context) {
    const source = context.sourceCode.getText();
    if (!source.includes('"use client"') && !source.includes("'use client'")) return {};
    return {
      ImportDeclaration(node) {
        const name = String(node.source.value);
        const base = name.split("/")[0];
        if (HEAVY_MODULES.some((h) => name === h || name.startsWith(`${h}/`) || base === h)) {
          context.report({ node, messageId: "heavyImport", data: { name } });
        }
      },
    };
  },
};
