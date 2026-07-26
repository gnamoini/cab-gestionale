import type { AttrezzaturaGestita } from "@/lib/attrezzature/types";
import type { MezzoGestito } from "@/lib/mezzi/types";

function normIdent(value: string | undefined | null): string {
  const t = value?.trim().toLowerCase();
  if (!t || t === "—" || t === "non assegnata") return "";
  return t;
}

/** Esclude righe attrezzature che replicano l'anagrafica principale del mezzo. */
export function attrezzaturaMirrorsMezzo(mezzo: MezzoGestito, a: AttrezzaturaGestita): boolean {
  const marcaOk = normIdent(mezzo.marca) === normIdent(a.marca);
  const modelloOk = normIdent(mezzo.modello) === normIdent(a.modello);
  const matMezzo = normIdent(mezzo.matricola);
  const matAtt = normIdent(a.matricola);
  const matOk = matMezzo === matAtt || (!matMezzo && !matAtt);
  const tipoOk =
    normIdent(mezzo.tipoAttrezzatura) === normIdent(a.tipoAttrezzatura) ||
    !normIdent(mezzo.tipoAttrezzatura) ||
    !normIdent(a.tipoAttrezzatura);
  return marcaOk && modelloOk && matOk && tipoOk;
}
