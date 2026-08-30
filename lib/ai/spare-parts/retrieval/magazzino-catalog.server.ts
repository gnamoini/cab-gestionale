import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PriceEvidence } from "@/lib/ai/spare-parts/types/schemas";
import {
  catalogPartMatches,
  catalogSearchTokens,
  escapeIlikeToken,
  scoreCatalogPartMatch,
} from "@/lib/ai/spare-parts/retrieval/catalog-text-match";

export type MagazzinoCatalogHit = {
  ricambioId: string;
  codice: string;
  nome: string;
  marca: string;
  prezzoVendita: number | null;
  costo: number | null;
  matchScore: number;
};

export async function queryMagazzinoCatalog(
  sb: SupabaseClient,
  input: {
    vehicleBrand?: string;
    description: string;
    additionalInfo?: string;
    limit?: number;
  },
): Promise<MagazzinoCatalogHit[]> {
  const limit = input.limit ?? 15;
  const tokens = catalogSearchTokens(input.description, input.additionalInfo);
  if (!tokens.length && !input.description.trim()) return [];

  let q = sb.from("magazzino_ricambi").select("id, codice, nome, marca, prezzo_vendita, costo").limit(250);
  if (input.vehicleBrand?.trim()) {
    q = q.ilike("marca", `%${escapeIlikeToken(input.vehicleBrand.trim())}%`);
  }
  if (tokens.length > 0) {
    const orParts = tokens.slice(0, 5).flatMap((t) => {
      const e = escapeIlikeToken(t);
      return [`nome.ilike.%${e}%`, `codice.ilike.%${e}%`];
    });
    q = q.or(orParts.join(","));
  } else {
    q = q.ilike("nome", `%${escapeIlikeToken(input.description.trim())}%`);
  }

  const { data: rows } = await q;
  if (!rows?.length) return [];

  const fullQuery = [input.description, input.additionalInfo].filter(Boolean).join(" ");
  const scored: MagazzinoCatalogHit[] = [];
  for (const row of rows) {
    const haystack = `${row.nome ?? ""} ${row.codice ?? ""} ${row.marca ?? ""}`;
    const matchScore = scoreCatalogPartMatch(haystack, tokens, [], fullQuery);
    if (!catalogPartMatches(matchScore, haystack, tokens)) continue;
    scored.push({
      ricambioId: row.id as string,
      codice: (row.codice as string) ?? "",
      nome: (row.nome as string) ?? "",
      marca: (row.marca as string) ?? "",
      prezzoVendita: typeof row.prezzo_vendita === "number" ? row.prezzo_vendita : null,
      costo: typeof row.costo === "number" ? row.costo : null,
      matchScore,
    });
  }

  scored.sort((a, b) => b.matchScore - a.matchScore);
  return scored.slice(0, limit);
}

export function magazzinoHitToPrice(hit: MagazzinoCatalogHit): PriceEvidence | null {
  const amount = hit.prezzoVendita ?? hit.costo;
  if (amount == null || !Number.isFinite(amount)) return null;
  return {
    amount,
    currency: "EUR",
    priceType: hit.prezzoVendita != null ? "list" : "unknown",
    sourceTitle: "Magazzino CAB",
  };
}
