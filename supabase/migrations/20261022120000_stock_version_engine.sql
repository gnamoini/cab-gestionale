-- Stock Engine: stock_version OCC + stock_apply_movement RPC (Invariant S-01)

ALTER TABLE public.magazzino_ricambi
  ADD COLUMN IF NOT EXISTS stock_version bigint NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.magazzino_ricambi.stock_version IS
  'OCC counter — incremented atomically by stock_apply_movement. Never used for ordering client-side except merge gate.';

CREATE OR REPLACE FUNCTION public.stock_apply_movement(
  p_ricambio_id uuid,
  p_delta numeric,
  p_expected_version bigint,
  p_operation_id uuid,
  p_origine text DEFAULT 'manual_adjustment',
  p_causale text DEFAULT NULL,
  p_conta_statistiche boolean DEFAULT true,
  p_lavorazione_id uuid DEFAULT NULL,
  p_meta jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row public.magazzino_ricambi%ROWTYPE;
  v_existing public.movimenti_ricambi%ROWTYPE;
  v_tipo public.tipo_movimento_ricambio;
  v_abs_qty numeric(14, 3);
  v_new_q numeric(14, 3);
  v_mov_id uuid;
  v_causale text;
BEGIN
  IF p_operation_id IS NULL THEN
    RAISE EXCEPTION 'operation_id_required' USING ERRCODE = '22023';
  END IF;

  -- Idempotency: return cached result
  SELECT * INTO v_existing
  FROM public.movimenti_ricambi
  WHERE operation_id = p_operation_id
  LIMIT 1;

  IF FOUND THEN
    SELECT * INTO v_row FROM public.magazzino_ricambi WHERE id = v_existing.ricambio_id;
    RETURN jsonb_build_object(
      'ricambio_id', v_row.id,
      'quantita', v_row.quantita,
      'stock_version', v_row.stock_version,
      'movimento_id', v_existing.id,
      'operation_id', p_operation_id,
      'idempotent', true
    );
  END IF;

  IF p_delta = 0 THEN
    SELECT * INTO v_row FROM public.magazzino_ricambi WHERE id = p_ricambio_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'ricambio_not_found' USING ERRCODE = 'P0002';
    END IF;
    IF v_row.stock_version IS DISTINCT FROM p_expected_version THEN
      RAISE EXCEPTION 'stock_version_conflict' USING ERRCODE = '23505';
    END IF;
    RETURN jsonb_build_object(
      'ricambio_id', v_row.id,
      'quantita', v_row.quantita,
      'stock_version', v_row.stock_version,
      'movimento_id', NULL,
      'operation_id', p_operation_id,
      'noop', true
    );
  END IF;

  SELECT * INTO v_row FROM public.magazzino_ricambi WHERE id = p_ricambio_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ricambio_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_row.stock_version IS DISTINCT FROM p_expected_version THEN
    RAISE EXCEPTION 'stock_version_conflict' USING ERRCODE = '23505';
  END IF;

  v_new_q := v_row.quantita + p_delta;
  IF v_new_q < 0 THEN
    RAISE EXCEPTION 'insufficient_stock' USING ERRCODE = '23514';
  END IF;

  IF p_delta > 0 THEN
    v_tipo := 'entrata';
    v_abs_qty := p_delta;
  ELSE
    v_tipo := 'uscita';
    v_abs_qty := abs(p_delta);
  END IF;

  v_causale := COALESCE(NULLIF(trim(p_causale), ''), CASE WHEN v_tipo = 'entrata' THEN 'carico' ELSE 'scarico' END);

  INSERT INTO public.movimenti_ricambi (
    ricambio_id,
    lavorazione_id,
    tipo,
    quantita,
    conta_statistiche,
    operation_id,
    meta
  ) VALUES (
    p_ricambio_id,
    p_lavorazione_id,
    v_tipo,
    v_abs_qty,
    COALESCE(p_conta_statistiche, true),
    p_operation_id,
    COALESCE(p_meta, '{}'::jsonb) || jsonb_build_object('origine', p_origine, 'causale', v_causale)
  )
  RETURNING id INTO v_mov_id;

  UPDATE public.magazzino_ricambi
  SET quantita = v_new_q,
      stock_version = stock_version + 1
  WHERE id = p_ricambio_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'ricambio_id', v_row.id,
    'quantita', v_row.quantita,
    'stock_version', v_row.stock_version,
    'movimento_id', v_mov_id,
    'operation_id', p_operation_id,
    'quantita_before', v_row.quantita - p_delta,
    'delta', p_delta
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.stock_apply_movement(
  uuid, numeric, bigint, uuid, text, text, boolean, uuid, jsonb
) TO authenticated;

-- ponytail: legacy paths (receiving) che aggiornano solo quantita — bump version automatico
CREATE OR REPLACE FUNCTION public.trg_magazzino_ricambi_stock_version_bump()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.quantita IS DISTINCT FROM OLD.quantita AND NEW.stock_version = OLD.stock_version THEN
    NEW.stock_version := OLD.stock_version + 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_magazzino_ricambi_stock_version_bump ON public.magazzino_ricambi;
CREATE TRIGGER trg_magazzino_ricambi_stock_version_bump
  BEFORE UPDATE OF quantita ON public.magazzino_ricambi
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_magazzino_ricambi_stock_version_bump();
