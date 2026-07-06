/** @type {import('eslint').Rule.RuleModule} */
export const noAuthInServices = {
  meta: {
    type: "problem",
    docs: { description: "Services must not import RBAC permission guards" },
    schema: [],
    messages: {
      authInService: "src/services must be authorization-free — use lib/domain/*-entry.ts",
    },
  },
  create(context) {
    const filename = context.filename.replace(/\\/g, "/");
    if (!/\/src\/services\/[^/]+\.service\.ts$/.test(filename)) return {};
    return {
      ImportDeclaration(node) {
        const src = node.source.value;
        if (
          typeof src === "string" &&
          (src.includes("/auth/permission-guards") || src.includes("/auth/server-permission-guards"))
        ) {
          context.report({ node, messageId: "authInService" });
        }
      },
    };
  },
};
