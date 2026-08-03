import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { compactOggettoInterventoColumnStyles } from "@/lib/pdf/gestionale-section-table";
import { pdfContentWidth } from "@/lib/pdf/preventivo-pdf-layout";

const doc = new jsPDF();
const contentW = pdfContentWidth(doc.internal.pageSize.getWidth());
const cols = compactOggettoInterventoColumnStyles(contentW);
let h = 0;
autoTable(doc, {
  startY: 40,
  head: [[{ content: "OGGETTO", colSpan: 4 }]],
  body: [["Tipo\u00a0attrezzatura", "Escavatore", "Marca", "CAT"]],
  tableWidth: contentW,
  margin: { left: 22, right: 22 },
  columnStyles: cols,
  styles: { overflow: "linebreak", font: "helvetica" },
  didDrawCell: (d) => {
    if (d.section === "body" && d.column.index === 0) h = d.cell.height;
  },
});
const wrapped = h > 7;
console.log("labelW", cols[0].cellWidth, "cellH", h, "wrapped", wrapped);
if (wrapped) throw new Error("Tipo attrezzatura label wrapped");
