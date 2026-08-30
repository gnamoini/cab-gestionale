import assert from "node:assert/strict";
import { buildExtractedPartPrice } from "./extracted-part-price";

assert.equal(buildExtractedPartPrice({ listPrice: 0, pageKind: "price_list", sourceTitle: "Listino" }), null);
assert.equal(buildExtractedPartPrice({ pageKind: "table", sourceTitle: "Cat" }), null);

const listino = buildExtractedPartPrice({
  listPrice: 42.5,
  priceCurrency: "EUR",
  pageKind: "price_list",
  sourceTitle: "Listino 2024",
});
assert.ok(listino);
assert.equal(listino?.amount, 42.5);
assert.equal(listino?.priceType, "list");
assert.equal(listino?.sourceTitle, "Listino 2024");

const table = buildExtractedPartPrice({ listPrice: 10, pageKind: "table", sourceTitle: "Cat" });
assert.equal(table?.priceType, "unknown");

console.log("extracted-part-price.test.ts ok");
