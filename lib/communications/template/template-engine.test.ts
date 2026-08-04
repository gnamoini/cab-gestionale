import { buildTestModeHeader, renderCommunicationTemplate } from "@/lib/communications/template/template-engine.server";

const rendered = renderCommunicationTemplate(
  "Ciao {{cliente}}",
  "Mezzo {{targa}}",
  { cliente: "AMIU", targa: "AB123CD" },
);

if (rendered.subject !== "Ciao AMIU") throw new Error("subject render failed");
if (rendered.body !== "Mezzo AB123CD") throw new Error("body render failed");

const header = buildTestModeHeader("Mario Rossi", "mario@test.it");
if (!header.includes("MODALITÀ TEST")) throw new Error("test header missing");

console.log("template-engine.test.ts: ok");
