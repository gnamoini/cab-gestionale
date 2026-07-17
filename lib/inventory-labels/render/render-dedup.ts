const inFlightRenders = new Map<string, Promise<Buffer>>();

export function renderDedupKey(entityId: string, hash: string, format: string): string {
  return `${entityId}:${hash}:${format}`;
}

/** IL-019: coalesce concurrent renders for same (entity, hash, format) within one process. */
export async function withRenderDedup(
  key: string,
  render: () => Promise<Buffer>,
): Promise<Buffer> {
  const existing = inFlightRenders.get(key);
  if (existing) return existing;

  const promise = render().finally(() => {
    inFlightRenders.delete(key);
  });
  inFlightRenders.set(key, promise);
  return promise;
}

export function clearRenderDedupForTests(): void {
  inFlightRenders.clear();
}
