"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { isSupabasePublicEnvConfigured, MISSING_SUPABASE_ENV_MESSAGE } from "@/lib/env/supabase-public";

function isLoginRoute(pathname: string | null): boolean {
  return pathname === "/login" || (pathname?.startsWith("/login/") ?? false);
}

/** Banner globale se mancano le variabili pubbliche Supabase o `AuthProvider` segnala `configurationError`. */
export function SupabaseConfigurationBanner() {
  const pathname = usePathname();
  const { configurationError } = useAuth();
  const envMissing = !isSupabasePublicEnvConfigured();

  if (!envMissing && !configurationError) return null;
  if (!envMissing && configurationError && isLoginRoute(pathname)) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-[100] border-b border-amber-800/40 bg-amber-500 px-4 py-2 text-center text-xs font-semibold text-amber-950 shadow-md dark:border-amber-500/30 dark:bg-amber-600 dark:text-amber-50"
    >
      {configurationError ?? MISSING_SUPABASE_ENV_MESSAGE}
    </div>
  );
}
