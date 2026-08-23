"use client";

import { usePathname } from "next/navigation";
import {
  SystemBannerLayout,
  SystemBannerShell,
} from "@/components/design-system/system-banner";
import { SystemBannerAlertIcon } from "@/components/design-system/system-banner-alert-icon";
import { useAuth } from "@/context/auth-context";
import {
  resolveSupabaseConfigurationBannerDetail,
  SUPABASE_CONFIGURATION_BANNER_ARIA_LABEL,
  SUPABASE_CONFIGURATION_BANNER_TITLE,
} from "@/lib/env/supabase-configuration-banner-copy";
import { isSupabasePublicEnvConfigured } from "@/lib/env/supabase-public";

function isLoginRoute(pathname: string | null): boolean {
  return pathname === "/login" || (pathname?.startsWith("/login/") ?? false);
}

export function SupabaseConfigurationBannerView({ detail }: { detail: string }) {
  return (
    <SystemBannerShell
      ariaLabel={SUPABASE_CONFIGURATION_BANNER_ARIA_LABEL}
      role="alert"
      className="!z-[100]"
    >
      <SystemBannerLayout
        media={<SystemBannerAlertIcon />}
        title={SUPABASE_CONFIGURATION_BANNER_TITLE}
        description={detail}
      />
    </SystemBannerShell>
  );
}

/** Banner globale se mancano le variabili pubbliche Supabase o `AuthProvider` segnala `configurationError`. */
export function SupabaseConfigurationBanner() {
  const pathname = usePathname();
  const { configurationError } = useAuth();
  const envMissing = !isSupabasePublicEnvConfigured();

  if (!envMissing && !configurationError) return null;
  if (!envMissing && configurationError && isLoginRoute(pathname)) return null;

  return (
    <SupabaseConfigurationBannerView
      detail={resolveSupabaseConfigurationBannerDetail(configurationError)}
    />
  );
}
