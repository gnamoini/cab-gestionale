import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const helpersSrc = fs.readFileSync(
  path.join(ROOT, "components/gestionale/documenti/documenti-helpers.ts"),
  "utf8",
);
const viewSrc = fs.readFileSync(
  path.join(ROOT, "components/gestionale/documenti/documenti-view.tsx"),
  "utf8",
);
const mapperSrc = fs.readFileSync(
  path.join(ROOT, "lib/documenti/documenti-db-mapper.ts"),
  "utf8",
);

assert.match(helpersSrc, /getDocumentoFileAccessState/);
assert.match(helpersSrc, /resolveDocumentoFileUrlSignedResult/);
assert.doesNotMatch(
  helpersSrc,
  /canOpenDocumento[\s\S]{0,120}urlDocumento\?\.trim\(\)/,
  "canOpen must use access state not raw string presence",
);
assert.match(mapperSrc, /resolveDocumentoFileUrlSignedResult/);
assert.match(mapperSrc, /classifyDocumentoStorageOpenError/);
assert.match(viewSrc, /documentoFileUnavailableLabel/);
assert.match(viewSrc, /result\.message/);

console.log("documenti-file-access-policy.test.ts OK");
