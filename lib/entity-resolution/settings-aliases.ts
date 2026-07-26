import type { EntityAliasesMap, EntityType } from "@/lib/entity-resolution/entity-resolution-types";
import { entityNormKey } from "@/lib/entity-resolution/entity-normalizer";

export const ENTITY_RESOLUTION_ALIASES_MODULE = "entity_resolution";
export const ENTITY_RESOLUTION_ALIASES_KEY = "aliases";

export function entityAliasRegistryKey(entityType: EntityType, canonicalLabel: string): string {
  return `${entityType}:${canonicalLabel.trim()}`;
}

export function parseEntityAliasesPayload(raw: unknown): EntityAliasesMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: EntityAliasesMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    const aliases = value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
    if (aliases.length > 0) out[key] = aliases;
  }
  return out;
}

export type AliasLookupEntry = {
  entityType: EntityType;
  canonicalLabel: string;
  entityId: string | null;
};

export function buildAliasLookupMap(
  aliases: EntityAliasesMap,
  entityIdByCanonical?: Map<string, string | null>,
): Map<string, AliasLookupEntry> {
  const map = new Map<string, AliasLookupEntry>();
  for (const [registryKey, aliasList] of Object.entries(aliases)) {
    const colon = registryKey.indexOf(":");
    if (colon <= 0) continue;
    const entityType = registryKey.slice(0, colon) as EntityType;
    const canonicalLabel = registryKey.slice(colon + 1).trim();
    if (!canonicalLabel) continue;
    const entityId = entityIdByCanonical?.get(registryKey) ?? null;
    const entry: AliasLookupEntry = { entityType, canonicalLabel, entityId };
    for (const alias of aliasList) {
      const key = entityNormKey(alias, { stripLegalSuffix: true, stripGeographic: true });
      if (key) map.set(`${entityType}:${key}`, entry);
    }
  }
  return map;
}

export function lookupAlias(
  aliasMap: Map<string, AliasLookupEntry>,
  entityType: EntityType,
  input: string,
): AliasLookupEntry | null {
  const key = entityNormKey(input, { stripLegalSuffix: true, stripGeographic: true });
  if (!key) return null;
  return aliasMap.get(`${entityType}:${key}`) ?? null;
}

export function appendAliasForCanonical(
  aliases: EntityAliasesMap,
  entityType: EntityType,
  canonicalLabel: string,
  aliasLabel: string,
): EntityAliasesMap {
  const trimmed = aliasLabel.trim();
  if (!trimmed || trimmed === canonicalLabel.trim()) return aliases;
  const key = entityAliasRegistryKey(entityType, canonicalLabel);
  const existing = aliases[key] ?? [];
  if (existing.some((a) => a.trim().toLowerCase() === trimmed.toLowerCase())) return aliases;
  return { ...aliases, [key]: [...existing, trimmed] };
}
