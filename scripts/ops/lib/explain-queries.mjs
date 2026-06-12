export const SAMPLE_CLIENTE = "Specchia";

/** @param {string} cliente */
export function buildExplainQueries(cliente = SAMPLE_CLIENTE) {
  const clienteEsc = cliente.replace(/'/g, "''");
  return [
    {
      id: "Q1",
      screen: "lavorazioni",
      label: "lista_attive",
      sql: `SELECT id FROM public.lavorazioni WHERE deleted_at IS NULL AND archived = false ORDER BY created_at DESC`,
      expectedIndex: "idx_lavorazioni_active_archived_created | idx_lavorazioni_stato_archived_created",
    },
    {
      id: "Q2",
      screen: "lavorazioni",
      label: "lista_archivio",
      sql: `SELECT id FROM public.lavorazioni WHERE deleted_at IS NULL AND archived = true ORDER BY created_at DESC`,
      expectedIndex: "idx_lavorazioni_active_archived_created",
    },
    {
      id: "Q3",
      screen: "lavorazioni",
      label: "search_codice_trgm",
      sql: `SELECT id FROM public.lavorazioni WHERE deleted_at IS NULL AND codice ILIKE '%26-00%'`,
      expectedIndex: "idx_lavorazioni_codice_trgm",
    },
    {
      id: "Q4",
      screen: "lavorazioni",
      label: "search_note_trgm",
      sql: `SELECT id FROM public.lavorazioni WHERE deleted_at IS NULL AND note ILIKE '%test%'`,
      expectedIndex: "idx_lavorazioni_note_trgm",
    },
    {
      id: "Q5",
      screen: "lavorazioni",
      label: "filter_priorita",
      sql: `SELECT id FROM public.lavorazioni WHERE deleted_at IS NULL AND priorita = 'media'`,
      expectedIndex: "idx_lavorazioni_priorita",
    },
    {
      id: "Q6",
      screen: "lavorazioni",
      label: "stato_archived_sort",
      sql: `SELECT id FROM public.lavorazioni WHERE deleted_at IS NULL AND stato = 'accettazione' AND archived = false ORDER BY created_at DESC`,
      expectedIndex: "idx_lavorazioni_stato_archived_created",
    },
    {
      id: "Q7",
      screen: "mezzi",
      label: "lista",
      sql: `SELECT id FROM public.mezzi ORDER BY created_at DESC`,
      expectedIndex: "(seq scan acceptable on small dataset)",
    },
    {
      id: "Q8",
      screen: "mezzi",
      label: "cliente_eq",
      sql: `SELECT id FROM public.mezzi WHERE cliente = '${clienteEsc}'`,
      expectedIndex: "idx_mezzi_cliente_btree",
    },
    {
      id: "Q9",
      screen: "magazzino",
      label: "lista_codice",
      sql: `SELECT id FROM public.magazzino_ricambi ORDER BY codice ASC`,
      expectedIndex: "idx_magazzino_ricambi_codice",
    },
    {
      id: "Q10",
      screen: "magazzino",
      label: "search_nome_trgm",
      sql: `SELECT id FROM public.magazzino_ricambi WHERE nome ILIKE '%filtro%'`,
      expectedIndex: "idx_magazzino_ricambi_nome_trgm",
    },
    {
      id: "Q11",
      screen: "report",
      label: "movimenti_list",
      sql: `SELECT id FROM public.movimenti_ricambi ORDER BY created_at DESC`,
      expectedIndex: "idx_movimenti_ricambi_created_at",
    },
    {
      id: "Q12",
      screen: "report",
      label: "movimenti_per_ricambio",
      sql: `SELECT id FROM public.movimenti_ricambi WHERE ricambio_id = (SELECT id FROM public.magazzino_ricambi LIMIT 1) ORDER BY created_at DESC`,
      expectedIndex: "idx_movimenti_ricambi_ricambio_created",
    },
    {
      id: "Q13",
      screen: "schede",
      label: "batch_by_lavorazione_ids",
      sql: `SELECT id, lavorazione_id FROM public.scheda_lavorazione WHERE lavorazione_id IN (SELECT id FROM public.lavorazioni WHERE deleted_at IS NULL LIMIT 20)`,
      expectedIndex: "scheda_lavorazione_lavorazione_id (FK/index)",
    },
    {
      id: "Q14",
      screen: "preventivi",
      label: "lista_with_mezzo_fk",
      sql: `SELECT p.id, p.mezzo_id FROM public.preventivi p ORDER BY p.created_at DESC`,
      expectedIndex: "preventivi_mezzo_id (FK)",
    },
    {
      id: "Q15",
      screen: "hub_mezzo",
      label: "movimenti_join_mezzo",
      sql: `SELECT m.id FROM public.movimenti_ricambi m INNER JOIN public.lavorazioni l ON l.id = m.lavorazione_id WHERE l.mezzo_id = (SELECT id FROM public.mezzi LIMIT 1) ORDER BY m.created_at DESC`,
      expectedIndex: "lavorazioni(mezzo_id) + movimenti(lavorazione_id)",
    },
    {
      id: "Q16",
      screen: "hub",
      label: "log_modifiche_entita",
      sql: `SELECT lm.id FROM public.log_modifiche lm WHERE lm.entita = 'lavorazioni' AND lm.entita_id IS NOT NULL ORDER BY lm.created_at DESC LIMIT 100`,
      expectedIndex: "idx_log_modifiche_entita_entita_id_created_at",
    },
    {
      id: "Q17",
      screen: "documenti",
      label: "lista",
      sql: `SELECT id FROM public.documenti ORDER BY created_at DESC`,
      expectedIndex: "(table size dependent)",
    },
    {
      id: "Q18",
      screen: "portale",
      label: "lavorazioni_mezzi_inner_cliente",
      sql: `SELECT l.id FROM public.lavorazioni l INNER JOIN public.mezzi m ON m.id = l.mezzo_id WHERE l.deleted_at IS NULL AND l.archived = false AND m.cliente = '${clienteEsc}' ORDER BY l.created_at DESC`,
      expectedIndex: "idx_mezzi_cliente_btree + lavorazioni(mezzo_id)",
    },
    {
      id: "Q19",
      screen: "settings",
      label: "app_settings_select",
      sql: `SELECT id, module, key, value FROM public.app_settings ORDER BY key`,
      expectedIndex: "(small table — seq scan OK)",
    },
    {
      id: "Q20",
      screen: "schede",
      label: "single_lavorazione",
      sql: `SELECT id FROM public.scheda_lavorazione WHERE lavorazione_id = (SELECT id FROM public.lavorazioni WHERE deleted_at IS NULL LIMIT 1)`,
      expectedIndex: "scheda_lavorazione_lavorazione_id",
    },
  ];
}

export const RLS_QUERY_IDS = ["Q1", "Q6", "Q8", "Q14", "Q15", "Q16"];
