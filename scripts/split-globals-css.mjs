import fs from "node:fs";

const src = fs.readFileSync("app/globals.css", "utf8");
const lines = src.split(/\n/);

const shellRanges = [
  [5, 7],
  [488, 490],
  [627, 825],
  [827, 847],
  [906, 1325],
];

const shellLineSet = new Set();
for (const [a, b] of shellRanges) {
  for (let i = a; i <= b; i++) shellLineSet.add(i);
}

const core = [];
const shell = ["/* Gestionale app shell + sidebar — scoped to (gestionale) layout */", ""];
for (let i = 1; i <= lines.length; i++) {
  const line = lines[i - 1];
  if (shellLineSet.has(i)) shell.push(line);
  else core.push(line);
}

fs.writeFileSync("app/globals-gestionale-shell.css", shell.join("\n"));
fs.writeFileSync("app/globals-core.css", core.join("\n"));
fs.writeFileSync("app/globals.css", '@import "./globals-core.css";\n');
console.log("core lines", core.length, "shell lines", shell.length);
