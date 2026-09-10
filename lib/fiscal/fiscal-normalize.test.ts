import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeCodiceDestinatario,
  normalizeCodiceFiscale,
  normalizeIban,
  normalizePartitaIva,
  normalizePec,
} from "./normalize";
import {
  validateCodiceDestinatario,
  validateCodiceFiscaleIt,
  validateIban,
  validatePartitaIvaIt,
  validatePec,
} from "./validate";

describe("fiscal normalize", () => {
  it("normalizes P.IVA IT", () => {
    assert.equal(normalizePartitaIva("IT 12345678901"), "12345678901");
    assert.equal(normalizePartitaIva(""), null);
    assert.equal(normalizePartitaIva(null), null);
  });

  it("normalizes CF", () => {
    assert.equal(normalizeCodiceFiscale("rssmra80a01h501u"), "RSSMRA80A01H501U");
    assert.equal(normalizeCodiceFiscale(""), null);
  });

  it("normalizes IBAN", () => {
    assert.equal(normalizeIban("it60 x054 2811 1010 0000 0123 456"), "IT60X0542811101000000123456");
  });

  it("normalizes PEC", () => {
    assert.equal(normalizePec("  Test@PEC.IT "), "test@pec.it");
  });

  it("normalizes codice destinatario", () => {
    assert.equal(normalizeCodiceDestinatario(" ab1c2d3 "), "AB1C2D3");
    assert.equal(normalizeCodiceDestinatario("0000000"), "0000000");
  });
});

describe("fiscal validate", () => {
  it("rejects invalid IBAN checksum", () => {
    assert.equal(validateIban("IT60X0542811101000000123457"), false);
  });

  it("accepts valid IBAN", () => {
    assert.equal(validateIban("IT60X0542811101000000123456"), true);
  });

  it("rejects invalid PEC", () => {
    assert.equal(validatePec("not-an-email"), false);
  });

  it("accepts valid PEC structure", () => {
    assert.equal(validatePec("cliente@pec.it"), true);
  });

  it("rejects invalid codice destinatario", () => {
    assert.equal(validateCodiceDestinatario("ABC"), false);
  });

  it("validates CF structure IT", () => {
    assert.equal(validateCodiceFiscaleIt("RSSMRA80A01H501U"), true);
    assert.equal(validateCodiceFiscaleIt("INVALID"), false);
  });

  it("rejects invalid P.IVA IT length", () => {
    assert.equal(validatePartitaIvaIt("12345"), false);
  });

  it("foreign subject allows non-IT P.IVA format", () => {
    assert.equal(normalizePartitaIva("DE123456789", "DE"), "DE123456789");
  });
});
