import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type libxmljs from "libxmljs2";
import type { InvoiceXmlSchemaVersion } from "@/lib/accounting/einvoice/schemas/schema-registry";
import { getSchemaDirectory } from "@/lib/accounting/einvoice/schemas/schema-registry";
import { InvoiceXmlValidationError } from "@/lib/accounting/einvoice/errors/invoice-xml-validation-error";
import { validationFail, validationOk, type ValidationResult } from "@/lib/accounting/einvoice/validation/validation-result";

const require = createRequire(import.meta.url);

/** ponytail: lazy native binding — Next collect-page-data must not load libxmljs2 at import time */
function loadLibxmljs(): typeof libxmljs {
  return require("libxmljs2") as typeof libxmljs;
}

function loadXsdWithLocalImports(schema: InvoiceXmlSchemaVersion, libxmljs: typeof import("libxmljs2")): libxmljs.Document {
  const schemaDir = getSchemaDirectory(schema);
  const xsdContent = readFileSync(schema.xsdEntrypoint, "utf8");
  const xsdDoc = libxmljs.parseXml(xsdContent, { baseUrl: `${schemaDir}/` });
  return xsdDoc;
}

export function validateXmlAgainstXsd(xml: string, schema: InvoiceXmlSchemaVersion): ValidationResult {
  try {
    const libxmljs = loadLibxmljs();
    const xsdDoc = loadXsdWithLocalImports(schema, libxmljs);
    const xmlDoc = libxmljs.parseXml(xml);
    const valid = xmlDoc.validate(xsdDoc);
    if (!valid) {
      const issues = xmlDoc.validationErrors.map((e) => e.message).filter(Boolean);
      return validationFail("XSD", issues.map((msg, i) => ({ code: `XSD_${i}`, message: msg })));
    }
    return validationOk("XSD");
  } catch (e) {
    throw new InvoiceXmlValidationError(
      "XSD_VALIDATION_FAILED",
      e instanceof Error ? e.message : "Validazione XSD fallita",
      [],
    );
  }
}
