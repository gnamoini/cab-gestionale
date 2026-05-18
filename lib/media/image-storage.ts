"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";

export type ImageScope = "mezzi" | "magazzino" | "lavorazioni";

export type StoredImage = {
  name: string;
  path: string;
  signedUrl: string;
  createdAt: string | null;
};

const BUCKET = "images";
export const MAX_IMAGES_PER_RECORD = 10;
const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.82;

function safeFileName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "image.jpg";
}

export function imagePrefix(scope: ImageScope, recordId: string): string {
  return `${scope}/${recordId}`;
}

async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Seleziona un file immagine.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  return await new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", JPEG_QUALITY);
  });
}

export async function listStoredImages(scope: ImageScope, recordId: string): Promise<StoredImage[]> {
  const supabase = getBrowserSupabase();
  const prefix = imagePrefix(scope, recordId);
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
    limit: 20,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) throw new Error(error.message);
  const files = (data ?? []).filter((item) => item.name && item.name !== ".emptyFolderPlaceholder");
  const signed = await Promise.all(
    files.map(async (item) => {
      const path = `${prefix}/${item.name}`;
      const { data: urlData, error: urlError } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
      if (urlError) throw new Error(urlError.message);
      return {
        name: item.name,
        path,
        signedUrl: urlData.signedUrl,
        createdAt: item.created_at ?? null,
      };
    }),
  );
  return signed;
}

export async function uploadStoredImage(scope: ImageScope, recordId: string, file: File): Promise<{ name: string; path: string }> {
  const supabase = getBrowserSupabase();
  const existing = await listStoredImages(scope, recordId);
  if (existing.length >= MAX_IMAGES_PER_RECORD) {
    throw new Error(`Limite massimo ${MAX_IMAGES_PER_RECORD} immagini raggiunto`);
  }
  const body = await compressImage(file);
  const name = `${Date.now()}-${safeFileName(file.name).replace(/\.[^.]+$/, "")}.jpg`;
  const path = `${imagePrefix(scope, recordId)}/${name}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return { name, path };
}

export async function deleteStoredImage(path: string): Promise<void> {
  const supabase = getBrowserSupabase();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}
