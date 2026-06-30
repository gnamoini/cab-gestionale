/**
 * DOM path + React fiber resolution (DEV-only, client).
 */

export type ReactSourceHint = {
  component: string | null;
  file: string | null;
  lineApprox: number | null;
  fiberChain: string[];
};

const HOST_NAMES = new Set([
  "div",
  "span",
  "p",
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "table",
  "tr",
  "td",
  "th",
  "thead",
  "tbody",
  "ul",
  "li",
  "nav",
  "main",
  "header",
  "footer",
  "section",
  "form",
  "label",
  "svg",
  "path",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]);

type FiberLike = {
  type?: unknown;
  return?: FiberLike | null;
  _debugSource?: { fileName?: string; lineNumber?: number } | null;
};

function getFiberTypeName(type: unknown): string | null {
  if (!type) return null;
  if (typeof type === "string") return type;
  if (typeof type === "function") {
    const fn = type as { displayName?: string; name?: string };
    return fn.displayName || fn.name || null;
  }
  if (typeof type === "object" && type !== null) {
    const obj = type as { displayName?: string; render?: { name?: string; displayName?: string } };
    if (obj.displayName) return obj.displayName;
    if (obj.render) return obj.render.displayName || obj.render.name || null;
  }
  return null;
}

function isHostComponentName(name: string | null): boolean {
  if (!name) return true;
  if (HOST_NAMES.has(name.toLowerCase())) return true;
  return name === "Fragment" || name === "Suspense" || name === "StrictMode" || name === "Provider";
}

/** Risolve la chiave React fiber su un DOM node (React 18/19). */
export function getReactFiber(el: Element): FiberLike | null {
  if (typeof el !== "object" || el === null) return null;
  const record = el as unknown as Record<string, unknown>;
  const key = Object.keys(record).find(
    (k) => k.startsWith("__reactFiber") || k.startsWith("__reactInternalInstance"),
  );
  if (!key) return null;
  const fiber = record[key];
  return fiber && typeof fiber === "object" ? (fiber as FiberLike) : null;
}

/** Costruisce path DOM `html > body > ...`. */
export function buildDomPath(el: Element, maxDepth = 24): string {
  const parts: string[] = [];
  let node: Element | null = el;
  let depth = 0;

  while (node && depth < maxDepth) {
    const tag = node.tagName.toLowerCase();
    let segment = tag;
    if (node.id) {
      segment += `#${node.id}`;
    } else if (node instanceof HTMLElement && typeof node.className === "string" && node.className.trim()) {
      const firstClass = node.className.trim().split(/\s+/)[0];
      if (firstClass) segment += `.${firstClass}`;
    }
    parts.unshift(segment);
    node = node.parentElement;
    depth += 1;
  }

  return parts.join(" > ");
}

/** Selettore compatto tag + id + prime classi. */
export function buildElementSelector(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const cls =
    el instanceof HTMLElement && el.className && typeof el.className === "string"
      ? `.${el.className.split(/\s+/).slice(0, 4).join(".")}`
      : "";
  return `${tag}${id}${cls}`;
}

/** Risolve componente React, file debug e catena fiber. */
export function resolveReactSourceHint(el: Element): ReactSourceHint {
  const fiberChain: string[] = [];
  let component: string | null = null;
  let file: string | null = null;
  let lineApprox: number | null = null;

  let fiber = getReactFiber(el);
  let guard = 0;

  while (fiber && guard < 80) {
    const name = getFiberTypeName(fiber.type);
    if (name && !isHostComponentName(name)) {
      fiberChain.push(name);
      if (!component) {
        component = name;
        const src = fiber._debugSource;
        if (src?.fileName) {
          file = src.fileName.replace(/^.*[\\/]gestionale-cab[\\/]/, "").replace(/\\/g, "/");
          lineApprox = typeof src.lineNumber === "number" ? src.lineNumber : null;
        }
      }
    }
    fiber = fiber.return ?? null;
    guard += 1;
  }

  return { component, file, lineApprox, fiberChain };
}
