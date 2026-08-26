/** Estensione documenti — campi legacy opzionali per compatibilità lettura. */
export type DocumentoTipoFile = "pdf" | "immagine" | "excel" | "word" | "testo" | "altro";

/** Riferimento legacy a coppia marca / “macchina” (= modello nel catalogo vecchio). */
export interface DocumentoAssocRef {
  marcaId: string;
  macchinaId: string;
}

/** Dove vale il documento: intera marca o modello specifico. */
export type DocumentoApplicabilita = "marca" | "modello";
/** @deprecated Solo lettura legacy DB; non usare in UI nuova. */
export type DocumentoApplicabilitaLegacy = DocumentoApplicabilita | "macchina";

export interface DocumentoGestionale {
  id: string;
  nome: string;
  categoria: "manuali" | "listini" | "cataloghi" | "certificazioni" | "altro";
  /** Denormalizzato: prima destinazione o etichetta principale (ordinamento, compatibilità). */
  marca: string;
  /** Legacy: nel catalogo precedente conteneva il nome modello, non il mezzo. */
  macchina: string;
  tipoFile: DocumentoTipoFile;
  autoreCaricamento: string;
  note?: string;
  ultimaModifica: string;
  caricatoIl: string;
  dimensioneKb: number;
  /**
   * Nuova applicabilità (preferita). Se assente si deduce da `categoria` + legacy `associazioni` / marca-macchina.
   */
  applicabilita?: DocumentoApplicabilita;
  /** Marca (testo, allineato a Impostazioni → Mezzi → Marche). */
  marcaKey?: string;
  /** Modello (testo, allineato a Impostazioni → Modelli). Obbligatorio se applicabilità «modello». */
  modelloKey?: string;
  /** @deprecated Non più usato: i documenti non si legano al singolo mezzo. */
  mezzoId?: string;
  /** Destinazioni archivio legacy (multi‑modello). Se presente e `applicabilita` assente, viene migrato. */
  associazioni?: DocumentoAssocRef[];
  /** Se URL http(s), il nome file può aprire in nuova scheda. */
  urlDocumento?: string;
  /** Object URL (`blob:...`) da file caricato in sessione; revocare con `URL.revokeObjectURL` quando il documento viene eliminato. */
  urlBlob?: string;
  /** Estensione file, es. `.pdf` (opzionale, da upload o nome). */
  fileEstensione?: string;
  /** MIME type originale (persistenza meta, opzionale). */
  mimeType?: string;
  /** Ricambi AI: indicizzazione catalogo per identificazione ricambi. */
  aiSparePartsEnabled?: boolean;
  aiPriceEnabled?: boolean;
  aiDocumentKind?: "spare_parts_catalog" | "price_list" | "oem_manual" | "exploded_view" | "other";
  aiSourceType?: "oem" | "distributor" | "internal";
  aiYear?: string;
  aiLanguage?: string;
  /** Thumbnail available (stored key or PDF/image type). */
  hasPreview?: boolean;
  /** Cache-buster for preview/delivery URLs. */
  contentVersion?: string;
  /** Legacy — non più usati in UI Documenti */
  entitaTipo?: "macchina" | "azienda" | "lavorazione";
  entitaLabel?: string;
}
