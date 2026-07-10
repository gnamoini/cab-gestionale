/** ESLint — CSS hover tooltip patterns (WARN default via audit; error in strict) */

const PATTERNS = [
  /group-hover:[^\s"']*opacity/,
  /peer-hover:[^\s"']*opacity/,
  /tooltip-content/,
  /tooltip-wrapper/,
];

const MESSAGE = "[ui-contract] Suspect CSS tooltip pattern — use @/components/ui Tooltip";

/** @type {import('eslint').Rule.RuleModule} */
export const noCssTooltip = {
  meta: {
    type: "suggestion",
    docs: { description: "Discourage CSS-only tooltip patterns" },
    schema: [],
    messages: { cssTooltip: MESSAGE },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.name !== "className") return;
        const val = context.sourceCode.getText(node.value);
        for (const p of PATTERNS) {
          if (p.test(val) && !val.includes("ui-contract-disable")) {
            context.report({ node, messageId: "cssTooltip" });
            return;
          }
        }
      },
    };
  },
};
