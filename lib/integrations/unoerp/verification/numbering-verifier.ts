export function verifyDdtNumber(opts: {
  cab: { anno: number; serie: string; numero: number };
  unoerp: { anno: number; serie: string; numero: number };
}): { ok: true } | { ok: false; code: "UNOERP_NUMBER_MISMATCH" } {
  if (
    opts.cab.anno !== opts.unoerp.anno ||
    opts.cab.serie.trim().toLowerCase() !== opts.unoerp.serie.trim().toLowerCase() ||
    opts.cab.numero !== opts.unoerp.numero
  ) {
    return { ok: false, code: "UNOERP_NUMBER_MISMATCH" };
  }
  return { ok: true };
}
