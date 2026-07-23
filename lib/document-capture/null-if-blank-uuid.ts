/** Postgres uuid columns reject ""; treat blank as null at RPC/DB boundaries. */
export function nullIfBlankUuid(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
