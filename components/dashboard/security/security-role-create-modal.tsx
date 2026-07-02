"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createRoleAction } from "@/src/actions/security-roles-permissions";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { dsBtnGhost, dsBtnPrimary, dsInput, dsLabel } from "@/lib/ui/design-system";
import type { RoleRow } from "@/src/types/supabase-tables";

type Props = {
  open: boolean;
  onClose: () => void;
  roles: RoleRow[];
  onCreated: (roleKey: string) => void;
};

export function SecurityRoleCreateModal({ open, onClose, roles, onCreated }: Props) {
  const gestToast = useGestionaleToast();
  const queryClient = useQueryClient();
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cloneFrom, setCloneFrom] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    setSaving(true);
    const res = await createRoleAction({
      key: key.trim(),
      name: name.trim(),
      description: description.trim() || null,
      cloneFromRoleKey: cloneFrom || null,
    });
    setSaving(false);
    if (!res.ok) {
      gestToast.error(res.message);
      return;
    }
    gestToast.successDone();
    setKey("");
    setName("");
    setDescription("");
    setCloneFrom("");
    void queryClient.invalidateQueries({ queryKey: ["security", "roles"] });
    onCreated(res.role.key);
  }

  return (
    open ? (
    <GestionaleModalShell onRequestClose={onClose} title="Nuovo ruolo" titleId="security-role-create-title" modalSize="formSmall">
      <div className="space-y-3">
        <div>
          <label className={dsLabel} htmlFor="role-key">Key (univoca)</label>
          <input id="role-key" className={dsInput} value={key} onChange={(e) => setKey(e.target.value)} placeholder="es. capo_officina" />
        </div>
        <div>
          <label className={dsLabel} htmlFor="role-name">Nome</label>
          <input id="role-name" className={dsInput} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className={dsLabel} htmlFor="role-desc">Descrizione</label>
          <input id="role-desc" className={dsInput} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className={dsLabel} htmlFor="role-clone">Clona permessi da</label>
          <select id="role-clone" className={dsInput} value={cloneFrom} onChange={(e) => setCloneFrom(e.target.value)}>
            <option value="">Nessuno</option>
            {roles.map((r) => (
              <option key={r.key} value={r.key}>{r.name}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={dsBtnGhost} onClick={onClose}>Annulla</button>
          <button type="button" className={dsBtnPrimary} disabled={saving || !key.trim() || !name.trim()} onClick={() => void handleCreate()}>
            {saving ? "Creazione…" : "Crea ruolo"}
          </button>
        </div>
      </div>
    </GestionaleModalShell>
    ) : null
  );
}
