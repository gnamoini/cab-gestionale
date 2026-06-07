import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_CAB_BRANDING_SETTINGS,
  parseBrandingSettingsPayload,
  type CabBrandingSettings,
} from "@/lib/branding/branding-settings-model";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { CAB_SETTINGS_KEY, CAB_SETTINGS_MODULE } from "@/src/lib/app-settings/keys";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";

export async function fetchBrandingSettingsFromDb(): Promise<CabBrandingSettings> {
  const env = assertSupabasePublicEnv();
  const serviceKey = readSupabaseServiceRoleKey();
  const client = serviceKey
    ? createClient(env.url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data, error } = await client
    .from("app_settings")
    .select("value")
    .eq("module", CAB_SETTINGS_MODULE.system)
    .eq("key", CAB_SETTINGS_KEY.branding)
    .maybeSingle();

  if (error || !data?.value) return { ...DEFAULT_CAB_BRANDING_SETTINGS };
  return parseBrandingSettingsPayload(data.value);
}

export async function fetchBrandingLogoBytes(settings: CabBrandingSettings): Promise<{ bytes: Buffer; contentType: string }> {
  if (!settings.logoStoragePath) {
    const filePath = path.join(process.cwd(), "public", "cab-logo.png");
    const bytes = await readFile(filePath);
    return { bytes, contentType: "image/png" };
  }

  const env = assertSupabasePublicEnv();
  const serviceKey = readSupabaseServiceRoleKey();
  const client = serviceKey
    ? createClient(env.url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data, error } = await client.storage.from(STORAGE_BUCKETS.images).download(settings.logoStoragePath);
  if (error || !data) {
    const filePath = path.join(process.cwd(), "public", "cab-logo.png");
    const bytes = await readFile(filePath);
    return { bytes, contentType: "image/png" };
  }
  const arrayBuffer = await data.arrayBuffer();
  return { bytes: Buffer.from(arrayBuffer), contentType: data.type || "image/png" };
}
