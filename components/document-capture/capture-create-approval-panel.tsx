"use client";

/** Checkbox approvazione creazione entità (Fase 3 UI shell). */
export function CaptureCreateApprovalPanel() {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" disabled />
      Confermo creazione entità proposte (dry-run)
    </label>
  );
}
