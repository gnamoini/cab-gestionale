-- Allinea search_document preventivi al client SSOT (numero e campi dettagli).

create or replace function public.build_preventivo_search_document(p_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select concat_ws(' ',
    public.normalize_search_text(
      concat_ws(' ',
        p.dettagli->>'numero',
        p.cliente,
        p.dettagli->>'cantiere',
        p.dettagli->>'utilizzatore',
        p.dettagli->>'macchinaRiassunto',
        p.dettagli->>'matricola',
        p.dettagli->>'nScuderia',
        p.dettagli->>'marcaAttrezzatura',
        p.dettagli->>'modelloAttrezzatura',
        p.dettagli->>'descrizioneLavorazioniCliente',
        p.dettagli->>'lavorazioneId',
        m.targa,
        m.marca_telaio,
        m.modello_telaio,
        m.cliente,
        m.matricola,
        m.numero_scuderia
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
    public.format_field_search_token('targa', m.targa)
  )
  from public.preventivi p
  left join public.mezzi m on m.id = p.mezzo_id
  where p.id = p_id
$$;

update public.preventivi p
set search_document = coalesce(public.build_preventivo_search_document(p.id), '');
