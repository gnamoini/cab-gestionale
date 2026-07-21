/** Origine tecnica normalizzata per movimenti stock (R-24). */
export const STOCK_MOVEMENT_ORIGINS = [
  "manual_adjustment",
  "lavorazione",
  "ddt",
  "import",
  "inventario",
  "storno",
] as const;

export type StockMovementOrigin = (typeof STOCK_MOVEMENT_ORIGINS)[number];

export function isStockMovementOrigin(v: unknown): v is StockMovementOrigin {
  return typeof v === "string" && (STOCK_MOVEMENT_ORIGINS as readonly string[]).includes(v);
}
