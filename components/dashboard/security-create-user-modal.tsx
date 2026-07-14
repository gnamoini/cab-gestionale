"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { GESTIONALE_TOAST } from "@/src/lib/ux/gestionale-toast-messages";
import { createUserByAdminAction } from "@/src/actions/admin-users";
import { useUsernameAvailability } from "@/src/hooks/use-username-availability";
import { sanitizeUsernameInput, usernameFieldError } from "@/src/lib/auth/username";
import { invalidateRuntimeTruth } from "@/src/lib/runtime/truth-layer/invalidate-runtime-truth";
import { APP_ROLES, roleLabel, type AppRole } from "@/src/lib/auth/permissions";
import { GlobalSelect, GlobalSettingsListSelect, gestionaleFormFocusScopeProps } from "@/components/gestionale/global-input";
import { SecurityInlineNotice } from "@/components/dashboard/security/security-inline-notice";
import {
  buildKnownClientiSet,
  fieldClienteAssociationMessage,
  validateClienteAssociationForRole,
} from "@/src/lib/auth/cliente-portal-scope";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { runSubmitFromGetter, useSubmitLock } from "@/lib/forms/form-engine";
import {
  dsBtnNeutral,
  dsBtnPrimary,
  dsInput,
  dsSectionTitle,
} from "@/lib/ui/design-system";

const RUOLI: { value: AppRole; label: string }[] = APP_ROLES.map((role) => ({ value: role, label: roleLabel(role) }));

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SecurityCreateUserModal({ open, onClose }: Props) {
  const gestToast = useGestionaleToast();
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ruolo, setRuolo] = useState<AppRole>("operatore");
  const [clienteRef, setClienteRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const usernameAvailability = useUsernameAvailability(username, { enabled: open });
  const globalOpts = useGlobalOptions({ enabled: open, debugTag: "SecurityCreateUser" });
  const knownClienti = buildKnownClientiSet(globalOpts.mezziListe.clienti ?? []);
  const clienteAssociationErr =
    ruolo === "cliente" ? validateClienteAssociationForRole(ruolo, clienteRef.trim() || null, knownClienti) : null;
  const submitLock = useSubmitLock();

  useEffect(() => {
    if (!open) return;
    setNome("");
    setCognome("");
    setUsername("");
    setEmail("");
    setPassword("");
    setRuolo("operatore");
    setClienteRef("");
    setError(null);
    setPending(false);
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    await runSubmitFromGetter(
      e.currentTarget,
      submitLock,
      () => ({
        nome,
        cognome,
        username,
        email,
        password,
        ruolo,
        clienteRef,
        usernameAvailability,
        knownClienti,
      }),
      async (snap) => {
        setError(null);
        const usernameErr = usernameFieldError(snap.username);
        if (usernameErr) {
          setError(usernameErr);
          return;
        }
        if (snap.usernameAvailability === "taken") {
          setError("Username già utilizzato.");
          return;
        }
        if (snap.usernameAvailability === "checking") {
          setError("Attendi la verifica del nome utente.");
          return;
        }
        const clienteErr = validateClienteAssociationForRole(
          snap.ruolo,
          snap.clienteRef.trim() || null,
          snap.knownClienti,
        );
        if (clienteErr) {
          setError(clienteErr);
          return;
        }

        setPending(true);
        const res = await createUserByAdminAction({
          nome: snap.nome.trim(),
          cognome: snap.cognome.trim(),
          username: snap.username.trim(),
          email: snap.email.trim(),
          password: snap.password,
          ruolo: snap.ruolo,
          clienteRef: snap.clienteRef.trim() || null,
        });
        setPending(false);
        if (!res.ok) {
          setError(res.message);
          return;
        }
        await invalidateRuntimeTruth({ reason: "roleOrPermissionsChanged", queryClient: qc });
        gestToast.successOnce("security-create-user", GESTIONALE_TOAST.successCreated);
        onClose();
      },
    );
  }

  if (!open) return null;

  return (
    <GestionaleModalShell
      modalSize="formSmall"
      title="Nuovo utente"
      titleId="security-create-user-title"
      onRequestClose={() => {
        if (!pending) onClose();
      }}
      footer={
        <div className="flex w-full min-w-0 justify-end gap-2">
          <button type="button" className={dsBtnNeutral} onClick={() => onClose()} disabled={pending}>
            Annulla
          </button>
          <button
            type="submit"
            form="security-create-user-form"
            className={dsBtnPrimary}
            disabled={
              pending ||
              usernameAvailability === "taken" ||
              usernameAvailability === "checking" ||
              !!clienteAssociationErr
            }
          >
            {pending ? "Creazione…" : "Crea utente"}
          </button>
        </div>
      }
    >
      <GestionaleModalScrollBody className={gestionaleModalBodyFlexClass}>
      <p className="mb-4 text-xs text-[color:var(--cab-text-muted)]">
        Creazione tramite Supabase Auth e tabella <code className="rounded bg-[var(--cab-surface-2)] px-1">profiles</code>.
        Ruoli ufficiali: admin, manager, operatore, cliente e guest.
      </p>
      <form
        id="security-create-user-form"
        className="flex min-w-0 flex-col gap-3"
        {...gestionaleFormFocusScopeProps()}
        onSubmit={(ev) => void handleSubmit(ev)}
      >
        <label className="block min-w-0">
          <span className={dsSectionTitle}>Nome</span>
          <input
            className={`${dsInput} mt-1 w-full`}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoComplete="given-name"
            required
            disabled={pending}
          />
        </label>
        <label className="block min-w-0">
          <span className={dsSectionTitle}>Cognome</span>
          <input
            className={`${dsInput} mt-1 w-full`}
            value={cognome}
            onChange={(e) => setCognome(e.target.value)}
            autoComplete="family-name"
            required
            disabled={pending}
          />
        </label>
        <label className="block min-w-0">
          <span className={dsSectionTitle}>Nome utente</span>
          <input
            className={`${dsInput} mt-1 w-full`}
            type="text"
            value={username}
            onChange={(e) => setUsername(sanitizeUsernameInput(e.target.value))}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="es. mario.rossi"
            required
            minLength={3}
            maxLength={32}
            pattern="[a-z0-9][a-z0-9._-]*[a-z0-9]"
            disabled={pending}
            aria-invalid={usernameAvailability === "taken" || usernameAvailability === "invalid"}
          />
          {usernameAvailability === "checking" ? (
            <span className="mt-0.5 block text-[10px] text-[color:var(--cab-text-muted)]">Verifica disponibilità…</span>
          ) : usernameAvailability === "available" ? (
            <span className="mt-0.5 block text-[10px] text-[color:var(--cab-success)]">Username disponibile.</span>
          ) : usernameAvailability === "taken" ? (
            <span className="mt-0.5 block text-[10px] font-medium text-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))]">
              Username già utilizzato.
            </span>
          ) : usernameAvailability === "invalid" ? (
            <span className="mt-0.5 block text-[10px] font-medium text-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))]">
              Username non valido.
            </span>
          ) : (
            <span className="mt-0.5 block text-[10px] text-[color:var(--cab-text-muted)]">
              Univoco in azienda. Usato per il login insieme all&apos;email (3–32 caratteri, minuscolo).
            </span>
          )}
        </label>
        <label className="block min-w-0">
          <span className={dsSectionTitle}>Email</span>
          <input
            className={`${dsInput} mt-1 w-full`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            required
            disabled={pending}
          />
        </label>
        <label className="block min-w-0">
          <span className={dsSectionTitle}>Password</span>
          <input
            className={`${dsInput} mt-1 w-full`}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            disabled={pending}
          />
          <span className="mt-0.5 block text-[10px] text-[color:var(--cab-text-muted)]">
            Minimo 8 caratteri.
          </span>
        </label>
        <label className="block min-w-0">
          <span className={dsSectionTitle}>Ruolo profilo</span>
          <div className="mt-1">
            <GlobalSelect
              selectOnly
              variant="default"
              value={ruolo}
              onChange={(v) => setRuolo(v as AppRole)}
              disabled={pending}
              aria-label="Ruolo profilo"
              items={RUOLI.map((r) => ({ value: r.value, label: r.label }))}
            />
          </div>
        </label>
        <label className="block min-w-0">
          <span className={dsSectionTitle}>
            Cliente associato{ruolo === "cliente" ? " (obbligatorio)" : ""}
          </span>
          <div className="mt-1">
            <GlobalSettingsListSelect
              variant="default"
              listKey="mezzi:clienti"
              value={clienteRef}
              onChange={(v) => {
                if (ruolo === "cliente" && !v.trim()) return;
                setClienteRef(v);
              }}
              disabled={pending}
              aria-label="Cliente associato"
              aria-invalid={ruolo === "cliente" && !!clienteAssociationErr}
              placeholder={ruolo === "cliente" ? "Seleziona cliente…" : "—"}
              required={ruolo === "cliente"}
              selectorDomain="security"
              dynamicList
            />
          </div>
          {clienteAssociationErr ? (
            <div className="mt-1.5">
              <SecurityInlineNotice variant="warning" appearance="inline">
                {fieldClienteAssociationMessage(clienteAssociationErr) ?? clienteAssociationErr}
              </SecurityInlineNotice>
            </div>
          ) : (
            <span className="mt-0.5 block text-[10px] text-[color:var(--cab-text-muted)]">
              Obbligatorio se il ruolo è Cliente. Limita il portale lavorazioni al cliente scelto.
            </span>
          )}
        </label>

        {error ? (
          <p className="rounded-md border border-[color:color-mix(in_srgb,var(--cab-danger)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_8%,var(--cab-surface))] px-2 py-1.5 text-xs text-[color:color-mix(in_srgb,var(--cab-danger)_92%,var(--cab-text))]">
            {error}
          </p>
        ) : null}
      </form>
      </GestionaleModalScrollBody>
    </GestionaleModalShell>
  );
}
