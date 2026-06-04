import type { RuoloUtente } from "@/src/types/supabase-tables";

/** Utente autenticato (Supabase Auth + riga `public.profiles`). */
export type PublicAuthUser = {
  id: string;
  email: string;
  nome: string;
  ruolo: RuoloUtente;
  /** Label cliente (`mezzi.cliente`) per portale e RLS. */
  clienteRef: string | null;
};
