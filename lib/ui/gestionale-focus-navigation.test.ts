import assert from "node:assert/strict";
import { shouldSkipGestionaleEnterAdvance } from "@/lib/ui/gestionale-focus-navigation";

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

function el(tag: string, attrs: Record<string, string> = {}): HTMLElement {
  const node = new MockHTMLElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    node.setAttribute(k, v);
  }
  return node as unknown as HTMLElement;
}

assert.equal(shouldSkipGestionaleEnterAdvance(el("textarea", { "data-gestionale-enter": "ignore" })), true);
assert.equal(shouldSkipGestionaleEnterAdvance(el("button")), true);

console.log("gestionale-focus-navigation.test.ts OK");
