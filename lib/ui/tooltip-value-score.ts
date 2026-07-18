/** Verdict UX per audit tooltip — vedi docs/design-system/TOOLTIP_POLICY.md */
export type TooltipVerdict =
  | "REMOVE_DUPLICATE"
  | "KEEP_INFORMATIONAL"
  | "KEEP_ACCESSIBILITY"
  | "KEEP_CONTEXTUAL"
  | "MANUAL_REVIEW";

export type TooltipTriggerContext = {
  /** Testo visibile nel trigger (escluso sr-only se icon-only). */
  visibleText?: string;
  /** aria-label del trigger. */
  ariaLabel?: string;
  /** Solo icona grafica, nessun testo visibile. */
  iconOnly?: boolean;
  /** Testo troncato — TruncatedTextTooltip. */
  truncated?: boolean;
  /** Controllo disabilitato con spiegazione. */
  disabledHint?: boolean;
  /** Contenuto tooltip non risolvibile staticamente. */
  dynamic?: boolean;
};

/** ponytail: naive length delta + prefix check; upgrade path = token overlap ratio */
export function tooltipValueScore(visible: string, tooltip: string): number {
  const v = visible.trim();
  const t = tooltip.trim();
  if (!t) return 0;
  if (!v) return t.length;
  if (t.localeCompare(v, undefined, { sensitivity: "accent" }) === 0) return 0;
  if (t.length <= v.length && !t.toLowerCase().includes(v.toLowerCase())) return 0;
  const extraChars = Math.max(0, t.length - v.length);
  const hasDistinctWords = t.split(/\s+/).some((w) => w && !v.toLowerCase().includes(w.toLowerCase()));
  return extraChars + (hasDistinctWords ? 10 : 0);
}

function tooltipStartsWithVisible(visible: string, tooltip: string): boolean {
  const v = visible.trim().toLowerCase();
  const t = tooltip.trim().toLowerCase();
  return v.length > 0 && (t.startsWith(v) || t.includes(v));
}

/** Classifica un tooltip rispetto al trigger. */
export function classifyTooltipVerdict(
  visible: string,
  tooltip: string,
  context: TooltipTriggerContext = {},
): TooltipVerdict {
  if (context.dynamic) return "MANUAL_REVIEW";
  if (context.truncated) return "KEEP_INFORMATIONAL";
  if (context.disabledHint) return "KEEP_INFORMATIONAL";

  const t = tooltip.trim();
  if (!t) return "REMOVE_DUPLICATE";

  const v = (context.visibleText ?? visible).trim();
  const aria = context.ariaLabel?.trim() ?? "";
  const score = tooltipValueScore(v || aria, t);

  if (context.iconOnly || (!v && aria)) {
    if (score === 0 && t.localeCompare(aria, undefined, { sensitivity: "accent" }) === 0) {
      return "KEEP_ACCESSIBILITY";
    }
    if (score > 0 || aria) return v ? "KEEP_CONTEXTUAL" : "KEEP_INFORMATIONAL";
    return "KEEP_ACCESSIBILITY";
  }

  if (!v && !aria) {
    return score > 0 ? "KEEP_INFORMATIONAL" : "MANUAL_REVIEW";
  }

  if (score === 0) return "REMOVE_DUPLICATE";
  if (tooltipStartsWithVisible(v, t)) return "KEEP_CONTEXTUAL";
  return "KEEP_INFORMATIONAL";
}

/** Score 0–100: quanto il tooltip aggiunge informazione non già visibile. */
export function tooltipNecessityScore(
  visible: string,
  tooltip: string,
  context: TooltipTriggerContext = {},
): number {
  const t = tooltip.trim();
  if (!t) return 0;

  if (context.truncated) return 85;
  if (context.disabledHint) return 90;

  const v = (context.visibleText ?? visible).trim();
  const aria = context.ariaLabel?.trim() ?? "";
  const ref = v || aria;
  const valueScore = tooltipValueScore(ref, t);

  if (valueScore === 0) {
    if (!ref) return 0;
    return 8;
  }

  if (context.iconOnly || (!v && aria)) {
    if (t.localeCompare(aria, undefined, { sensitivity: "accent" }) === 0) return 12;
    if (valueScore > 25) return 78;
    return 45;
  }

  if (v && tooltipStartsWithVisible(v, t) && t.length > v.length + 12) return 82;
  if (valueScore > 0) return Math.min(92, 48 + Math.min(valueScore, 40));
  return 15;
}

/** Tooltip effettivo da mostrare — undefined se ridondante o poco utile (score < 25). */
export function resolveTooltipContent(
  visible: string,
  tooltip: string,
  context: TooltipTriggerContext = {},
): string | undefined {
  const t = tooltip.trim();
  if (!t) return undefined;
  if (tooltipNecessityScore(visible, t, context) < 25) return undefined;
  const verdict = classifyTooltipVerdict(visible, t, context);
  if (verdict === "REMOVE_DUPLICATE") return undefined;
  return t;
}

/** ponytail: regex/heuristic su espressione AST — upgrade path = data-flow analysis */
export function inferDynamicTooltipNecessity(
  tooltipExpr: string,
  visibleExpr: string,
  context: TooltipTriggerContext = {},
): { score: number; rationale: string } {
  const t = tooltipExpr.trim();
  const v = visibleExpr.trim();

  if (context.truncated || t.includes("TruncatedTextTooltip")) {
    return { score: 88, rationale: "testo troncato — mostra contenuto completo" };
  }
  if (context.disabledHint || /READONLY_PERMISSION_HINT|Sola lettura|non puoi|non disponibile/i.test(t)) {
    return { score: 92, rationale: "hint su controllo disabilitato / sola lettura" };
  }

  if (/formatTimesheet|timesheet|Totale presenze|Totale assenze|oreAssenza|totaleLavorato/i.test(t)) {
    return { score: 90, rationale: "dettaglio timesheet non visibile nella cella" };
  }
  if (/user_agent|userAgent|clienteRef|row\.detail/i.test(t)) {
    return { score: 86, rationale: "testo troncato in tabella sicurezza" };
  }
  if (/heatmap|loadPct|slotScore|carico|Score \$\{/i.test(t)) {
    return { score: 88, rationale: "dettaglio heatmap / carico agenda" };
  }
  if (/validation\.errors|!validation\.ok/i.test(t)) {
    return { score: 85, rationale: "errore validazione su azione disabilitata" };
  }
  if (/needsAddetto|Seleziona un addetto/i.test(t)) {
    return { score: 82, rationale: "spiega perché export è disabilitato" };
  }
  if (/ASSENZA_ALTRO_MOTIVO|hint|tooltipContent|seriesSummary/i.test(t) && !/^\{label\}$/.test(t)) {
    if (/seriesSummary/.test(t)) return { score: 78, rationale: "dettaglio serie ricorrente oltre simbolo ↻" };
    if (/hint|tooltip/.test(t)) return { score: 72, rationale: "hint contestuale dinamico" };
  }
  if (/Imposta come completata|archiviarla|concludiTooltip/i.test(t)) {
    return { score: 80, rationale: "spiega azione icona non ovvio" };
  }
  if (/Crea preventivo da schede|Copia campi|Modifica colore ·/i.test(t)) {
    return { score: 76, rationale: "contesto aggiuntivo oltre etichetta breve" };
  }
  if (/clic per cambiare|pageAccessLabel/i.test(t)) {
    return { score: 74, rationale: "istruzione interazione matrice permessi" };
  }
  if (/Variazione rispetto/i.test(t)) {
    return { score: 78, rationale: "dettaglio KPI periodo precedente" };
  }
  if (/Assegna una marca|File non collegato|unavailableHint/i.test(t)) {
    return { score: 80, rationale: "spiegazione badge stato documento" };
  }
  if (/labelCategoria.*labelTipoFile|·/.test(t) && /doc\.|categoria/i.test(t)) {
    return { score: 70, rationale: "categoria/tipo su icona senza testo" };
  }
  if (/doc\.nome|doc\.filename|session\.title|row\.title|item\.label|r\.label|r\.marca|cliente|utilizzatore/i.test(t)) {
    if (/Truncated|truncate/i.test(v) || context.truncated) {
      return { score: 85, rationale: "nome/file troncato" };
    }
    return { score: 82, rationale: "probabile testo troncato (expr dinamica)" };
  }
  if (/Notifiche \(\$\{unreadCount\}\)|Notifiche \(/.test(t) || (t === '"Notifiche"' && context.iconOnly)) {
    return { score: 10, rationale: "icona campana — aria-label già completo" };
  }
  if (/Modifica \$\{|Elimina \$\{|Conferma modifica|Annulla modifica|Sposta su|Sposta giù|Apri|Duplica|Elimina ordine|Annulla ordine|Modifica ordine|Nuovo ordine|Chiudi tutti|Apri tutti|Elimina lavorazione|Apri documento|Modifica scheda|Elimina scheda|Esporta PDF/i.test(t)) {
    return { score: 12, rationale: "duplica testo visibile o aria-label icona" };
  }
  if (/canWrite \?|canEdit \?|canDelete \?|canOpen \?/.test(t) && /: undefined/.test(t)) {
    return { score: 88, rationale: "solo hint sola lettura quando disabilitato" };
  }
  if (/canWrite \?|canEdit \?|canDelete \?/.test(t) && /READONLY|Sola lettura/.test(t)) {
    return { score: 88, rationale: "ternario readonly — parte utile è hint disabilitato" };
  }
  if (/^\{label\}$|^\{content\}$|^\{text\}$|^\{title\}$/.test(t) && context.iconOnly) {
    return { score: 12, rationale: "prop pass-through su icona — risolto da primitive" };
  }
  if (/item\.title/.test(t) && /item\.label/.test(v)) {
    return { score: 55, rationale: "menu — title può estendere label" };
  }
  if (/opt\.label/.test(t)) {
    return { score: 8, rationale: "filtro segment — label già visibile" };
  }
  if (/targetsActionLabel/.test(t)) {
    return { score: 8, rationale: "duplica label azione health score" };
  }
  if (/\$\{label\}|localTimeLabel|bar\.title/.test(t)) {
    return { score: 84, rationale: "dettaglio temporale / sessione agenda" };
  }
  if (/PLANNING_STATUS_LABELS/.test(t)) {
    return { score: 75, rationale: "stato pianificazione su blocco compatto" };
  }
  if (/removeTooltipContent/.test(t)) {
    return { score: 65, rationale: "motivo blocco eliminazione (se diverso da label)" };
  }
  if (/hasClienteAssociationViolations/.test(t)) {
    return { score: 90, rationale: "spiega perché salva è disabilitato" };
  }
  if (/inactive \?/.test(t)) {
    return { score: 88, rationale: "sola lettura su import" };
  }

  const staticScore = tooltipNecessityScore(v.replace(/\{[^}]+\}/g, "").trim(), t.replace(/\{[^}]+\}/g, "").trim(), context);
  if (staticScore > 0) return { score: staticScore, rationale: "euristica su testo parziale" };

  return { score: 50, rationale: "dinamico — revisione manuale consigliata" };
}
