import fs from "node:fs";
const s = fs.readFileSync("test-results/overflow-runtime-probe-snippet.js", "utf8");
const one = s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\n+/g, " ");
fs.writeFileSync("test-results/overflow-runtime-probe-oneline.js", one);
console.log("bytes", one.length);
