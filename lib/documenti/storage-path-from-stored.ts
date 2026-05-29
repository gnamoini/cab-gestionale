import { normalizeStorageObjectPath } from "@/src/lib/storage/storage-paths";

/** Estrae path oggetto da valore DB (path puro o URL Supabase legacy). */
export function documentoStoragePathFromStored(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^blob:/i.test(t)) return null;
  if (/^https?:\/\//i.test(t)) {
    const markers = [
      "/storage/v1/object/public/documenti/",
      "/storage/v1/object/sign/documenti/",
      "/storage/v1/object/authenticated/documenti/",
    ];
    for (const marker of markers) {
      const i = t.indexOf(marker);
      if (i >= 0) {
        const rest = t.slice(i + marker.length).split("?")[0] ?? "";
        return normalizeStorageObjectPath(decodeURIComponent(rest));
      }
    }
    return null;
  }
  return normalizeStorageObjectPath(t);
}
