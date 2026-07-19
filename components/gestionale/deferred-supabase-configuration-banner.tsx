"use client";

import dynamic from "next/dynamic";

const SupabaseConfigurationBannerLazy = dynamic(
  () =>
    import("@/components/supabase-configuration-banner").then((m) => ({
      default: m.SupabaseConfigurationBanner,
    })),
  { ssr: false },
);

/** ponytail: no static import — keeps banner in async chunk when defer build flag on. */
export function DeferredSupabaseConfigurationBanner() {
  return <SupabaseConfigurationBannerLazy />;
}
