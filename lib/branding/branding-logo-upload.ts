"use client";

import type { CabBrandingSettings } from "@/lib/branding/branding-settings-model";
import {
  brandingLogoExtensionFromFile,
  prepareBrandingLogoBlob,
  validateBrandingLogoDimensions,
} from "@/lib/branding/branding-logo-validation";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";
import { buildBrandingLogoStoragePath } from "@/src/lib/storage/storage-paths";
import { storageRemove, storageUpload } from "@/src/services/storage.service";

export type BrandingLogoUploadDraft = {
  pendingFile: File | null;
  removeCustomLogo: boolean;
};

export async function uploadBrandingLogoFile(file: File): Promise<string> {
  const validation = await validateBrandingLogoDimensions(file);
  if (!validation.ok) throw new Error(validation.error);
  const ext = brandingLogoExtensionFromFile(file);
  if (!ext) throw new Error("Formato non supportato.");
  const blob = await prepareBrandingLogoBlob(file);
  const path = buildBrandingLogoStoragePath(ext);
  await storageUpload(STORAGE_BUCKETS.images, path, blob, {
    contentType: blob.type || file.type,
    upsert: true,
    cacheControl: "3600",
  });
  return path;
}

export async function deleteBrandingLogoFromStorage(path: string | null | undefined): Promise<void> {
  if (!path?.trim()) return;
  try {
    await storageRemove(STORAGE_BUCKETS.images, [path]);
  } catch {
    /* best effort */
  }
}

export async function resolveBrandingForSave(
  current: CabBrandingSettings,
  draft: BrandingLogoUploadDraft,
): Promise<CabBrandingSettings> {
  const updatedAt = new Date().toISOString();
  if (draft.removeCustomLogo) {
    await deleteBrandingLogoFromStorage(current.logoStoragePath);
    return { ...current, logoStoragePath: null, updatedAt };
  }
  if (draft.pendingFile) {
    if (current.logoStoragePath) {
      await deleteBrandingLogoFromStorage(current.logoStoragePath);
    }
    const path = await uploadBrandingLogoFile(draft.pendingFile);
    return { ...current, logoStoragePath: path, updatedAt };
  }
  return current;
}

export function buildBrandingLogoApiUrl(settings: CabBrandingSettings | null | undefined): string {
  if (!settings?.logoStoragePath) return "/cab-logo.png";
  const v = settings.updatedAt ? encodeURIComponent(settings.updatedAt) : "1";
  return `/api/branding/logo?v=${v}`;
}
