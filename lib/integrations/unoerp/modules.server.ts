/** Moduli UnoERP — post discovery casbari (2026-09-03). */
export const UNOERP_MODULES = {
  preventivo: { module: "Produzione" as string | null, file: "preventivi" as string | null },
  consuntivo: { module: null as string | null, file: null as string | null },
  ddt: { module: "Magazzino" as string | null, file: "movimento" as string | null },
  customer: { module: "Base" as string | null, file: "clienti" as string | null },
  articoli: { module: "Magazzino", file: "articoli" },
  iva: { module: "Base", file: "iva" },
  uom: { module: "Base", file: "unita_misura" },
  sezionali: { module: "Amministrazione", file: "sezionali" },
} as const;
