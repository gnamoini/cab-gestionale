import type { CatalogMarca } from "@/lib/documenti/documenti-catalog-types";
import type { DocumentoAssocRef, DocumentoGestionale, DocumentoApplicabilita } from "@/lib/types/gestionale";

/** Tutte le categorie supportano marca intera o modello specifico. */
export function allowedApplicabilitaForCategoria(
  _c: DocumentoGestionale["categoria"],
): DocumentoApplicabilita[] {
  return ["marca", "modello"];
}

export function defaultApplicabilitaForCategoria(c: DocumentoGestionale["categoria"]): DocumentoApplicabilita {
  if (c === "listini" || c === "cataloghi") return "marca";
  return "modello";
}

function inferApplicabilitaFromRow(doc: DocumentoGestionale, marcaNome: string, modelloLegacy: string): DocumentoApplicabilita {
  if (doc.categoria === "listini") return "marca";
  const hasModel = modelloLegacy.length > 0 && modelloLegacy !== "—";
  if (doc.categoria === "cataloghi") return hasModel ? "modello" : "marca";
  if (doc.categoria === "manuali") return hasModel ? "modello" : "marca";
  return hasModel ? "modello" : "marca";
}

const MARCA_NON_ASSEGNATA = new Set(["", "—", "-", "n/a", "na"]);

function marcaAssegnataText(raw: string): boolean {
  const t = raw.trim().toLowerCase();
  return t.length > 0 && !MARCA_NON_ASSEGNATA.has(t);
}

/** Risolve applicabilità e chiavi testuali (marca / modello) con fallback legacy. */
export function resolveDocumentoApplicazione(doc: DocumentoGestionale, catalog?: CatalogMarca[]): DocumentoGestionale {
  const marcaNome = (doc.marcaKey ?? doc.marca).trim() || doc.marca?.trim() || "";
  const modelloLegacy = (doc.modelloKey ?? doc.macchina).trim();

  if (!marcaAssegnataText(marcaNome)) {
    return {
      ...doc,
      applicabilita: doc.applicabilita,
      marcaKey: undefined,
      modelloKey: undefined,
      mezzoId: undefined,
      marca: "",
      macchina: "—",
    };
  }

  let applicabilita = doc.applicabilita;
  const legacyApp = (doc as { applicabilita?: string }).applicabilita;
  if (legacyApp === "macchina") {
    applicabilita = modelloLegacy && modelloLegacy !== "—" ? "modello" : "marca";
  }

  if (applicabilita && marcaNome) {
    const mk = marcaNome;
    const mod = applicabilita === "marca" ? undefined : modelloLegacy || undefined;
    return {
      ...doc,
      applicabilita,
      marcaKey: mk,
      modelloKey: mod,
      mezzoId: undefined,
      marca: mk,
      macchina: applicabilita === "marca" ? "—" : mod ?? "—",
    };
  }

  const inferred = inferApplicabilitaFromRow(doc, marcaNome, modelloLegacy);

  if (doc.categoria === "listini") {
    return {
      ...doc,
      applicabilita: "marca",
      marcaKey: marcaNome,
      modelloKey: undefined,
      mezzoId: undefined,
      marca: marcaNome,
      macchina: "—",
    };
  }

  if (doc.categoria === "cataloghi") {
    const hasModel = modelloLegacy.length > 0 && modelloLegacy !== "—";
    if (hasModel) {
      return {
        ...doc,
        applicabilita: "modello",
        marcaKey: marcaNome,
        modelloKey: modelloLegacy,
        mezzoId: undefined,
        marca: marcaNome,
        macchina: modelloLegacy,
      };
    }
    return {
      ...doc,
      applicabilita: "marca",
      marcaKey: marcaNome,
      modelloKey: undefined,
      mezzoId: undefined,
      marca: marcaNome,
      macchina: "—",
    };
  }

  if (doc.categoria === "manuali") {
    const hasModel = modelloLegacy.length > 0 && modelloLegacy !== "—";
    return {
      ...doc,
      applicabilita: hasModel ? "modello" : inferred,
      marcaKey: marcaNome,
      modelloKey: hasModel ? modelloLegacy : undefined,
      mezzoId: undefined,
      marca: marcaNome,
      macchina: hasModel ? modelloLegacy : "—",
    };
  }

  const hasAssoc = doc.associazioni && doc.associazioni.length > 0 && catalog?.length;
  if (hasAssoc && catalog) {
    const first = doc.associazioni![0]!;
    const mar = catalog.find((m) => m.id === first.marcaId);
    const mac = mar?.macchine.find((x) => x.id === first.macchinaId);
    if (mar && mac) {
      return {
        ...doc,
        applicabilita: "modello",
        marcaKey: mar.nome,
        modelloKey: mac.nome,
        mezzoId: undefined,
        marca: mar.nome,
        macchina: mac.nome,
      };
    }
  }

  const hasModel = modelloLegacy.length > 0 && modelloLegacy !== "—";
  return {
    ...doc,
    applicabilita: inferred,
    marcaKey: marcaNome || "—",
    modelloKey: hasModel ? modelloLegacy : undefined,
    mezzoId: undefined,
    marca: marcaNome || "—",
    macchina: hasModel ? modelloLegacy : "—",
  };
}

export function labelApplicabilitaBreve(a: DocumentoApplicabilita): string {
  switch (a) {
    case "marca":
      return "MARCA";
    case "modello":
      return "MODELLO";
    default:
      return a;
  }
}

/** Riga sintetica tipo "LISTINO — MERCEDES" o "MANUALE — MERCEDES ACTROS". */
export function formatDocumentoRigaSintetica(doc: DocumentoGestionale): string {
  const cat =
    doc.categoria === "listini"
      ? "LISTINO"
      : doc.categoria === "cataloghi"
        ? "CATALOGO"
        : doc.categoria === "manuali"
          ? "MANUALE"
          : "ALTRO";
  const r = resolveDocumentoApplicazione(doc);
  const m = r.marcaKey?.trim() || r.marca.trim();
  if (!marcaAssegnataText(m)) return `${cat} — Senza marca`;
  if (r.applicabilita === "marca") return `${cat} — ${m}`;
  const mod = r.modelloKey?.trim() || r.macchina.trim();
  return `${cat} — ${m} ${mod}`.replace(/\s+/g, " ").trim();
}

export function legacyAssocRefs(doc: DocumentoGestionale, catalog: CatalogMarca[]): DocumentoAssocRef[] {
  if (doc.associazioni && doc.associazioni.length > 0) return doc.associazioni;
  const mar = catalog.find((m) => m.nome === doc.marca);
  if (!mar) return [];
  const mac = mar.macchine.find((x) => x.nome === doc.macchina);
  if (!mac) return [];
  return [{ marcaId: mar.id, macchinaId: mac.id }];
}
