import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { readMasterEncryptionKeyEnv, readRuntimeSecret } from "@/lib/ai/runtime/env-reader";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;

function resolveMasterKey(): Buffer {
  const raw = readMasterEncryptionKeyEnv();
  if (!raw) {
    throw new Error("AI_MASTER_KEY_ENCRYPTION_KEY non configurata");
  }
  if (/^[A-Za-z0-9+/=]+$/.test(raw) && raw.length >= 32) {
    const buf = Buffer.from(raw, "base64");
    if (buf.length >= 32) return buf.subarray(0, 32);
  }
  return createHash("sha256").update(raw).digest();
}

/** Fingerprint mascherato per UI/diagnostica — mai reversibile alla chiave. */
export function apiKeyFingerprint(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex").slice(0, 16);
}

export function encryptApiKey(plaintext: string): string {
  const key = resolveMasterKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptApiKey(ciphertext: string): string {
  const key = resolveMasterKey();
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, IV_BYTES);
  const tag = buf.subarray(IV_BYTES, IV_BYTES + 16);
  const data = buf.subarray(IV_BYTES + 16);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function canEncryptApiKeys(): boolean {
  return readMasterEncryptionKeyEnv().length > 0;
}
