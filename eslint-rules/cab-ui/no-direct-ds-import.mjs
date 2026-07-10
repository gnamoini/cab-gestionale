/** ESLint — direct design-system tooltip import outside allowlist */

const ALLOWLIST = [
  "components/ui/",
  "components/design-system/",
  "lib/ui/",
  "lib/regression/",
  "lib/lint/",
  "e2e/",
  "scripts/",
];

const MESSAGE = "[ui-contract] Import Tooltip from @/components/ui, not design-system directly";

function isAllowlisted(file) {
  const f = file.replace(/\\/g, "/");
  return ALLOWLIST.some((p) => f.includes(p));
}

/** @type {import('eslint').Rule.RuleModule} */
export const noDirectDsImport = {
  meta: {
    type: "problem",
    docs: { description: "Enforce @/components/ui barrel for Tooltip imports" },
    schema: [],
    messages: { directImport: MESSAGE },
  },
  create(context) {
    const filename = (context.filename ?? context.getFilename()).replace(/\\/g, "/");
    if (isAllowlisted(filename)) return {};

    return {
      ImportDeclaration(node) {
        const src = node.source?.value;
        if (typeof src !== "string") return;
        if (src !== "@/components/design-system" && src !== "@/components/design-system/tooltip") return;
        const hasTooltip = node.specifiers.some(
          (s) => s.type === "ImportSpecifier" && s.imported?.name === "Tooltip",
        );
        if (!hasTooltip) return;
        context.report({ node, messageId: "directImport" });
      },
    };
  },
};
