-- Ricerca globale preventivi: search_document include dettagli, righe, relazioni.
-- SSOT contract: lib/preventivi/preventivo-search-document-contract.ts

create or replace function public.build_preventivo_search_document(p_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  with prefs as (
    select coalesce(s.value->'dipendentiRecords', '[]'::jsonb) as dipendenti_records
    from public.app_settings s
    where s.module = 'lavorazioni' and s.key = 'prefs'
    limit 1
  ),
  ricambi_snapshot as (
    select string_agg(
      concat_ws(' ', nullif(trim(rr->>'codiceOE'), ''), nullif(trim(rr->>'descrizione'), '')),
      ' '
    ) as txt
    from public.preventivi p2
    cross join lateral jsonb_array_elements(coalesce(p2.dettagli->'righeRicambi', '[]'::jsonb)) rr
    where p2.id = p_id
  ),
  ricambi_magazzino as (
    select string_agg(concat_ws(' ', mr.codice, mr.nome), ' ') as txt
    from public.preventivi p2
    cross join lateral jsonb_array_elements(coalesce(p2.dettagli->'righeRicambi', '[]'::jsonb)) rr
    left join public.magazzino_ricambi mr
      on mr.id = nullif(trim(rr->>'ricambioId'), '')::uuid
    where p2.id = p_id and mr.id is not null
  ),
  addetti_legacy as (
    select string_agg(nullif(trim(ra->>'addettoLegacy'), ''), ' ') as txt
    from public.preventivi p2
    cross join lateral jsonb_array_elements(coalesce(p2.dettagli->'manodopera'->'righeAddetti', '[]'::jsonb)) ra
    where p2.id = p_id
  ),
  addetti_resolved as (
    select string_agg(
      trim(concat_ws(' ', nullif(trim(d->>'nome'), ''), nullif(trim(d->>'cognome'), ''))),
      ' '
    ) as txt
    from public.preventivi p2
    cross join lateral jsonb_array_elements(coalesce(p2.dettagli->'manodopera'->'righeAddetti', '[]'::jsonb)) ra
    cross join prefs
    cross join lateral jsonb_array_elements(prefs.dipendenti_records) d
    where p2.id = p_id
      and nullif(trim(ra->>'addettoId'), '') is not null
      and d->>'id' = ra->>'addettoId'
      and coalesce(d->>'employeeType', 'ADDETTO') = 'ADDETTO'
      and coalesce((d->>'attivo')::boolean, true)
  )
  select concat_ws(' ',
    public.normalize_search_text(
      concat_ws(' ',
        p.dettagli->>'numero',
        p.dettagli->>'tipoDocumento',
        case when coalesce(p.dettagli->>'tipoDocumento', 'preventivo') = 'consuntivo'
          then 'consuntivo Consuntivo Cons. Cons'
          else 'preventivo Preventivo Prev. Prev'
        end,
        p.stato_workflow::text,
        case p.stato_workflow
          when 'bozza' then 'Bozza'
          when 'inviato' then 'Inviato'
          when 'acquisito' then 'Acquisito'
          when 'annullato' then 'Annullato'
          else p.stato_workflow::text
        end,
        p.cliente,
        p.dettagli->>'cantiere',
        p.dettagli->>'utilizzatore',
        p.dettagli->>'macchinaRiassunto',
        coalesce(nullif(trim(p.dettagli->>'targa'), ''), m.targa),
        p.dettagli->>'matricola',
        p.dettagli->>'nScuderia',
        p.dettagli->>'marcaAttrezzatura',
        p.dettagli->>'modelloAttrezzatura',
        p.dettagli->>'marcaTelaio',
        p.dettagli->>'modelloTelaio',
        p.dettagli->>'tipoTelaio',
        p.dettagli->>'tipoAttrezzatura',
        p.dettagli->>'km',
        p.dettagli->>'attrezzaturaMarca',
        p.dettagli->>'attrezzaturaModello',
        p.dettagli->>'attrezzaturaMatricola',
        p.dettagli->>'lavorazioneId',
        l.codice,
        l.note,
        p.dettagli->>'descrizioneLavorazioniCliente',
        p.dettagli->>'descrizioneLavorazioniTecnicaSorgente',
        p.dettagli->>'descrizioneGenerataAuto',
        p.dettagli->>'sanificazioneDescrizione',
        p.dettagli->>'collaudoDescrizione',
        p.dettagli->>'noteFinali',
        p.dettagli->>'richiedente',
        p.dettagli->>'livelloCarburante',
        p.dettagli->>'dataCreazione',
        to_char(p.created_at, 'YYYY-MM-DD'),
        p.totale::text,
        p.dettagli->>'totaleFinale',
        p.dettagli->>'totaleRicambi',
        p.dettagli->>'totaleManodopera',
        m.targa,
        m.marca_telaio,
        m.modello_telaio,
        m.cliente,
        m.matricola,
        m.numero_scuderia,
        m.utilizzatore,
        (select txt from ricambi_snapshot),
        (select txt from ricambi_magazzino),
        (select txt from addetti_legacy),
        (select txt from addetti_resolved)
      )
    ),
    public.format_field_search_token('document', p.dettagli->>'numero'),
    public.format_field_search_token('cliente', p.cliente),
    public.format_field_search_token('cliente', p.dettagli->>'cantiere'),
    public.format_field_search_token('cliente', p.dettagli->>'utilizzatore'),
    public.format_field_search_token('targa', coalesce(nullif(trim(p.dettagli->>'targa'), ''), m.targa)),
    public.format_field_search_token('document', p.dettagli->>'matricola'),
    public.format_field_search_token('marca', p.dettagli->>'marcaAttrezzatura'),
    public.format_field_search_token('modello', p.dettagli->>'modelloAttrezzatura'),
    public.format_field_search_token('marca', p.dettagli->>'marcaTelaio'),
    public.format_field_search_token('modello', p.dettagli->>'modelloTelaio'),
    public.format_field_search_token('targa', m.targa),
    public.format_field_search_token('codice', l.codice),
    public.format_field_search_token('note', l.note),
    public.format_field_search_token('descrizione', p.dettagli->>'descrizioneLavorazioniCliente'),
    public.format_field_search_token('operatore', p.dettagli->>'richiedente')
  )
  from public.preventivi p
  left join public.mezzi m on m.id = p.mezzo_id
  left join public.lavorazioni l on l.id = p.lavorazione_id
  where p.id = p_id
$$;

-- Fan-out: mezzo aggiornato → rebuild search_document preventivi collegati
create or replace function public.trg_mezzi_enqueue_preventivi_search_rebuild()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prev_id uuid;
begin
  if tg_op = 'UPDATE' and (
    new.targa is not distinct from old.targa
    and new.numero_scuderia is not distinct from old.numero_scuderia
    and new.telaio_num is not distinct from old.telaio_num
    and new.marca_telaio is not distinct from old.marca_telaio
    and new.modello_telaio is not distinct from old.modello_telaio
    and new.tipo_telaio is not distinct from old.tipo_telaio
    and new.cliente is not distinct from old.cliente
    and new.utilizzatore is not distinct from old.utilizzatore
    and new.matricola is not distinct from old.matricola
  ) then
    return new;
  end if;

  for prev_id in
    select pr.id from public.preventivi pr where pr.mezzo_id = new.id
  loop
    perform public.enqueue_search_rebuild('preventivo', prev_id);
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_mezzi_enqueue_preventivi_search on public.mezzi;
create trigger trg_mezzi_enqueue_preventivi_search
after update of targa, numero_scuderia, telaio_num, marca_telaio, modello_telaio, tipo_telaio, cliente, utilizzatore, matricola
on public.mezzi
for each row
execute function public.trg_mezzi_enqueue_preventivi_search_rebuild();

-- Fan-out: lavorazione aggiornata → rebuild search_document preventivi collegati
create or replace function public.trg_lavorazioni_enqueue_preventivi_search_rebuild()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prev_id uuid;
begin
  if tg_op = 'UPDATE' and (
    new.codice is not distinct from old.codice
    and new.note is not distinct from old.note
  ) then
    return new;
  end if;

  for prev_id in
    select pr.id from public.preventivi pr where pr.lavorazione_id = new.id
  loop
    perform public.enqueue_search_rebuild('preventivo', prev_id);
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_lavorazioni_enqueue_preventivi_search on public.lavorazioni;
create trigger trg_lavorazioni_enqueue_preventivi_search
after update of codice, note
on public.lavorazioni
for each row
execute function public.trg_lavorazioni_enqueue_preventivi_search_rebuild();

update public.preventivi p
set search_document = coalesce(public.build_preventivo_search_document(p.id), '');
