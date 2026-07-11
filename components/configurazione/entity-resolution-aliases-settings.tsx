"use client";

import { useMemo, useState } from "react";
import type { EntityType } from "@/lib/entity-resolution/entity-resolution-types";
import { entityAliasRegistryKey } from "@/lib/entity-resolution/settings-aliases";
import { dsBtnPrimary } from "@/lib/ui/design-system";

const ENTITY_TYPES: EntityType[] = ["MARCA", "CLIENTE", "FORNITORE", "CANTIERE", "UTILIZZATORE"];

export function EntityResolutionAliasesSettings({
  aliases,
  canonicalOptions,
  onSave,
}: {
  aliases: Record<string, string[]>;
  canonicalOptions: Record<EntityType, string[]>;
  onSave: (next: Record<string, string[]>) => Promise<void>;
}) {
  const [entityType, setEntityType] = useState<EntityType>("MARCA");
  const [canonical, setCanonical] = useState("");
  const [aliasInput, setAliasInput] = useState("");
  const [busy, setBusy] = useState(false);

  const registryKey = canonical ? entityAliasRegistryKey(entityType, canonical) : "";
  const currentAliases = registryKey ? (aliases[registryKey] ?? []) : [];

  const preview = useMemo(() => {
    if (!aliasInput.trim() || !canonical) return null;
    return `${aliasInput.trim()} → ${canonical}`;
  }, [aliasInput, canonical]);

  const addAlias = async () => {
    if (!registryKey || !aliasInput.trim()) return;
    setBusy(true);
    try {
      const next = { ...aliases, [registryKey]: [...new Set([...currentAliases, aliasInput.trim()])] };
      await onSave(next);
      setAliasInput("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded border border-[color:var(--cab-border)] p-4">
      <h3 className="text-sm font-medium">Alias riconciliazione entità</h3>
      <p className="text-xs text-[color:var(--cab-muted-fg)]">
        Insegna al sistema come collegare varianti OCR (es. SCHMIDT SRL) alla voce canonica in Impostazioni.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          Tipo entità
          <select
            className="rounded border border-[color:var(--cab-border)] px-2 py-1"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as EntityType)}
          >
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Voce canonica
          <select
            className="rounded border border-[color:var(--cab-border)] px-2 py-1"
            value={canonical}
            onChange={(e) => setCanonical(e.target.value)}
          >
            <option value="">Seleziona…</option>
            {(canonicalOptions[entityType] ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
      </div>
      {canonical ? (
        <>
          <label className="grid gap-1 text-sm">
            Nuovo alias OCR
            <input
              className="rounded border border-[color:var(--cab-border)] px-2 py-1"
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value)}
              placeholder="es. SCHMIDT SRL"
            />
          </label>
          {preview ? <p className="text-xs text-[color:var(--cab-muted-fg)]">Preview: {preview}</p> : null}
          {currentAliases.length > 0 ? (
            <ul className="text-xs text-[color:var(--cab-muted-fg)]">
              {currentAliases.map((a) => (
                <li key={a}>• {a}</li>
              ))}
            </ul>
          ) : null}
          <button type="button" className={dsBtnPrimary} disabled={busy || !aliasInput.trim()} onClick={() => void addAlias()}>
            Aggiungi alias
          </button>
        </>
      ) : null}
    </section>
  );
}
