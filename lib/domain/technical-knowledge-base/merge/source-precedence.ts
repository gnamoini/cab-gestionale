/** Policy ufficiale precedenza sorgenti TKB (maggiore = vince in conflitto). */
export const TKB_SOURCE_PRECEDENCE: Record<string, number> = {
  description_generation: 100,
  suggestions_approved: 90,
  preventivi_consolidated: 80,
  schede_lavorazione: 70,
  lavorazioni_structured: 60,
  ricambi_componenti_map: 50,
  cataloghi_tecnici: 40,
  ricambi: 40,
  app_settings_liste: 40,
  mezzi_attrezzature: 30,
  text_enrichment: 20,
  seed: 10,
};

export function precedenceForSource(sourceId: string): number {
  return TKB_SOURCE_PRECEDENCE[sourceId] ?? 25;
}
