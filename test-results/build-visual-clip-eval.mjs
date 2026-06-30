import fs from "node:fs";
const probe = fs.readFileSync("test-results/visual-clip-probe-snippet.js", "utf8");
const expr = `(async () => {
  await new Promise((r) => setTimeout(r, 6000));
  ${probe}
  return window.__cabVisualClipAudit ? window.__cabVisualClipAudit() : { error: "probe not registered" };
})()`;
fs.writeFileSync("test-results/visual-clip-probe-eval.txt", expr);
console.log("bytes", expr.length);
