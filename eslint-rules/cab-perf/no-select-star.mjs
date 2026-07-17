/** @type {import('eslint').Rule.RuleModule} */
export const noSelectStar = {
  meta: {
    type: "problem",
    docs: { description: "Disallow select('*') in services — use table-select-columns SSOT" },
    schema: [],
    messages: {
      selectStar: "Avoid .select('*') — use explicit columns from lib/db/table-select-columns.ts",
    },
  },
  create(context) {
    const filename = context.filename.replace(/\\/g, "/");
    if (!/\/src\/services\/[^/]+\.service\.ts$/.test(filename)) return {};
    return {
      Literal(node) {
        if (node.value !== "*") return;
        const parent = node.parent;
        if (
          parent?.type === "CallExpression" &&
          parent.callee?.type === "MemberExpression" &&
          parent.callee.property?.name === "select"
        ) {
          context.report({ node, messageId: "selectStar" });
        }
      },
      TemplateLiteral(node) {
        if (node.quasis.length === 1 && node.quasis[0].value.cooked === "*") {
          const parent = node.parent;
          if (
            parent?.type === "CallExpression" &&
            parent.callee?.type === "MemberExpression" &&
            parent.callee.property?.name === "select"
          ) {
            context.report({ node, messageId: "selectStar" });
          }
        }
      },
    };
  },
};
