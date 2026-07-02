import type { jsPDF } from "jspdf";

export const SCHEDA_BLANK_TEMPLATE_VERSION = "1.0.0";

export type SchedaBlankTipo = "ingresso" | "lavorazioni" | "ricambi";

const TITLES: Record<SchedaBlankTipo, string> = {
  ingresso: "Scheda Ingresso",
  lavorazioni: "Scheda Lavorazioni",
  ricambi: "Scheda Ricambi",
};

export function drawSchedaBlankPdf(doc: jsPDF, tipo: SchedaBlankTipo, generatedAt: Date): void {
  const title = TITLES[tipo];
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Template: ${title} v${SCHEDA_BLANK_TEMPLATE_VERSION}`, 14, 28);
  doc.text(`Generato il ${generatedAt.toLocaleDateString("it-IT")}`, 14, 34);

  doc.setDrawColor(180);
  doc.rect(14, 42, 182, 220);

  const rowLabels =
    tipo === "ingresso"
      ? ["Cliente", "Mezzo", "Targa", "Km", "Data ingresso", "Note"]
      : tipo === "lavorazioni"
        ? ["Intervento", "Descrizione", "Ore", "Operatore", "Note"]
        : ["Codice", "Descrizione", "Q.tà", "Marca", "Note"];

  let y = 50;
  for (const label of rowLabels) {
    doc.setFontSize(9);
    doc.text(`${label}:`, 18, y);
    doc.line(50, y + 1, 190, y + 1);
    y += 14;
  }

  doc.setFontSize(8);
  doc.text(
    `Template: ${title} v${SCHEDA_BLANK_TEMPLATE_VERSION} — generato il ${generatedAt.toLocaleDateString("it-IT")}`,
    14,
    285,
  );
}

export function schedaBlankPdfFileName(tipo: SchedaBlankTipo): string {
  return `scheda-${tipo}-blank-v${SCHEDA_BLANK_TEMPLATE_VERSION}.pdf`;
}
