/**
 * Sprint 2.6 defer kill switches — build flag + optional runtime override.
 * ponytail: NEXT_PUBLIC_* baked at build; runtime __GESTIONALE_FEATURE_FLAGS__ for emergency mount off.
 */

type GestionaleFeatureFlags = {
  uploadTrayDefer?: boolean;
  supabaseBannerDefer?: boolean;
  dataStaleBannerDefer?: boolean;
  formUxBootstrapDefer?: boolean;
};

function runtimeFlags(): GestionaleFeatureFlags | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { __GESTIONALE_FEATURE_FLAGS__?: GestionaleFeatureFlags })
    .__GESTIONALE_FEATURE_FLAGS__;
}

function resolveDefer(buildEnvKey: string, runtimeKey: keyof GestionaleFeatureFlags, defaultOn: boolean): boolean {
  const buildOn = process.env[buildEnvKey] !== "0" && (process.env[buildEnvKey] === "1" || defaultOn);
  const runtime = runtimeFlags()?.[runtimeKey];
  return runtime ?? buildOn;
}

/** Build default: defer enabled after Sprint 2.6 merge; set NEXT_PUBLIC_*_DEFER=0 + rebuild to rollback bundle split. */
export function isUploadTrayDeferEnabled(): boolean {
  return resolveDefer("NEXT_PUBLIC_UPLOAD_TRAY_DEFER", "uploadTrayDefer", true);
}

export function isSupabaseBannerDeferEnabled(): boolean {
  return resolveDefer("NEXT_PUBLIC_SUPABASE_BANNER_DEFER", "supabaseBannerDefer", true);
}

export function isDataStaleBannerDeferEnabled(): boolean {
  return resolveDefer("NEXT_PUBLIC_DATA_STALE_BANNER_DEFER", "dataStaleBannerDefer", true);
}

export function isFormUxBootstrapDeferEnabled(): boolean {
  return resolveDefer("NEXT_PUBLIC_FORM_UX_BOOTSTRAP_DEFER", "formUxBootstrapDefer", true);
}
