/** SHA-256 hex digest of file bytes (Web Crypto). */
export async function sha256HexFromFile(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  return sha256HexFromBytes(new Uint8Array(buffer));
}

export async function sha256HexFromBytes(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
