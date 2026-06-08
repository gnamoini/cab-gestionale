"use client";

import { useEffect, useMemo, useState } from "react";
import { LoadingButton } from "@/components/design-system";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { gestionaleFormFocusScopeProps } from "@/components/gestionale/gestionale-form-focus-scope";
import { runSubmitFromGetter, useSubmitLock } from "@/lib/forms/form-engine";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { FormField } from "@/components/gestionale/schede/gestionale-form-section";
import { useUsernameAvailability } from "@/src/hooks/use-username-availability";
import { sanitizeUsernameInput, usernameFieldError } from "@/src/lib/auth/username";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { dsBtnDanger, dsBtnNeutral, dsInput, dsModalFormFooter } from "@/lib/ui/design-system";

export type SecurityEditProfileValues = {
  nome: string;
  username: string;
};

type Props = {
  open: boolean;
  userId: string;
  initialNome: string;
  initialUsername: string;
  userEmail?: string;
  readOnly?: boolean;
  canDelete?: boolean;
  pending?: boolean;
  deletePending?: boolean;
  onClose: () => void;
  onSave: (values: SecurityEditProfileValues) => void;
  onDelete?: () => void | Promise<void>;
};

export function SecurityEditNameModal({
  open,
  userId,
  initialNome,
  initialUsername,
  userEmail,
  readOnly = false,
  canDelete = false,
  pending,
  deletePending,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [nome, setNome] = useState(initialNome);
  const [username, setUsername] = useState(initialUsername);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setNome(initialNome);
      setUsername(initialUsername);
      setDeleteConfirmOpen(false);
    }
  }, [open, initialNome, initialUsername]);

  const usernameErr = useMemo(() => usernameFieldError(username), [username]);
  const usernameAvailability = useUsernameAvailability(username, {
    enabled: open && !readOnly,
    excludeUserId: userId,
  });

  const usernameAvailabilityErr =
    usernameAvailability === "taken"
      ? "Username già utilizzato."
      : usernameAvailability === "checking"
        ? "Attendi la verifica del nome utente."
        : null;

  const canSave =
    !readOnly &&
    nome.trim().length > 0 &&
    !usernameErr &&
    !usernameAvailabilityErr &&
    usernameAvailability !== "checking" &&
    !pending &&
    !deletePending;

  const busy = Boolean(pending || deletePending);
  const submitLock = useSubmitLock();

  async function handleConfirmDelete() {
    if (!onDelete || busy) return;
    setDeleteConfirmOpen(false);
    await onDelete();
  }

  if (!open) return null;

  const displayName = initialNome.trim() || userEmail || "questo utente";

  return (
    <>
      <GestionaleModalShell
        modalSize="formSmall"
        title="Modifica profilo"
        titleId="security-edit-profile-title"
        onRequestClose={() => {
          if (!busy) onClose();
        }}
      >
        <form
          id="security-edit-name-form"
          {...gestionaleFormFocusScopeProps()}
          className={`${gestionaleModalBodyFlexClass} overflow-hidden`}
          onSubmit={(e) => {
            e.preventDefault();
            void runSubmitFromGetter(
              e.currentTarget,
              submitLock,
              () => ({
                nome,
                username,
                readOnly,
                pending: Boolean(pending),
                deletePending: Boolean(deletePending),
                usernameAvailability,
              }),
              (snap) => {
                const trimmedNome = snap.nome.trim();
                const normalizedUsername = sanitizeUsernameInput(snap.username);
                const snapUsernameErr = usernameFieldError(normalizedUsername);
                const snapCanSave =
                  !snap.readOnly &&
                  trimmedNome.length > 0 &&
                  !snapUsernameErr &&
                  snap.usernameAvailability !== "taken" &&
                  snap.usernameAvailability !== "checking" &&
                  !snap.pending &&
                  !snap.deletePending;
                if (!snapCanSave || snapUsernameErr) return;
                onSave({ nome: trimmedNome, username: normalizedUsername });
              },
            );
          }}
        >
          <GestionaleModalScrollBody className="space-y-4">
            {userEmail ? (
              <p className="text-xs text-[color:var(--cab-text-muted)]">
                Account: <span className="font-medium text-[color:var(--cab-text)]">{userEmail}</span>
              </p>
            ) : null}

            <FormField label="Nome visualizzato" required>
              <input
                className={`${dsInput} w-full`}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoComplete="name"
                required
                disabled={busy || readOnly}
                autoFocus
              />
            </FormField>

            <FormField label="Nome utente (login)" required>
              <input
                className={`${dsInput} w-full font-mono text-sm`}
                value={username}
                onChange={(e) => setUsername(sanitizeUsernameInput(e.target.value))}
                autoComplete="username"
                required
                disabled={busy || readOnly}
                spellCheck={false}
                aria-invalid={usernameErr || usernameAvailability === "taken" ? true : undefined}
              />
              {usernameErr ? (
                <p className="mt-1 text-xs text-[color:var(--cab-danger)]">{usernameErr}</p>
              ) : usernameAvailability === "checking" ? (
                <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">Verifica disponibilità…</p>
              ) : usernameAvailability === "available" ? (
                <p className="mt-1 text-xs text-[color:var(--cab-success)]">Username disponibile.</p>
              ) : usernameAvailability === "taken" ? (
                <p className="mt-1 text-xs text-[color:var(--cab-danger)]">Username già utilizzato.</p>
              ) : (
                <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">
                  3–32 caratteri: lettere minuscole, numeri, punto, trattino, underscore.
                </p>
              )}
            </FormField>
          </GestionaleModalScrollBody>

          <footer
            className={`${dsModalFormFooter} flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between`}
          >
            {canDelete && onDelete ? (
              <button
                type="button"
                className={`${dsBtnDanger} min-h-11 w-full justify-center sm:w-auto`}
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={busy}
              >
                {deletePending ? "Eliminazione…" : "Elimina utente"}
              </button>
            ) : (
              <span className="hidden sm:block" aria-hidden />
            )}

            <div className="flex w-full min-w-0 gap-2 sm:w-auto sm:justify-end">
              <button
                type="button"
                className={`${dsBtnNeutral} min-h-11 min-w-0 flex-1 justify-center sm:min-w-[6.5rem] sm:flex-none`}
                onClick={onClose}
                disabled={busy}
              >
                Annulla
              </button>
              {!readOnly ? (
                <LoadingButton
                  type="submit"
                  loading={Boolean(pending)}
                  preset="salva"
                  loadingLabel="Salvataggio…"
                  className="min-h-11 min-w-0 flex-1 justify-center sm:min-w-[6.5rem] sm:flex-none"
                  disabled={!canSave}
                >
                  Applica
                </LoadingButton>
              ) : null}
            </div>
          </footer>
        </form>
      </GestionaleModalShell>

      <GestionaleConfirmDialog
        open={deleteConfirmOpen}
        title="Elimina utente"
        message={`Eliminare definitivamente ${displayName}? L'operazione è irreversibile e rimuove accesso e profilo.`}
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        destructive
        pending={deletePending}
        layerClassName="z-[120]"
        onCancel={() => {
          if (!deletePending) setDeleteConfirmOpen(false);
        }}
        onConfirm={() => void handleConfirmDelete()}
      />
    </>
  );
}
