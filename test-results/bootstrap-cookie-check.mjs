import fs from "node:fs";
import path from "node:path";

const cookiePath = path.join("test-results", ".overflow-session-cookies.tmp");
// Written by collect bootstrap — do not commit
if (!fs.existsSync(cookiePath)) {
  console.error("Run bootstrap cookie export first");
  process.exit(1);
}
console.log("cookie ok", fs.statSync(cookiePath).size);
