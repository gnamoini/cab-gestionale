/**
 * Outside dismiss: etichette campo non devono chiudere il menu combobox.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { CAB_FIELD_LABEL_ATTR } from "@/lib/ui/mobile-modal-behavior";

const require = createRequire(import.meta.url);

function setupDom(): void {
  if (typeof document !== "undefined" && typeof Element !== "undefined") return;
  const { JSDOM } = require("jsdom") as typeof import("jsdom");
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
  const win = dom.window;
  (globalThis as { window: unknown }).window = win;
  (globalThis as typeof globalThis & { document: Document }).document = win.document;
  (globalThis as typeof globalThis & { Element: typeof Element }).Element = win.Element;
  (globalThis as typeof globalThis & { HTMLElement: typeof HTMLElement }).HTMLElement = win.HTMLElement;
  (globalThis as typeof globalThis & { Node: typeof Node }).Node = win.Node;
  (globalThis as typeof globalThis & { CSS: typeof CSS }).CSS = win.CSS;
}

setupDom();

const { isPointerOnAssociatedFieldLabel } = require("../../components/gestionale/global-input/use-global-dropdown-portal") as typeof import("../../components/gestionale/global-input/use-global-dropdown-portal");

function buildWrappingLabelField(): { label: HTMLLabelElement; anchor: HTMLDivElement; caption: Text } {
  const label = document.createElement("label");
  const caption = document.createTextNode("Tipo attrezzatura");
  const wrap = document.createElement("div");
  const anchor = document.createElement("div");
  const input = document.createElement("input");
  input.id = "field-input";
  anchor.appendChild(input);
  wrap.appendChild(anchor);
  label.appendChild(caption);
  label.appendChild(wrap);
  document.body.appendChild(label);
  return { label, anchor, caption };
}

function buildHtmlForField(): { label: HTMLLabelElement; anchor: HTMLDivElement } {
  document.body.innerHTML = "";
  const root = document.createElement("div");
  const label = document.createElement("label");
  label.htmlFor = "field-for";
  label.textContent = "Cliente";
  label.setAttribute(CAB_FIELD_LABEL_ATTR, "");
  const anchor = document.createElement("div");
  const input = document.createElement("input");
  input.id = "field-for";
  anchor.appendChild(input);
  root.appendChild(label);
  root.appendChild(anchor);
  document.body.appendChild(root);
  return { label, anchor };
}

document.body.innerHTML = "";

const wrapping = buildWrappingLabelField();
assert.equal(isPointerOnAssociatedFieldLabel(wrapping.label, wrapping.anchor), true);
assert.equal(isPointerOnAssociatedFieldLabel(wrapping.caption, wrapping.anchor), true);
assert.equal(isPointerOnAssociatedFieldLabel(wrapping.anchor.querySelector("input")!, wrapping.anchor), true);

const outside = document.createElement("button");
document.body.appendChild(outside);
assert.equal(isPointerOnAssociatedFieldLabel(outside, wrapping.anchor), false);

document.body.innerHTML = "";
const htmlForField = buildHtmlForField();
assert.equal(isPointerOnAssociatedFieldLabel(htmlForField.label, htmlForField.anchor), true);

console.log("dropdown-outside-dismiss.test.ts OK");
