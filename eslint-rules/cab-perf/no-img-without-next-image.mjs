/** @type {import('eslint').Rule.RuleModule} */
export const noImgWithoutNextImage = {
  meta: {
    type: "suggestion",
    docs: { description: "Prefer next/image in gestionale components" },
    schema: [],
    messages: {
      useNextImage: "Use next/image for optimized loading in gestionale UI",
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        if (node.name?.type === "JSXIdentifier" && node.name.name === "img") {
          context.report({ node, messageId: "useNextImage" });
        }
      },
    };
  },
};
