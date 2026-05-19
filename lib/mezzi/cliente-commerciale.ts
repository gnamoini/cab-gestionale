"use client";

import { useMemo } from "react";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";

/** Normalizza chiave cliente per mappa sconti (trim + lowercase). */
export function normClienteKey(nome: string): string {
  return nome.trim().toLowerCase();
}

export function clampScontoRicambiPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n * 10) / 10));
}

export function parseScontoRicambiByCliente(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const key = normClienteKey(k);
    if (!key) continue;
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    out[key] = clampScontoRicambiPercent(n);
  }
  return out;
}

/** Sconto ricambi % configurato per cliente (0 se assente). */
export function getScontoRicambiCliente(liste: MezziListePrefs, clienteNome: string): number {
  const key = normClienteKey(clienteNome);
  if (!key) return 0;
  const map = liste.scontoRicambiByCliente ?? {};
  return clampScontoRicambiPercent(map[key] ?? 0);
}

export function setScontoRicambiCliente(
  liste: MezziListePrefs,
  clienteNome: string,
  percent: number,
): MezziListePrefs {
  const key = normClienteKey(clienteNome);
  if (!key) return liste;
  return {
    ...liste,
    scontoRicambiByCliente: {
      ...(liste.scontoRicambiByCliente ?? {}),
      [key]: clampScontoRicambiPercent(percent),
    },
  };
}

export function removeScontoRicambiCliente(liste: MezziListePrefs, clienteNome: string): MezziListePrefs {
  const key = normClienteKey(clienteNome);
  if (!key || !liste.scontoRicambiByCliente) return liste;
  const next = { ...liste.scontoRicambiByCliente };
  delete next[key];
  return { ...liste, scontoRicambiByCliente: next };
}

export function registerClienteInListe(liste: MezziListePrefs, clienteNome: string): MezziListePrefs {
  const trimmed = clienteNome.trim();
  if (!trimmed) return liste;
  const clienti = liste.clienti.includes(trimmed) ? liste.clienti : [...liste.clienti, trimmed];
  const key = normClienteKey(trimmed);
  const scontoRicambiByCliente = { ...(liste.scontoRicambiByCliente ?? {}) };
  if (!(key in scontoRicambiByCliente)) scontoRicambiByCliente[key] = 0;
  return { ...liste, clienti, scontoRicambiByCliente };
}
