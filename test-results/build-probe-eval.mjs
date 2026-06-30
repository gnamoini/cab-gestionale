import fs from "node:fs";
const probe = fs.readFileSync("test-results/overflow-runtime-probe-oneline.js", "utf8");
const expr = `(async () => {
  await new Promise((r) => setTimeout(r, 6000));
  ${probe}
  return runExtendedOverflowProbe();
})()`;
fs.writeFileSync("test-results/overflow-runtime-probe-eval.txt", expr);
console.log("eval bytes", expr.length);
