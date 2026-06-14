/** Pure helpers for record image delivery paths (no browser / storage I/O). */

export type StoredImageGroupFiles = {
  baseName: string;
  thumb?: string;
  fullAvif?: string;
  fullWebp?: string;
  legacy?: string;
  createdAt?: string | null;
};

export type StoredImageVariantPaths = {
  thumbPath: string;
  /** Path completo canonico (include AVIF se presente) — delete/log. */
  fullPath: string;
  /** Path per delivery detail/card via proxy (preferisce WebP). */
  detailPath: string;
  fullWebpPath?: string;
  legacyJpegPath?: string;
  allPaths: string[];
};

/** SSOT path delivery immagini record. */
export function resolveStoredImageVariantPaths(group: StoredImageGroupFiles): StoredImageVariantPaths {
  const thumbPath = group.thumb ?? group.legacy!;
  const detailPath = group.fullWebp ?? group.legacy ?? group.thumb!;
  const fullPath = group.fullAvif ?? group.fullWebp ?? group.legacy ?? group.thumb!;
  const allPaths = group.legacy
    ? [group.legacy]
    : [group.thumb, group.fullAvif, group.fullWebp].filter((p): p is string => Boolean(p));

  return {
    thumbPath,
    fullPath,
    detailPath,
    fullWebpPath: group.fullWebp,
    legacyJpegPath: group.legacy,
    allPaths,
  };
}
