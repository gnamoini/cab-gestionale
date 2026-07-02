import type { RuoloUtente } from "@/src/types/supabase-tables";

/** Utente autenticato (Supabase Auth + riga `public.profiles`). */
export type PublicAuthUser = {
  id: string;
  email: string;
  /** Nome visualizzato composto (retrocompatibile). */
  nome: string;
  /** profiles.nome — nome proprio. */
  givenName: string;
  cognome: string | null;
  username: string | null;
  createdAt: string | null;
  ruolo: RuoloUtente;
  /** Label cliente (`mezzi.cliente`) per portale e RLS. */
  clienteRef: string | null;
};
