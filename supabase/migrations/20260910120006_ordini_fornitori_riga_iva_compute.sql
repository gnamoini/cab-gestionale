-- IVA per riga (meta.ivaPercent) + IVA trasporto (ordine.iva_percent).

create or replace function public.ordine_fornitore_compute_totals(
  p_righe jsonb,
  p_trasporto numeric,
  p_iva_percent numeric
)
returns table (
  imponibile_righe numeric,
  imponibile numeric,
  iva numeric,
  totale numeric
)
language plpgsql
immutable
as $$
declare
  v_imponibile_righe numeric := 0;
  v_iva_righe numeric := 0;
  v_row jsonb;
  v_row_net numeric;
  v_row_iva_pct numeric;
  v_trasporto numeric := greatest(coalesce(p_trasporto, 0), 0);
  v_trasporto_iva_pct numeric := least(100, greatest(coalesce(p_iva_percent, 22), 0));
  v_imponibile numeric;
  v_iva numeric;
begin
  for v_row in select * from jsonb_array_elements(coalesce(p_righe, '[]'::jsonb))
  loop
    v_row_net := public.ordine_fornitore_row_total(
      (v_row->>'quantita')::numeric,
      (v_row->>'prezzo_unitario')::numeric,
      coalesce((v_row->>'sconto_percent')::numeric, 0)
    );
    v_imponibile_righe := v_imponibile_righe + v_row_net;
    v_row_iva_pct := least(
      100,
      greatest(
        coalesce(
          nullif(v_row->'meta'->>'ivaPercent', '')::numeric,
          nullif(v_row->'meta'->>'iva_percent', '')::numeric,
          v_trasporto_iva_pct
        ),
        0
      )
    );
    v_iva_righe := v_iva_righe + round(v_row_net * v_row_iva_pct / 100.0, 2);
  end loop;

  v_imponibile_righe := round(v_imponibile_righe, 2);
  v_imponibile := round(v_imponibile_righe + v_trasporto, 2);
  v_iva := round(v_iva_righe + round(v_trasporto * v_trasporto_iva_pct / 100.0, 2), 2);

  imponibile_righe := v_imponibile_righe;
  imponibile := v_imponibile;
  iva := v_iva;
  totale := round(v_imponibile + v_iva, 2);
  return next;
end;
$$;
