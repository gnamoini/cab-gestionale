import type { RuoloProfile } from "@/src/types/supabase-tables";

/** Utente autenticato (Supabase Auth + riga `public.profiles`). */
export type PublicAuthUser = {
  id: string;
  email: string;
  nome: string;
  ruolo: RuoloProfile;
};
