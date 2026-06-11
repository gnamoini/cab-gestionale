import assert from "node:assert/strict";
import { rankOptions } from "@/lib/selector-core/selector-rank";

const getValue = (s: string) => s;
const getLabel = (s: string) => s;
const scoreFn = (q: string, label: string) =>
  label.toLowerCase().includes(q.toLowerCase()) ? 10 : 0;

{
  const items = ["Zebra", "Alpha", "Beta", "Gamma"];
  const params = {
    items,
    getValue,
    getLabel,
    selectedValue: "Beta",
    recentValues: ["Alpha", "gamma"],
    query: "a",
    scoreFn,
  };
  const first = rankOptions(params);
  for (let i = 0; i < 100; i++) {
    assert.deepEqual(rankOptions(params), first);
  }
}

{
  const items = ["Zebra", "Alpha recent", "Beta"];
  const ranked = rankOptions({
    items,
    getValue,
    getLabel,
    selectedValue: "",
    recentValues: ["alpha recent"],
    query: "",
  });
  assert.equal(ranked[0], "Alpha recent");
}

{
  const items = ["Zebra", "Alpha", "Beta"];
  const ranked = rankOptions({
    items,
    getValue,
    getLabel,
    selectedValue: "Zebra",
    recentValues: ["Alpha"],
    query: "a",
    scoreFn,
  });
  assert.equal(ranked[0], "Zebra");
}

console.log("selector-rank.test.ts OK");
