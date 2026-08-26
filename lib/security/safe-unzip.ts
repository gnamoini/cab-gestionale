import { unzipSync } from "fflate";

export const SAFE_UNZIP_DEFAULT_MAX_ENTRIES = 100;
export const SAFE_UNZIP_DEFAULT_MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;

export type SafeUnzipLimits = {
  maxEntries?: number;
  maxUncompressedBytes?: number;
};

/** ponytail: post-decompress limits — upgrade path: streaming unzip with pre-check */
export function safeUnzipSync(
  data: Uint8Array,
  limits?: SafeUnzipLimits,
): Record<string, Uint8Array> {
  const maxEntries = limits?.maxEntries ?? SAFE_UNZIP_DEFAULT_MAX_ENTRIES;
  const maxUncompressedBytes =
    limits?.maxUncompressedBytes ?? SAFE_UNZIP_DEFAULT_MAX_UNCOMPRESSED_BYTES;

  const entries = unzipSync(data);
  const keys = Object.keys(entries);
  if (keys.length > maxEntries) {
    throw new Error(`ZIP entry limit exceeded: ${keys.length} > ${maxEntries}`);
  }

  let uncompressed = 0;
  for (const key of keys) {
    uncompressed += entries[key].length;
    if (uncompressed > maxUncompressedBytes) {
      throw new Error(
        `ZIP uncompressed size limit exceeded: ${uncompressed} > ${maxUncompressedBytes}`,
      );
    }
  }

  return entries;
}
