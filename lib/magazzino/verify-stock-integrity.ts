import type { MagazzinoRicambioRow, MovimentoRicambioRow, TipoMovimentoRicambio } from "@/src/types/supabase-tables";

export type StockIntegrityRow = {
  ricambioId: string;
  codice: string;
  nome: string;
  quantita: number;
  expectedFromMovements: number | null;
  drift: number | null;
  coherent: boolean | null;
  movementCount: number;
};

function movementDelta(tipo: TipoMovimentoRicambio, quantita: number): number {
  const q = Math.max(0, Number(quantita) || 0);
  return tipo === "entrata" ? q : -q;
}

/** Ledger diagnostico — non usare come SSOT runtime (R-12 / R-23). */
export function computeExpectedQuantityFromMovements(
  initialQuantity: number,
  movements: ReadonlyArray<Pick<MovimentoRicambioRow, "tipo" | "quantita">>,
): number {
  let total = Math.max(0, Math.round(initialQuantity));
  for (const m of movements) {
    total += movementDelta(m.tipo, m.quantita);
  }
  return Math.max(0, total);
}

export function buildStockIntegrityRow(input: {
  ricambio: Pick<MagazzinoRicambioRow, "id" | "codice" | "nome" | "quantita">;
  movements: ReadonlyArray<Pick<MovimentoRicambioRow, "tipo" | "quantita">>;
  /** Giacenza al create senza movimento iniziale (import/legacy). */
  baselineQuantity?: number;
}): StockIntegrityRow {
  const actual = Math.max(0, Math.round(Number(input.ricambio.quantita) || 0));
  const movementCount = input.movements.length;

  if (movementCount === 0) {
    return {
      ricambioId: input.ricambio.id,
      codice: input.ricambio.codice,
      nome: input.ricambio.nome,
      quantita: actual,
      expectedFromMovements: null,
      drift: null,
      coherent: null,
      movementCount: 0,
    };
  }

  const baseline = input.baselineQuantity ?? 0;
  const expected = computeExpectedQuantityFromMovements(baseline, input.movements);
  const drift = actual - expected;
  return {
    ricambioId: input.ricambio.id,
    codice: input.ricambio.codice,
    nome: input.ricambio.nome,
    quantita: actual,
    expectedFromMovements: expected,
    drift,
    coherent: drift === 0,
    movementCount,
  };
}

export function formatStockIntegrityReport(rows: StockIntegrityRow[]): string {
  const lines = rows.map((r) => {
    if (r.coherent == null) {
      return `${r.codice} — quantita: ${r.quantita} — movimenti: 0 — coerenza: N/D`;
    }
    if (r.coherent) {
      return `${r.codice} — quantita: ${r.quantita} — coerente: SI`;
    }
    return `${r.codice} — quantita: ${r.quantita} — DRIFT: ${r.drift! >= 0 ? "+" : ""}${r.drift}`;
  });
  return lines.join("\n");
}
