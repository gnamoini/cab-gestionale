export function settingsConfigFieldId(prefix: string, raw: string): string {
  const safe = raw.trim().toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "item";
  return `${prefix}-${safe}`;
}
