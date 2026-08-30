"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/gestionale/page-header";
import { ShellCard } from "@/components/gestionale/shell-card";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal-shell";
import { erpBtnNeutral, erpBtnPrimary } from "@/lib/ui/erp-tokens";
import { usePermissions } from "@/src/hooks/use-permissions";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";
import { dsStackPage } from "@/lib/ui/design-system";

type AiKeyRow = {
  id: string;
  provider: string;
  slot: string;
  fingerprint: string;
  enabled: boolean;
  priority: number;
  weight: number;
  status: string;
  cooldownUntil: string | null;
  requestsTotal: number;
  successTotal: number;
  failureTotal: number;
  rateLimitTotal: number;
  latencyMsAvg: number | null;
  lastError: string | null;
  lastUsedAt: string | null;
  source?: string;
  managedBy?: string;
  disabledReason?: string | null;
};

const DISABLED_REASON_LABEL: Record<string, string> = {
  env_removed: "Rimossa da env bootstrap",
  manual_admin: "Disabilitata manualmente",
  provider_invalid: "Chiave rifiutata dal provider",
  security_rotation: "Rotazione sicurezza",
};

function statusBadgeClass(status: string, enabled: boolean): string {
  if (!enabled) return "bg-gray-200 text-gray-700";
  if (status === "healthy") return "bg-emerald-100 text-emerald-800";
  if (status === "cooldown" || status === "rate_limited") return "bg-amber-100 text-amber-900";
  if (status === "invalid" || status === "disabled") return "bg-red-100 text-red-800";
  return "bg-[color:var(--cab-surface-muted)] text-[color:var(--cab-text)]";
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function AiProvidersSettingsPage() {
  const permissions = usePermissions();
  const [keys, setKeys] = useState<AiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [rotateTarget, setRotateTarget] = useState<AiKeyRow | null>(null);
  const [slot, setSlot] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai-providers/keys");
      const body = (await res.json()) as { keys?: AiKeyRow[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Caricamento fallito");
      setKeys(
        (body.keys ?? []).map((k) => ({
          ...k,
          managedBy: (k as { managed_by?: string }).managed_by ?? k.managedBy,
          disabledReason: (k as { disabled_reason?: string }).disabled_reason ?? k.disabledReason,
          lastUsedAt: (k as { last_used_at?: string }).last_used_at ?? k.lastUsedAt ?? null,
          cooldownUntil: (k as { cooldown_until?: string }).cooldown_until ?? k.cooldownUntil,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
    void load();
  }, [load]);

  async function handleTestAndSave() {
    if (!slot.trim() || !apiKey.trim()) {
      setError("Slot e API key obbligatori");
      return;
    }
    setSaving(true);
    setTesting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai-providers/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google", slot: slot.trim(), apiKey: apiKey.trim() }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Salvataggio fallito");
      setFormOpen(false);
      setSlot("");
      setApiKey("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore salvataggio");
    } finally {
      setSaving(false);
      setTesting(false);
    }
  }

  async function handleRotate() {
    if (!rotateTarget || !apiKey.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/ai-providers/keys/${rotateTarget.id}/rotate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: rotateTarget.provider,
          newSlot: slot.trim() || `${rotateTarget.slot}-rotated`,
          newApiKey: apiKey.trim(),
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Rotazione fallita");
      setRotateTarget(null);
      setSlot("");
      setApiKey("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore rotazione");
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(id: string, enabled: boolean) {
    await fetch("/api/admin/ai-providers/keys", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, enabled }),
    });
    await load();
  }

  async function testKey(id: string) {
    const res = await fetch(`/api/ops/ai-runtime/test-key/${id}`, { method: "POST" });
    const body = (await res.json()) as { success?: boolean; latencyMs?: number; errorMessage?: string };
    if (body.success) {
      alert(`Test OK (${body.latencyMs}ms)`);
    } else {
      alert(body.errorMessage ?? "Test fallito");
    }
    await load();
  }

  if (!permissions.canManageSettings) {
    return (
      <div className={`${layoutPageRoot} min-w-0`}>
        <PageHeader title="AI Providers" description="Accesso negato." />
      </div>
    );
  }

  const googleKeys = keys.filter((k) => k.provider === "google");

  return (
    <div className={`${layoutPageRoot} min-w-0 ${dsStackPage}`}>
      <PageHeader
        title="AI Providers"
        description="Gestione chiavi API, health e priorità — senza redeploy Vercel."
        actions={
          <div className="flex gap-2 min-w-0 flex-nowrap sm:flex-wrap">
            <Link href="/impostazioni" className={erpBtnNeutral}>
              Impostazioni
            </Link>
            <button type="button" className={erpBtnPrimary} onClick={() => setFormOpen(true)}>
              Aggiungi chiave
            </button>
          </div>
        }
      />
      <ShellCard title="Google Gemini">
        {loading ? <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento…</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {!loading && googleKeys.length === 0 ? (
          <p className="text-sm text-[color:var(--cab-text-muted)]">
            Nessuna chiave in database. Aggiungi una chiave o attendi sync cron da env bootstrap.
          </p>
        ) : null}
        <ul className="space-y-3">
          {googleKeys.map((k) => (
            <li key={k.id} className="rounded-lg border border-[color:var(--cab-border)] p-3 text-sm">
              <div className="flex items-center justify-between gap-2 min-w-0 flex-nowrap sm:flex-wrap">
                <div className="flex items-center gap-2 min-w-0 flex-nowrap sm:flex-wrap">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass(k.status, k.enabled)}`}
                  >
                    {k.enabled ? k.status : "disabled"}
                  </span>
                  <strong>{k.slot}</strong>
                  <span className="text-[color:var(--cab-text-muted)]">({k.fingerprint})</span>
                </div>
                <div className="flex gap-2 min-w-0 flex-nowrap sm:flex-wrap">
                  <button type="button" className={erpBtnNeutral} onClick={() => void testKey(k.id)}>
                    Test
                  </button>
                  <button
                    type="button"
                    className={erpBtnNeutral}
                    onClick={() => {
                      setRotateTarget(k);
                      setSlot(`${k.slot}-rotated`);
                      setApiKey("");
                    }}
                  >
                    Ruota
                  </button>
                  <button
                    type="button"
                    className={erpBtnNeutral}
                    onClick={() => void toggleEnabled(k.id, !k.enabled)}
                  >
                    {k.enabled ? "Disabilita" : "Abilita"}
                  </button>
                </div>
              </div>
              <p className="mt-2 text-[color:var(--cab-text-muted)]">
                Ultimo utilizzo: {formatWhen(k.lastUsedAt)} · Richieste {k.requestsTotal} · OK{" "}
                {k.successTotal} · Errori {k.failureTotal}
                {k.latencyMsAvg != null ? ` · ${k.latencyMsAvg}ms avg` : ""}
              </p>
              {k.cooldownUntil ? (
                <p className="mt-1 text-amber-700">Cooldown fino a: {formatWhen(k.cooldownUntil)}</p>
              ) : null}
              {k.disabledReason ? (
                <p className="mt-1 text-[color:var(--cab-text-muted)]">
                  Motivo disabilitazione: {DISABLED_REASON_LABEL[k.disabledReason] ?? k.disabledReason}
                </p>
              ) : null}
              {k.lastError ? <p className="mt-1 text-red-600">Ultimo errore: {k.lastError}</p> : null}
            </li>
          ))}
        </ul>
      </ShellCard>

      {formOpen ? (
        <GestionaleModalShell
          modalSize="formSmall"
          onRequestClose={() => setFormOpen(false)}
          title="Aggiungi chiave Google"
        >
          <div className="space-y-3 p-4">
            <label className="block text-sm">
              Slot
              <input
                className="mt-1 w-full rounded border px-2 py-1"
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                placeholder="google-03"
              />
            </label>
            <label className="block text-sm">
              API key
              <input
                type="password"
                className="mt-1 w-full rounded border px-2 py-1"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
              />
            </label>
            <p className="text-xs text-[color:var(--cab-text-muted)]">
              Test provider obbligatorio prima del salvataggio.
            </p>
            <button
              type="button"
              className={erpBtnPrimary}
              disabled={saving}
              onClick={() => void handleTestAndSave()}
            >
              {testing ? "Test e salvataggio…" : "Test e salva"}
            </button>
          </div>
        </GestionaleModalShell>
      ) : null}

      {rotateTarget ? (
        <GestionaleModalShell
          modalSize="formSmall"
          onRequestClose={() => setRotateTarget(null)}
          title={`Ruota chiave ${rotateTarget.slot}`}
        >
          <div className="space-y-3 p-4">
            <label className="block text-sm">
              Nuovo slot
              <input
                className="mt-1 w-full rounded border px-2 py-1"
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Nuova API key
              <input
                type="password"
                className="mt-1 w-full rounded border px-2 py-1"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
              />
            </label>
            <button type="button" className={erpBtnPrimary} disabled={saving} onClick={() => void handleRotate()}>
              {saving ? "Rotazione…" : "Test e ruota"}
            </button>
          </div>
        </GestionaleModalShell>
      ) : null}
    </div>
  );
}
