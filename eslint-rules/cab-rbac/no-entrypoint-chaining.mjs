/** @type {import('eslint').Rule.RuleModule} */
export const noEntrypointChaining = {
  meta: {
    type: "problem",
    docs: { description: "*-entry.ts must not import another *-entry.ts" },
    schema: [],
    messages: {
      chained: "Entrypoint chaining forbidden — call the underlying service from one boundary only",
    },
  },
  create(context) {
    const filename = context.filename.replace(/\\/g, "/");
    if (!/\/lib\/domain\/[^/]+-entry\.tsx?$/.test(filename)) return {};
    return {
      ImportDeclaration(node) {
        const src = node.source.value;
        if (typeof src === "string" && /\/lib\/domain\/[^/]+-entry$/.test(src)) {
          context.report({ node, messageId: "chained" });
        }
      },
    };
  },
};
