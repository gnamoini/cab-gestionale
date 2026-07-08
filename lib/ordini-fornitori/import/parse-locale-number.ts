/** Parse numeri IT/INT da testo estratto (es. 1.234,56 / 1,234.56 / 22%). */
export function parseLocaleNumber(
  raw: unknown,
  opts?: { decimals?: number; min?: number; max?: number },
): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return clampRound(raw, opts);
  }

  let s = String(raw ?? "")
    .trim()
    .replace(/[€$%\s]/g, "");
  if (!s) return null;

  const neg = s.startsWith("-");
  if (neg) s = s.slice(1);

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (lastComma >= 0) {
    const after = s.length - lastComma - 1;
    if (after > 0 && after <= 3) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  }

  s = s.replace(/[^\d.-]/g, "");
  if (!s) return null;

  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return clampRound(neg ? -n : n, opts);
}

function clampRound(n: number, opts?: { decimals?: number; min?: number; max?: number }): number | null {
  if (!Number.isFinite(n)) return null;
  let v = n;
  if (opts?.decimals !== undefined) {
    const f = 10 ** opts.decimals;
    v = Math.round(v * f) / f;
  }
  if (opts?.min !== undefined && v < opts.min) return null;
  if (opts?.max !== undefined && v > opts.max) return null;
  return v;
}

export function fieldValue(raw: { value: string | null; confidence: number } | undefined): string {
  return raw?.value?.trim() ?? "";
}

export function fieldConfidence(raw: { value: string | null; confidence: number } | undefined): number {
  const c = raw?.confidence;
  if (typeof c !== "number" || !Number.isFinite(c)) return 0;
  return Math.min(1, Math.max(0, c));
}
