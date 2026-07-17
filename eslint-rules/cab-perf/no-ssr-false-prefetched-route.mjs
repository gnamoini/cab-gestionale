/** @type {import('eslint').Rule.RuleModule} */
export const noSsrFalsePrefetchedRoute = {
  meta: {
    type: "problem",
    docs: { description: "Disallow ssr:false on SSR-prefetched report views" },
    schema: [],
    messages: {
      ssrFalse: "ssr:false breaks SSR prefetch contract on report views",
    },
  },
  create(context) {
    const filename = context.filename.replace(/\\/g, "/");
    if (!/\/components\/gestionale\/report\//.test(filename)) return {};
    return {
      Property(node) {
        if (
          node.key?.type === "Identifier" &&
          node.key.name === "ssr" &&
          node.value?.type === "Literal" &&
          node.value.value === false
        ) {
          context.report({ node, messageId: "ssrFalse" });
        }
      },
    };
  },
};
