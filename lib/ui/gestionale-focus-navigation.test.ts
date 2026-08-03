import assert from "node:assert/strict";
import {
  shouldSelectAllOnFocus,
  shouldSkipGestionaleEnterAdvance,
} from "@/lib/ui/gestionale-focus-navigation";

/** Polyfill minimo per `instanceof HTMLElement` in runtime Node. */
class MockHTMLElement {
  tagName: string;
  private attrs: Record<string, string> = {};

  constructor(tag: string) {
    this.tagName = tag.toUpperCase();
  }

  closest(): null {
    return null;
  }

  getAttribute(name: string): string | null {
    return this.attrs[name] ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attrs[name] = value;
  }

  isContentEditable = false;
}

(globalThis as unknown as { HTMLElement?: typeof MockHTMLElement }).HTMLElement = MockHTMLElement;

class MockHTMLInputElement extends MockHTMLElement {
  type = "text";

  constructor(tag: string) {
    super(tag);
  }
}

(globalThis as unknown as { HTMLInputElement?: typeof MockHTMLInputElement }).HTMLInputElement =
  MockHTMLInputElement;

function el(tag: string, attrs: Record<string, string> = {}): HTMLElement {
  const node = tag === "input" ? new MockHTMLInputElement(tag) : new MockHTMLElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    node.setAttribute(k, v);
  }
  return node as unknown as HTMLElement;
}

assert.equal(shouldSelectAllOnFocus(el("input", { inputmode: "decimal" })), false);
assert.equal(shouldSelectAllOnFocus(el("input", { "data-gestionale-numeric": "true" })), false);
assert.equal(shouldSelectAllOnFocus(el("input", { type: "text" })), true);

assert.equal(shouldSkipGestionaleEnterAdvance(el("textarea", { "data-gestionale-enter": "ignore" })), true);
assert.equal(shouldSkipGestionaleEnterAdvance(el("button")), true);

console.log("gestionale-focus-navigation.test.ts OK");
