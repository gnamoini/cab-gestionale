/** Dedup write in-flight: stesso (lavorazioneId, data_ingresso YMD) → una sola mutation. */
const inflightDataIngressoWrites = new Map<string, Promise<void>>();

export function dedupeIngressoDataIngressoWrite(
  lavorazioneId: string,
  patch: Record<string, unknown>,
  write: () => Promise<void>,
): Promise<void> {
  const id = lavorazioneId.trim();
  const ymd =
    typeof patch.data_ingresso === "string" ? patch.data_ingresso.trim().slice(0, 10) : "";
  const keys = Object.keys(patch);
  if (!id || !ymd || keys.length !== 1 || keys[0] !== "data_ingresso") {
    return write();
  }

  const key = `${id}:${ymd}`;
  const existing = inflightDataIngressoWrites.get(key);
  if (existing) return existing;

  const flight = write().finally(() => {
    if (inflightDataIngressoWrites.get(key) === flight) {
      inflightDataIngressoWrites.delete(key);
    }
  });
  inflightDataIngressoWrites.set(key, flight);
  return flight;
}

/** Test-only reset. */
export function resetIngressoDataIngressoWriteDedupForTests(): void {
  inflightDataIngressoWrites.clear();
}
