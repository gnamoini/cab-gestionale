import fs from "node:fs";
import path from "node:path";

const dir = "components/design-system/loading";
const keepClient = new Set([
  "loading-overlay.tsx",
  "loading-state-message.tsx",
  "loading-progress-bar.tsx",
  "loading-upload-progress.tsx",
  "loading-button.tsx",
  "loading-spinner.tsx",
  "loading-error-state.tsx",
  "use-delayed-loading-message.ts",
]);

for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith(".tsx") || keepClient.has(f)) continue;
  const p = path.join(dir, f);
  let s = fs.readFileSync(p, "utf8");
  if (s.startsWith('"use client";\r\n\r\n')) {
    fs.writeFileSync(p, s.slice(16));
    console.log("stripped", f);
  } else if (s.startsWith('"use client";\n\n')) {
    fs.writeFileSync(p, s.slice(14));
    console.log("stripped", f);
  }
}
