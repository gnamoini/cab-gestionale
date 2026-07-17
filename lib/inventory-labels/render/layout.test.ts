import assert from "node:assert/strict";
import { wrapLines, wrapChars, wrapLabelLines, maxCharsForWrap, maxCharsForWidth, linesFitWrapWidth } from "@/lib/inventory-labels/render/layout";

const lines = wrapLines("alpha beta gamma delta epsilon zeta", 6, 10);
assert.ok(lines.length >= 3);
assert.ok(!lines.some((l) => l.includes("…")));

const foto = wrapLines("Sensore fotoelettrico M18", 4, maxCharsForWrap(24.5, 9.5));
assert.ok(foto.some((l) => l.includes("fotoelettrico")), `parola intera: ${JSON.stringify(foto)}`);
assert.ok(!foto.some((l) => l === "ico" || l === "fotoelettr"), `no split mid-word: ${JSON.stringify(foto)}`);

const m12 = wrapLines("Sensore fotoelettrico M12", 4, maxCharsForWrap(24.5, 9.5));
assert.ok(m12.some((l) => l === "M12" || l.endsWith(" M12") === false), `M12 su riga dedicata: ${JSON.stringify(m12)}`);
assert.ok(!m12.some((l) => l.includes("fotoelettrico M12")), `M12 a capo: ${JSON.stringify(m12)}`);

const code = wrapChars("8FSNS030000001 (BTE)", 4, 8);
assert.ok(code.length >= 2, "codice lungo va a capo");
assert.equal(code.join(""), "8FSNS030000001 (BTE)");
assert.ok(code.every((l) => l.length <= 8));

const shortCodice = wrapLabelLines("ABC (BTE)", 4, 20, "codice");
assert.deepEqual(shortCodice, ["ABC (BTE)"], "marca sulla stessa riga se entra");

const tailMarca = wrapLabelLines("ABCD0123 (BTE)", 4, 14, "codice");
assert.deepEqual(tailMarca, ["ABCD0123 (BTE)"], "marca sul residuo codice se entra");

const borderline = wrapLabelLines(
  "ABCDEFGH (BTE)",
  4,
  maxCharsForWrap(24.1, 7, "mono"),
  "codice",
  maxCharsForWidth(24.1, 7, "mono"),
);
assert.deepEqual(borderline, ["ABCDEFGH (BTE)"], "marca resta sulla riga se entra nella larghezza reale");

const mixed = wrapLabelLines("8FSNS030000001 (BTE)", 4, 8, "codice");
assert.equal(`${mixed.slice(0, -1).join("")} ${mixed[mixed.length - 1]}`, "8FSNS030000001 (BTE)");
assert.ok(mixed.some((l) => l.includes("(BTE)")), "marca presente");
assert.ok(mixed.every((l) => !/\([^)]*$/.test(l) || l.endsWith(")")), "marca non spezzata");

const overflow = wrapLines("uno due tre quattro cinque sei sette otto nove dieci", 2, 8);
assert.ok(overflow.length <= 2);
assert.ok(overflow[overflow.length - 1]!.includes("…"), `ellipsis su overflow: ${JSON.stringify(overflow)}`);

console.log("inventory-labels/render/layout.test.ts OK");
