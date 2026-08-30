"use client";

import { useCallback, useEffect, useState } from "react";
import {
  COMMUNICATIONS_PREFS_KEY,
  COMMUNICATIONS_PREFS_MODULE,
  DEFAULT_COMMUNICATION_SETTINGS,
  communicationSettingsToPayload,
  parseCommunicationSettings,
  type CommunicationSettings,
} from "@/lib/communications/settings/communication-settings";
import { isValidEmail } from "@/lib/validation/email";
import { sliceInputValue, TEXT_SHORT } from "@/lib/validation/text-field-limits";
import { useSharedAppSettingsQuery } from "@/src/context/app-settings-query-context";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { useSettingsUpsertMutation } from "@/src/hooks/gestionale/use-settings-queries";
import { useBranding } from "@/context/branding-context";
import { readOfficinaDestinatarioOrdiniFromRows } from "@/lib/officina/officina-destinatario-ordini";
import { dsBtnNeutralForm, dsInput } from "@/lib/ui/design-system";
import { SettingsListFrame, SettingsSectionHeader } from "@/components/dashboard/settings-list-ui";

type CommLogItem = {
  id: string;
  created_at: string;
  domain_event_type: string;
  template_key: string;
  subject: string;
  status: string;
  intended_recipient_email: string | null;
  actual_recipient_email: string | null;
};

type SenderPreview = {
  displayName: string;
  fromEmail: string;
  replyTo: string | null;
};

export function SettingsComunicazioniSection() {
  const gestToast = useGestionaleToast();
  const { logoUrl } = useBranding();
  const settingsQ = useSharedAppSettingsQuery();
  const upsertSettings = useSettingsUpsertMutation();
  const commRow = settingsQ?.data?.rows?.find(
    (r) => r.module === COMMUNICATIONS_PREFS_MODULE && r.key === COMMUNICATIONS_PREFS_KEY,
  );

  const [draft, setDraft] = useState<CommunicationSettings>(DEFAULT_COMMUNICATION_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [resendConfigured, setResendConfigured] = useState<boolean | null>(null);
  const [defaultFromDomain, setDefaultFromDomain] = useState<string | null>(null);
  const [senderPreview, setSenderPreview] = useState<SenderPreview | null>(null);
  const [subTab, setSubTab] = useState<"config" | "storico">("config");
  const [logs, setLogs] = useState<CommLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
    setDraft(parseCommunicationSettings(commRow?.value));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- lint phase2: stable hook contract
  }, [commRow?.updated_at]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/communications/status")
      .then(async (res) => {
        const json = (await res.json()) as {
          resendConfigured?: boolean;
          defaultFromDomain?: string | null;
          senderPreview?: SenderPreview | null;
        };
        if (!cancelled && res.ok) {
          setResendConfigured(json.resendConfigured === true);
          setDefaultFromDomain(json.defaultFromDomain ?? null);
          setSenderPreview(json.senderPreview ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setResendConfigured(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch("/api/communications/log?limit=50");
      const json = (await res.json()) as { items?: CommLogItem[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Errore caricamento storico");
      setLogs(json.items ?? []);
    } catch (e) {
      gestToast.errorOnce("comm-log", e);
    } finally {
      setLogsLoading(false);
    }
  }, [gestToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
    if (subTab === "storico") void loadLogs();
  }, [subTab, loadLogs]);

  const sendTestEmail = async () => {
    const addr = draft.testEmailAddress.trim();
    if (!isValidEmail(addr)) {
      gestToast.validation("Inserisci un indirizzo email di test valido.");
      return;
    }
    setTestSending(true);
    try {
      const res = await fetch("/api/communications/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmailAddress: addr }),
      });
      let json: { error?: string } = {};
      try {
        json = (await res.json()) as { error?: string };
      } catch {
        json = {};
      }
      if (!res.ok) {
        gestToast.errorOnce(
          "comm-test-send",
          json.error?.trim() || `Errore invio email di prova (HTTP ${res.status}).`,
        );
        return;
      }
      gestToast.successOnce("comm-test-send", `Email di prova inviata a ${addr}.`);
    } catch (e) {
      gestToast.errorOnce("comm-test-send", e);
    } finally {
      setTestSending(false);
    }
  };

  const save = async () => {
    if (draft.testMode && draft.testEmailAddress.trim() && !isValidEmail(draft.testEmailAddress)) {
      gestToast.validation("Email di test non valida.");
      return;
    }
    if (draft.senderFromEmail.trim() && !isValidEmail(draft.senderFromEmail)) {
      gestToast.validation("Email mittente non valida.");
      return;
    }
    if (draft.replyToEmail.trim() && !isValidEmail(draft.replyToEmail)) {
      gestToast.validation("Email di risposta non valida.");
      return;
    }
    if (draft.supplierOrderSender.fromEmail.trim() && !isValidEmail(draft.supplierOrderSender.fromEmail)) {
      gestToast.validation("Email mittente ordini fornitori non valida.");
      return;
    }
    if (draft.supplierOrderSender.replyToEmail.trim() && !isValidEmail(draft.supplierOrderSender.replyToEmail)) {
      gestToast.validation("Reply-To ordini fornitori non valida.");
      return;
    }
    setSaving(true);
    try {
      const payload = communicationSettingsToPayload(draft);
      await upsertSettings.mutateAsync({
        module: COMMUNICATIONS_PREFS_MODULE,
        key: COMMUNICATIONS_PREFS_KEY,
        value: payload,
      });
      await settingsQ?.refetch();
      void fetch("/api/communications/status")
        .then(async (res) => {
          const json = (await res.json()) as {
            senderPreview?: SenderPreview | null;
            defaultFromDomain?: string | null;
          };
          if (res.ok) {
            setSenderPreview(json.senderPreview ?? null);
            if (json.defaultFromDomain) setDefaultFromDomain(json.defaultFromDomain);
          }
        })
        .catch(() => undefined);
      gestToast.successOnce("comm-settings", "Impostazioni comunicazioni salvate.");
    } catch (e) {
      gestToast.errorOnce("comm-settings", e);
    } finally {
      setSaving(false);
    }
  };

  const officinaLabel = readOfficinaDestinatarioOrdiniFromRows(settingsQ?.data?.rows).label.trim();
  const previewName = draft.senderDisplayName.trim() || senderPreview?.displayName || officinaLabel || "CAB Gestionale";
  const previewFrom =
    draft.senderFromEmail.trim() || senderPreview?.fromEmail || (defaultFromDomain ? `noreply@${defaultFromDomain}` : "—");
  const previewReply = draft.replyToEmail.trim() || senderPreview?.replyTo || "—";

  return (
    <SettingsListFrame>
      <SettingsSectionHeader title="Comunicazioni" description="Email automatiche a clienti e fornitori." />
      <div className="flex gap-2 border-b border-[color:var(--cab-border)] px-4 pb-2">
        <button
          type="button"
          className={`text-sm font-medium ${subTab === "config" ? "text-[color:var(--cab-primary)]" : "text-[color:var(--cab-text-muted)]"}`}
          onClick={() => setSubTab("config")}
        >
          Configurazione
        </button>
        <button
          type="button"
          className={`text-sm font-medium ${subTab === "storico" ? "text-[color:var(--cab-primary)]" : "text-[color:var(--cab-text-muted)]"}`}
          onClick={() => setSubTab("storico")}
        >
          Storico
        </button>
      </div>

      {subTab === "config" ? (
        <div className="space-y-4 p-4">
          {resendConfigured === false ? (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-[color:var(--cab-text)]">
              Resend non è configurato sul server. Aggiungi <code className="text-xs">RESEND_API_KEY</code> e{" "}
              <code className="text-xs">RESEND_FROM</code> in <code className="text-xs">.env.local</code> (dev) o nelle
              variabili d&apos;ambiente Vercel, poi riavvia il server. Il mittente deve usare un dominio verificato in
              Resend.
            </p>
          ) : null}
          <fieldset className="space-y-3 rounded-lg border border-[color:var(--cab-border)] p-4">
            <legend className="text-sm font-medium text-[color:var(--cab-text)]">Mittente email</legend>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- branding logo URL from settings (not a static import) */}
              <img
                src={logoUrl}
                alt=""
                className="h-14 w-14 shrink-0 rounded-full border-2 border-[color:var(--cab-primary)] object-cover"
                width={56}
                height={56}
              />
              <p className="text-xs text-[color:var(--cab-text-muted)]">
                Icona nelle email: logo personalizzato da Branding oppure icona PWA (come le notifiche push).
              </p>
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[color:var(--cab-text-muted)]">Nome mittente</span>
              <input
                className={dsInput}
                value={draft.senderDisplayName}
                maxLength={TEXT_SHORT}
                placeholder={officinaLabel || "CAB Gestionale Officina"}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, senderDisplayName: sliceInputValue(e.target.value, TEXT_SHORT) }))
                }
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[color:var(--cab-text-muted)]">Email mittente (From)</span>
              <input
                className={dsInput}
                type="email"
                value={draft.senderFromEmail}
                maxLength={TEXT_SHORT}
                placeholder={defaultFromDomain ? `noreply@${defaultFromDomain}` : "noreply@dominio-verificato.it"}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, senderFromEmail: sliceInputValue(e.target.value, TEXT_SHORT) }))
                }
              />
              <p className="text-xs text-[color:var(--cab-text-muted)]">
                Deve usare il dominio verificato in Resend ({defaultFromDomain ?? "vedi RESEND_FROM"}).
              </p>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[color:var(--cab-text-muted)]">Email di risposta (Reply-To)</span>
              <input
                className={dsInput}
                type="email"
                value={draft.replyToEmail}
                maxLength={TEXT_SHORT}
                placeholder="officina@azienda.it"
                onChange={(e) =>
                  setDraft((d) => ({ ...d, replyToEmail: sliceInputValue(e.target.value, TEXT_SHORT) }))
                }
              />
            </label>
            <p className="text-xs text-[color:var(--cab-text-muted)]">
              Anteprima mittente: <span className="text-[color:var(--cab-text)]">{previewName}</span> &lt;{previewFrom}&gt;
              {previewReply !== "—" ? (
                <>
                  {" "}
                  — risposte a <span className="text-[color:var(--cab-text)]">{previewReply}</span>
                </>
              ) : null}
            </p>
          </fieldset>
          <fieldset className="space-y-3 rounded-lg border border-[color:var(--cab-border)] p-4">
            <legend className="text-sm font-medium text-[color:var(--cab-text)]">Mittente ordini ai fornitori</legend>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[color:var(--cab-text-muted)]">Nome mittente</span>
              <input
                className={dsInput}
                value={draft.supplierOrderSender.displayName}
                maxLength={TEXT_SHORT}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    supplierOrderSender: {
                      ...d.supplierOrderSender,
                      displayName: sliceInputValue(e.target.value, TEXT_SHORT),
                    },
                  }))
                }
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[color:var(--cab-text-muted)]">Email mittente (From)</span>
              <input
                className={dsInput}
                type="email"
                value={draft.supplierOrderSender.fromEmail}
                maxLength={TEXT_SHORT}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    supplierOrderSender: {
                      ...d.supplierOrderSender,
                      fromEmail: sliceInputValue(e.target.value, TEXT_SHORT),
                    },
                  }))
                }
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[color:var(--cab-text-muted)]">Reply-To ordini fornitori</span>
              <input
                className={dsInput}
                type="email"
                value={draft.supplierOrderSender.replyToEmail}
                maxLength={TEXT_SHORT}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    supplierOrderSender: {
                      ...d.supplierOrderSender,
                      replyToEmail: sliceInputValue(e.target.value, TEXT_SHORT),
                    },
                  }))
                }
              />
            </label>
          </fieldset>
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">Modalità Test</span>
            <input type="checkbox" checked={draft.testMode} onChange={(e) => setDraft((d) => ({ ...d, testMode: e.target.checked }))} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[color:var(--cab-text-muted)]">Email di test</span>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                className={`${dsInput} min-w-0 flex-1`}
                value={draft.testEmailAddress}
                maxLength={TEXT_SHORT}
                placeholder="nome@email.it"
                onChange={(e) => setDraft((d) => ({ ...d, testEmailAddress: sliceInputValue(e.target.value, TEXT_SHORT) }))}
              />
              <button
                type="button"
                className={`${dsBtnNeutralForm} shrink-0 whitespace-nowrap disabled:opacity-50`}
                disabled={testSending || !draft.testEmailAddress.trim()}
                onClick={() => void sendTestEmail()}
              >
                {testSending ? "Invio…" : "Invia email di prova"}
              </button>
            </div>
          </label>
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">Invio Email ai Clienti</span>
            <input
              type="checkbox"
              checked={draft.clientEmailEnabled}
              onChange={(e) => setDraft((d) => ({ ...d, clientEmailEnabled: e.target.checked }))}
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">Simulazione invio</span>
            <input
              type="checkbox"
              checked={draft.dryRunEnabled}
              onChange={(e) => setDraft((d) => ({ ...d, dryRunEnabled: e.target.checked }))}
            />
          </label>
          <p className="text-xs text-[color:var(--cab-text-muted)]">
            Simulazione: genera log e template senza chiamare Resend. Con Modalità Test attiva le email vanno solo all&apos;indirizzo di test.
          </p>
          <button type="button" className="rounded-md bg-[color:var(--cab-primary)] px-3 py-2 text-sm text-white disabled:opacity-50" disabled={saving} onClick={() => void save()}>
            {saving ? "Salvataggio…" : "Salva"}
          </button>
        </div>
      ) : (
        <div className="p-4">
          {logsLoading ? (
            <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-[color:var(--cab-text-muted)]">Nessuna comunicazione registrata.</p>
          ) : (
            <ul className="divide-y divide-[color:var(--cab-border)]">
              {logs.map((l) => (
                <li key={l.id} className="py-2 text-sm">
                  <div className="font-medium">{l.subject || l.template_key}</div>
                  <div className="text-[color:var(--cab-text-muted)]">
                    {new Date(l.created_at).toLocaleString("it-IT")} — {l.status} — {l.actual_recipient_email || l.intended_recipient_email || "—"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </SettingsListFrame>
  );
}
