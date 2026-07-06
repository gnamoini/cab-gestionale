/** @type {import('eslint').Rule.RuleModule} */
export const noEnsureWorkflowWrite = {
  meta: {
    type: "problem",
    docs: { description: "ensureWorkflowWrite is forbidden — use ensurePageWrite" },
    schema: [],
    messages: {
      forbidden: "Use ensurePageWrite(page) after resolveWorkflowPage — not ensureWorkflowWrite",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type === "Identifier" && node.callee.name === "ensureWorkflowWrite") {
          context.report({ node, messageId: "forbidden" });
        }
      },
    };
  },
};
