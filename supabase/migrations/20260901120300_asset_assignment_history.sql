-- Asset Lifecycle — assignment history + RPC reassign (M4)

CREATE TABLE IF NOT EXISTS public.asset_assignment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attrezzatura_id uuid NOT NULL REFERENCES public.attrezzature(id) ON DELETE CASCADE,
  mezzo_id uuid NOT NULL REFERENCES public.mezzi(id) ON DELETE CASCADE,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  change_reason public.assignment_change_reason NOT NULL DEFAULT 'installazione',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT assignment_history_valid_range CHECK (
    valid_to IS NULL OR valid_to > valid_from
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assignment_one_open
  ON public.asset_assignment_history (attrezzatura_id)
  WHERE valid_to IS NULL;

CREATE INDEX IF NOT EXISTS idx_assignment_mezzo ON public.asset_assignment_history (mezzo_id);
CREATE INDEX IF NOT EXISTS idx_assignment_attrezzatura ON public.asset_assignment_history (attrezzatura_id);

CREATE OR REPLACE FUNCTION public.reassign_attrezzatura_mezzo(
  p_attrezzatura_id uuid,
  p_new_mezzo_id uuid,
  p_change_reason public.assignment_change_reason DEFAULT 'spostamento',
  p_note text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.attrezzature
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_open_id uuid;
  v_row public.attrezzature%ROWTYPE;
  v_actor uuid;
BEGIN
  IF p_attrezzatura_id IS NULL OR p_new_mezzo_id IS NULL THEN
    RAISE EXCEPTION 'attrezzatura_id e new_mezzo_id obbligatori';
  END IF;

  v_actor := COALESCE(p_actor_id, public.rbac_auth_uid());

  SELECT id INTO v_open_id
  FROM public.asset_assignment_history
  WHERE attrezzatura_id = p_attrezzatura_id AND valid_to IS NULL
  FOR UPDATE;

  IF v_open_id IS NOT NULL THEN
    UPDATE public.asset_assignment_history
    SET valid_to = now()
    WHERE id = v_open_id;
  END IF;

  INSERT INTO public.asset_assignment_history (
    attrezzatura_id, mezzo_id, valid_from, valid_to, change_reason, note, created_by
  ) VALUES (
    p_attrezzatura_id, p_new_mezzo_id, now(), NULL, p_change_reason, p_note, v_actor
  );

  UPDATE public.attrezzature
  SET mezzo_id = p_new_mezzo_id, updated_at = now()
  WHERE id = p_attrezzatura_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'attrezzatura non trovata';
  END IF;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.open_attrezzatura_assignment(
  p_attrezzatura_id uuid,
  p_mezzo_id uuid,
  p_change_reason public.assignment_change_reason DEFAULT 'installazione',
  p_note text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_valid_from timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_actor uuid;
BEGIN
  v_actor := COALESCE(p_actor_id, public.rbac_auth_uid());
  INSERT INTO public.asset_assignment_history (
    attrezzatura_id, mezzo_id, valid_from, change_reason, note, created_by
  ) VALUES (
    p_attrezzatura_id, p_mezzo_id, p_valid_from, p_change_reason, p_note, v_actor
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_attrezzatura_assignment(
  p_attrezzatura_id uuid,
  p_change_reason public.assignment_change_reason DEFAULT 'smontaggio',
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.asset_assignment_history
  SET valid_to = now(), change_reason = p_change_reason, note = COALESCE(p_note, note)
  WHERE attrezzatura_id = p_attrezzatura_id AND valid_to IS NULL;
END;
$$;
