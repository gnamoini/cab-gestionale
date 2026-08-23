import { MISSING_SUPABASE_ENV_MESSAGE } from "@/lib/env/supabase-public";

/** Copy SSOT — banner configurazione Supabase mancante. */
export const SUPABASE_CONFIGURATION_BANNER_ARIA_LABEL = "Errore configurazione Supabase";

export const SUPABASE_CONFIGURATION_BANNER_TITLE = "Configurazione Supabase mancante";

export const SUPABASE_CONFIGURATION_BANNER_DESCRIPTION =
  "Imposta NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local o nelle variabili d'ambiente del deploy.";

export function resolveSupabaseConfigurationBannerDetail(
  configurationError: string | null | undefined,
): string {
  const message = configurationError?.trim() || MISSING_SUPABASE_ENV_MESSAGE;
  if (message === MISSING_SUPABASE_ENV_MESSAGE) {
    return SUPABASE_CONFIGURATION_BANNER_DESCRIPTION;
  }
  return message;
}
