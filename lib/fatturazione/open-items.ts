import type { CustomerOpenItemRow } from "@/src/types/supabase-tables";

/**
 * Convenzione segno partite (SSOT):
 * positivo = credito cliente verso azienda
 * negativo = debito cliente verso azienda
 */
export function openItemIsDebit(item: Pick<CustomerOpenItemRow, "remaining_signed">): boolean {
  return item.remaining_signed < 0;
}

export function openItemAbsRemaining(item: Pick<CustomerOpenItemRow, "remaining_signed">): number {
  return Math.abs(item.remaining_signed);
}

export type AgingBucket = "0-30" | "31-60" | "61-90" | "90+";

export function openItemAgingBucket(dueDate: string | null, today = new Date()): AgingBucket | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.floor((t.getTime() - due.getTime()) / 86_400_000);
  if (diff <= 0) return "0-30";
  if (diff <= 30) return "0-30";
  if (diff <= 60) return "31-60";
  if (diff <= 90) return "61-90";
  return "90+";
}

export function openItemDaysOverdue(dueDate: string | null, today = new Date()): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.floor((t.getTime() - due.getTime()) / 86_400_000);
  return Math.max(0, diff);
}
