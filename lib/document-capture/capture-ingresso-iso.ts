import { parseItalianDayDisplayToIso } from "@/lib/ui/italian-date-input-mask";

/** Data ingresso IT (gg/mm/aaaa) → ISO noon UTC per persistenza lavorazione. */
export function parseCaptureIngressoIso(dataIngresso: string): string | null {
  const parsed = parseItalianDayDisplayToIso(dataIngresso);
  if (!parsed.ok) return null;
  const ymd = parsed.iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  return `${ymd}T12:00:00.000Z`;
}
