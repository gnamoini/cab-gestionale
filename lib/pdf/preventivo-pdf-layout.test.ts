import assert from "node:assert/strict";
import { jsPDF } from "jspdf";
import { buildPreventivoOggettoInterventoPdfFields } from "@/lib/pdf/anagrafica-pdf-fields";
import {
  compactFieldRowCount,
  drawGestionaleCompactFieldSectionTable,
  drawGestionaleDataSectionTable,
  drawGestionaleFieldSectionTable,
  pdfFieldsToCompactBody,
} from "@/lib/pdf/gestionale-section-table";
import {
  PDF_MARGIN_L,
  PDF_MARGIN_R,
  pdfContentWidth,
  pdfTableDefaults,
} from "@/lib/pdf/core/pdf-base-template";
import type { PreventivoRecord } from "@/lib/preventivi/types";

type AutoTableSettings = {
  margin?: { left?: number; right?: number };
  tableWidth?: number;
};

function lastAutoTableSettings(doc: jsPDF): AutoTableSettings {
  return (doc as unknown as { lastAutoTable?: { settings: AutoTableSettings } }).lastAutoTable
    ?.settings ?? {};
}

const pageW = new jsPDF().internal.pageSize.getWidth();
const contentW = pdfContentWidth(pageW);

const fieldDoc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
drawGestionaleFieldSectionTable(fieldDoc, 40, pageW, "Test", [
  { label: "Cliente", value: "ACME" },
]);

const fieldSettings = lastAutoTableSettings(fieldDoc);
assert.equal(fieldSettings.margin?.left, PDF_MARGIN_L, "field table margin.left");
assert.equal(fieldSettings.margin?.right, PDF_MARGIN_R, "field table margin.right");
assert.equal(fieldSettings.tableWidth, contentW, "field table tableWidth");

const dataDoc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
drawGestionaleDataSectionTable(dataDoc, 40, pageW, "Dati", ["Col"], [["val"]]);

const dataSettings = lastAutoTableSettings(dataDoc);
assert.equal(dataSettings.margin?.left, pdfTableDefaults.margin.left, "data table margin.left");
assert.equal(dataSettings.margin?.right, pdfTableDefaults.margin.right, "data table margin.right");
assert.equal(dataSettings.tableWidth, contentW, "data table tableWidth");

const compactFields = [
  { label: "A", value: "1" },
  { label: "B", value: "2" },
  { label: "C", value: "3" },
];
assert.deepEqual(pdfFieldsToCompactBody(compactFields), [
  ["A", "1", "B", "2"],
  ["C", "3", "", ""],
]);
assert.equal(compactFieldRowCount(compactFields.length), 2);

const compactDoc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
drawGestionaleCompactFieldSectionTable(compactDoc, 40, pageW, "Destinatario", compactFields);
const compactSettings = lastAutoTableSettings(compactDoc);
assert.equal(compactSettings.tableWidth, contentW, "compact table tableWidth");
assert.equal(compactSettings.margin?.left, PDF_MARGIN_L, "compact table margin.left");

const attrezzaturaPreventivo = {
  marcaAttrezzatura: "CAT",
  modelloAttrezzatura: "320",
  matricola: "MAT-001",
  macchinaRiassunto: "CAT 320",
  tipoTelaio: "Gomma",
  marcaTelaio: "Iveco",
  targa: "AA111BB",
} as PreventivoRecord;

const oggettoMerged = buildPreventivoOggettoInterventoPdfFields(attrezzaturaPreventivo);
assert.ok(oggettoMerged.some((f) => f.label === "Marca" && f.value === "CAT"));
assert.ok(oggettoMerged.some((f) => f.label === "Telaio Marca" && f.value === "Iveco"));
assert.ok(oggettoMerged.some((f) => f.label === "Targa" && f.value === "AA111BB"));

const legacyRowCount =
  buildPreventivoOggettoInterventoPdfFields(attrezzaturaPreventivo).length +
  5; // destinatario smoke fields
const compactRowCount =
  compactFieldRowCount(5) + compactFieldRowCount(buildPreventivoOggettoInterventoPdfFields(attrezzaturaPreventivo).length);
assert.ok(
  compactRowCount < legacyRowCount,
  `compact layout uses fewer rows (${compactRowCount} < ${legacyRowCount})`,
);

const telaioOnly = buildPreventivoOggettoInterventoPdfFields({
  ...attrezzaturaPreventivo,
  marcaAttrezzatura: "",
  modelloAttrezzatura: "",
  matricola: "",
  targetType: "telaio",
} as PreventivoRecord);
assert.ok(telaioOnly.some((f) => f.label === "Targa"));
assert.equal(telaioOnly.some((f) => f.label === "Matricola"), false);

console.log("preventivo-pdf-layout.test.ts: ok");
