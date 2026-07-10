import assert from "node:assert/strict";
import {
  inferMagazzinoCategoriaHeuristic,
  resolveMagazzinoCategoriaFallback,
  resolveMagazzinoCategoriaFromMaster,
} from "@/lib/magazzino/magazzino-categoria-infer";

const CATEGORIES = ["Generale", "Freni", "Filtri", "Olio e lubrificanti", "Sospensioni", "Elettrico"];

assert.equal(resolveMagazzinoCategoriaFallback(CATEGORIES), "Generale");
assert.equal(resolveMagazzinoCategoriaFallback([]), "Generale");

{
  const r = inferMagazzinoCategoriaHeuristic("PASTIGLIE FRENO ANTERIORI", CATEGORIES);
  assert.equal(r.categoria, "Freni");
  assert.ok(r.confidence > 0.5);
  assert.equal(r.source, "heuristic");
}

{
  const r = inferMagazzinoCategoriaHeuristic("FILTRO OLIO MOTORE", CATEGORIES);
  assert.equal(r.categoria, "Filtri");
  assert.ok(r.confidence > 0);
}

{
  const r = inferMagazzinoCategoriaHeuristic("VITE M6", CATEGORIES);
  assert.equal(r.categoria, "Generale");
  assert.equal(r.confidence, 0);
  assert.equal(r.source, "fallback");
}

{
  const r = inferMagazzinoCategoriaHeuristic("AMMORTIZZATORE ANTERIORE", CATEGORIES);
  assert.equal(r.categoria, "Sospensioni");
}

assert.equal(resolveMagazzinoCategoriaFromMaster("freni", CATEGORIES), "Freni");
assert.equal(resolveMagazzinoCategoriaFromMaster("Inventata", CATEGORIES), "Generale");

console.log("magazzino-categoria-infer.test.ts OK");
