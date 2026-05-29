"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/design-system/modal";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { GESTIONALE_TOAST } from "@/src/lib/ux/gestionale-toast-messages";
import { createUserByAdminAction } from "@/src/actions/admin-users";
import { useUsernameAvailability } from "@/src/hooks/use-username-availability";
import { sanitizeUsernameInput, usernameFieldError } from "@/src/lib/auth/username";
import { invalidateRuntimeTruth } from "@/src/lib/runtime/truth-layer/invalidate-runtime-truth";
import { APP_ROLES, roleLabel, type AppRole } from "@/src/lib/auth/permissions";
import {
  dsBtnGhost,
  dsBtnPrimary,
  dsInput,
  dsSectionTitle,
  gestionaleSelectNativePlainClass,
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
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ruolo, setRuolo] = useState<AppRole>("operatore");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const usernameAvailability = useUsernameAvailability(username, { enabled: open });

  useEffect(() => {
    if (!open) return;
    setNome("");
    setUsername("");
    setEmail("");
    setPassword("");
    setRuolo("operatore");
    setError(null);
    setPending(false);
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const usernameErr = usernameFieldError(username);
    if (usernameErr) {
      setError(usernameErr);
      return;
    }
    if (usernameAvailability === "taken") {
      setError("Username già utilizzato.");
      return;
    }
    if (usernameAvailability === "checking") {
      setError("Attendi la verifica del nome utente.");
      return;
    }
    setPending(true);
    const res = await createUserByAdminAction({
      nome: nome.trim(),
      username: username.trim(),
      email: email.trim(),
      password,
      ruolo,
    });
    setPending(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    await invalidateRuntimeTruth({ reason: "roleOrPermissionsChanged", queryClient: qc });
    gestToast.successOnce("security-create-user", GESTIONALE_TOAST.successCreated);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!pending) onClose();
      }}
      title="Nuovo utente"
      panelClassName="max-w-lg"
      footer={
        <>
          <button type="button" className={dsBtnGhost} onClick={() => onClose()} disabled={pending}>
            Annulla
          </button>
          <button
            type="submit"
            form="security-create-user-form"
            className={dsBtnPrimary}
            disabled={pending || usernameAvailability === "taken" || usernameAvailability === "checking"}
          >
            {pending ? "Creazione…" : "Crea utente"}
          </button>
        </>
      }
    >
      <p className="mb-4 text-xs text-[color:var(--cab-text-muted)]">
        Creazione tramite Supabase Auth e tabella <code className="rounded bg-[var(--cab-surface-2)] px-1">profiles</code>.
        Ruoli ufficiali: admin, manager, operatore, cliente e guest.
      </p>
      <form id="security-create-user-form" className="flex flex-col gap-3" onSubmit={(ev) => void handleSubmit(ev)}>
        <label className="block min-w-0">
          <span className={dsSectionTitle}>Nome</span>
          <input
            className={`${dsInput} mt-1 w-full`}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoComplete="name"
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
            minLength={6}
            disabled={pending}
          />
          <span className="mt-0.5 block text-[10px] text-[color:var(--cab-text-muted)]">
            Minimo 6 caratteri (requisito Supabase Auth).
          </span>
        </label>
        <label className="block min-w-0">
          <span className={dsSectionTitle}>Ruolo profilo</span>
          <select
            className={`${gestionaleSelectNativePlainClass} mt-1 w-full`}
            value={ruolo}
            onChange={(e) => setRuolo(e.target.value as AppRole)}
            disabled={pending}
          >
            {RUOLI.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        {error ? (
          <p className="rounded-md border border-[color:color-mix(in_srgb,var(--cab-danger)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_8%,var(--cab-surface))] px-2 py-1.5 text-xs text-[color:color-mix(in_srgb,var(--cab-danger)_92%,var(--cab-text))]">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
