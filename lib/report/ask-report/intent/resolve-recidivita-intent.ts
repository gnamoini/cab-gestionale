import { normalizeAskMessage } from "@/lib/report/ask-report/intent/normalize-ask-message";
import type { AskRecidivitaRankBy, AskRecidivitaSubject } from "@/lib/report/ask-report/recidivita/load-ask-recidivita.server";
import type { RecidivitaWindowDays } from "@/lib/report/recidivita/types";

export function isCasualGreetingOrHelp(message: string): boolean {
  const text = normalizeAskMessage(message);
  if (/^(ciao|salve|buongiorno|buonasera|hey|hi|hello)\b/.test(text)) return true;
  if (/^come\s+(stai|va)\b/.test(text)) return true;
  if (/\bcosa\s+puoi\s+fare\b|\baiuto\b|\bhelp\b/.test(text)) return true;
  return false;
}

export function buildGreetingAnswer(): string {
  return [
    "Ciao! Sono l'assistente del Report.",
    "Posso rispondere su fatturato, incassi, chiusure, preventivi, ore lavorate, tempi di chiusura, recidività mezzi e ranking operatori.",
    "Esempi: «quante chiusure ad agosto», «fatturato e incassi a luglio», «qual è l'addetto con più mezzi recidivi», «andamento fatturato».",
  ].join(" ");
}

export function wantsRecidivitaQuery(message: string): boolean {
  const text = normalizeAskMessage(message);
  return (
    /\brecidiv/i.test(text) ||
    /\brientr/i.test(text) ||
    /\britorn/i.test(text) ||
    (/\bmezzi\b/.test(text) && /\b(addett|operat|tecnico)\b/.test(text)) ||
    (/\b(addett|operat|tecnico)\b/.test(text) && /\b(pi[uù]|maggior|top|chi)\b/.test(text) && /\bmezz/i.test(text))
  );
}

export function resolveRecidivitaSubject(message: string): AskRecidivitaSubject {
  const text = normalizeAskMessage(message);
  if (/\b(addett|operat|tecnic)/.test(text) || /\bchi\s+(ha|e|è)\b/.test(text)) return "operatore";
  if (/\bmezz/i.test(text) && !/\bflotta\b/.test(text)) return "mezzo";
  if (/\bflotta\b|\bindice\s+recidiv/i.test(text)) return "fleet";
  return "operatore";
}

export function resolveRecidivitaRankBy(message: string): AskRecidivitaRankBy {
  const text = normalizeAskMessage(message);
  if (/\bmezzi\s+(con\s+)?(ritorn|recidiv|rientr)/i.test(text) || /\bpi[uù]\s+mezzi\b/.test(text)) {
    return "mezzi_con_ritorno";
  }
  if (/\brischio\b|\bindice\s+rischio\b|\bqualita\b/.test(text)) return "risk_index";
  return "ritorni";
}

export function resolveRecidivitaWindowDays(message: string): RecidivitaWindowDays {
  const text = normalizeAskMessage(message);
  if (/\b90\s*gg\b|\b90\s+giorni\b|\btre\s+mesi\b/.test(text)) return 90;
  if (/\b12\s+mesi\b|\b365\b|\banno\b/.test(text)) return 365;
  return 30;
}
