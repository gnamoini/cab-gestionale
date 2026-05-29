import type { MezzoGestito } from "@/lib/mezzi/types";

function normIdent(v: string): string {
  return v.trim().toLowerCase();
}

function normScuderia(v: string): string {
  const n = normIdent(v);
  if (!n || n === "—") return "";
  return n;
}

/** Trova mezzo per targa o matricola (match esatto, case-insensitive). */
export function findMezzoByTargaOrMatricola(
  mezzi: readonly MezzoGestito[],
  targa: string,
  matricola: string,
): MezzoGestito | null {
  const t = normIdent(targa);
  const m = normIdent(matricola);
  if (t) {
    const hit = mezzi.find((x) => {
      const xt = x.targa?.trim();
      return xt && xt !== "—" && normIdent(xt) === t;
    });
    if (hit) return hit;
  }
  if (m && m !== "non assegnata") {
    const hit = mezzi.find((x) => {
      const xm = x.matricola?.trim();
      return xm && xm !== "—" && xm !== "Non assegnata" && normIdent(xm) === m;
    });
    if (hit) return hit;
  }
  return null;
}

/** Match esatto su targa, matricola o n. scuderia (anagrafica ingresso). */
export function findMezzoByIngressoIdent(
  mezzi: readonly MezzoGestito[],
  ident: { targa?: string; matricola?: string; nScuderia?: string },
): MezzoGestito | null {
  const byTm = findMezzoByTargaOrMatricola(mezzi, ident.targa ?? "", ident.matricola ?? "");
  if (byTm) return byTm;

  const ns = normScuderia(ident.nScuderia ?? "");
  if (!ns) return null;

  return (
    mezzi.find((x) => {
      const xs = normScuderia(x.numeroScuderia ?? "");
      return xs && xs === ns;
    }) ?? null
  );
}
