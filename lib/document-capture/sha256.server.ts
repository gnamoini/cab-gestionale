import { createHash } from "node:crypto";

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function sha256Prefix(hex: string, len = 12): string {
  return hex.slice(0, len);
}
