import assert from "node:assert/strict";
import { wrapLines, maxCharsForWrap } from "@/lib/inventory-labels/render/layout";

const lines = wrapLines("alpha beta gamma delta epsilon zeta", 6, 10);
assert.ok(lines.length >= 3);
assert.ok(!lines.some((l) => l.includes("…")));

const foto = wrapLines("Sensore fotoelettrico M18", 4, maxCharsForWrap(24.5, 9.5));
assert.ok(foto.some((l) => l.includes("fotoelettrico")), `parola intera: ${JSON.stringify(foto)}`);
assert.ok(!foto.some((l) => l === "ico" || l === "fotoelettr"), `no split mid-word: ${JSON.stringify(foto)}`);

const m12 = wrapLines("Sensore fotoelettrico M12", 4, maxCharsForWrap(24.5, 9.5));
assert.ok(m12.some((l) => l === "M12" || l.endsWith(" M12") === false), `M12 su riga dedicata: ${JSON.stringify(m12)}`);
assert.ok(!m12.some((l) => l.includes("fotoelettrico M12")), `M12 a capo: ${JSON.stringify(m12)}`);

console.log("inventory-labels/render/layout.test.ts OK");
