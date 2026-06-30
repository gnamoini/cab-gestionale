/**
 * Visual Clip Probe — console injection only (test-results).
 * API: window.__cabVisualClipAudit(), __cabVisualClipDebugOn(), __cabVisualClipDebugOff()
 */
(function registerVisualClipProbe() {
  const HOST_NAMES = new Set([
    "div", "span", "p", "a", "button", "input", "select", "textarea", "table", "tr", "td", "th",
    "thead", "tbody", "ul", "li", "nav", "main", "header", "footer", "section", "form", "label",
    "svg", "path", "h1", "h2", "h3", "h4", "h5", "h6",
  ]);

  function buildSelector(el) {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : "";
    const cn =
      el instanceof HTMLElement && typeof el.className === "string" && el.className.trim()
        ? `.${el.className.split(/\s+/).slice(0, 4).join(".")}`
        : "";
    return `${tag}${id}${cn}`;
  }

  function getReactHint(el) {
    const key = Object.keys(el).find(
      (k) => k.startsWith("__reactFiber") || k.startsWith("__reactInternalInstance"),
    );
    if (!key) return { component: null, file: null, lineApprox: null, fiberChain: [] };
    let fiber = el[key];
    const chain = [];
    for (let i = 0; i < 80 && fiber; i++) {
      let name = null;
      const t = fiber.type;
      if (typeof t === "function") name = t.displayName || t.name;
      else if (typeof t === "string") name = t;
      if (name && !HOST_NAMES.has(name.toLowerCase()) && name !== "Fragment") {
        const src = fiber._debugSource;
        return {
          component: name,
          file: src?.fileName
            ? src.fileName.replace(/^.*[\\/]gestionale-cab[\\/]/, "").replace(/\\/g, "/")
            : null,
          lineApprox: src?.lineNumber ?? null,
          fiberChain: chain.slice(0, 10),
        };
      }
      if (name) chain.push(name);
      fiber = fiber.return;
    }
    return { component: null, file: null, lineApprox: null, fiberChain: chain.slice(0, 10) };
  }

  function rectSnapshot(el) {
    const r = el.getBoundingClientRect();
    return {
      left: Math.round(r.left * 10) / 10,
      right: Math.round(r.right * 10) / 10,
      top: Math.round(r.top * 10) / 10,
      bottom: Math.round(r.bottom * 10) / 10,
      width: Math.round(r.width * 10) / 10,
      height: Math.round(r.height * 10) / 10,
    };
  }

  function cssClipSnapshot(cs) {
    return {
      overflow: cs.overflow,
      overflowX: cs.overflowX,
      overflowY: cs.overflowY,
      clipPath: cs.clipPath,
      maskImage: cs.maskImage,
      contain: cs.contain,
      transform: cs.transform,
      filter: cs.filter,
      backdropFilter: cs.backdropFilter,
      position: cs.position,
      boxShadow: cs.boxShadow !== "none" ? cs.boxShadow.slice(0, 120) : "none",
      outlineWidth: cs.outlineWidth,
      outlineOffset: cs.outlineOffset,
      borderRadius: cs.borderRadius,
    };
  }

  function isIdentityTransform(t) {
    return !t || t === "none" || t === "matrix(1, 0, 0, 1, 0, 0)" || t === "translateZ(0px)" || t === "translate3d(0px, 0px, 0px)";
  }

  function createsClipContext(cs) {
    const clips = (v) => v === "hidden" || v === "clip";
    if (clips(cs.overflow) || clips(cs.overflowX) || clips(cs.overflowY)) return "overflow";
    if (cs.clipPath && cs.clipPath !== "none") return "clip-path";
    if (cs.maskImage && cs.maskImage !== "none") return "mask-image";
    if (cs.contain && cs.contain.includes("paint")) return "contain-paint";
    if (!isIdentityTransform(cs.transform)) return "transform";
    if (cs.filter && cs.filter !== "none") return "filter";
    if (cs.backdropFilter && cs.backdropFilter !== "none") return "backdrop-filter";
    return null;
  }

  function parsePx(v) {
    const m = String(v).match(/^([\d.]+)px$/);
    return m ? parseFloat(m[1]) : 0;
  }

  /** Stima estensione decorativa oltre layout box (px per lato). */
  function decorativeExtensionPx(cs) {
    let ext = 0;
    ext = Math.max(ext, parsePx(cs.outlineWidth) + Math.abs(parsePx(cs.outlineOffset)));
    const bw = parsePx(cs.borderTopWidth);
    ext = Math.max(ext, bw);
    if (cs.boxShadow && cs.boxShadow !== "none") {
      ext = Math.max(ext, 12);
    }
    const cn = typeof cs === "object" && cs.className ? cs.className : "";
    if (/\bshadow-|\bring-/.test(cn)) ext = Math.max(ext, 8);
    return ext;
  }

  function layoutOverflowDeltas(childRect, parentRect) {
    return {
      left: Math.max(0, Math.round((parentRect.left - childRect.left) * 10) / 10),
      right: Math.max(0, Math.round((childRect.right - parentRect.right) * 10) / 10),
      top: Math.max(0, Math.round((parentRect.top - childRect.top) * 10) / 10),
      bottom: Math.max(0, Math.round((childRect.bottom - parentRect.bottom) * 10) / 10),
    };
  }

  function maxDelta(d) {
    return Math.max(d.left, d.right, d.top, d.bottom);
  }

  function isVisible(el) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    if (parseFloat(cs.opacity) <= 0.01) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 || r.height > 0;
  }

  function logViewportContext() {
    const root = document.documentElement;
    const body = document.body;
    const shell = document.querySelector(".cab-app-shell");
    const bodyCs = getComputedStyle(body);
    const vv = window.visualViewport;
    const frame = window.frameElement;
    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
      docClientWidth: root.clientWidth,
      docClientHeight: root.clientHeight,
      bodyClientWidth: body.clientWidth,
      bodyClientHeight: body.clientHeight,
      visualViewport: vv
        ? {
            width: vv.width,
            height: vv.height,
            offsetLeft: vv.offsetLeft,
            offsetTop: vv.offsetTop,
            scale: vv.scale,
          }
        : null,
      devicePixelRatio: window.devicePixelRatio,
      frameWidth: frame instanceof HTMLElement ? frame.getBoundingClientRect().width : null,
      frameHeight: frame instanceof HTMLElement ? frame.getBoundingClientRect().height : null,
      shellTier: shell?.getAttribute("data-gestionale-shell-tier") ?? null,
      shellContentWidth: shell?.style.getPropertyValue("--cab-shell-content-width") ||
        getComputedStyle(root).getPropertyValue("--cab-shell-content-width") ||
        "",
      scrollbarInset: getComputedStyle(root).getPropertyValue("--cab-main-scrollbar-inset") || "",
      safeArea: {
        left: bodyCs.paddingLeft,
        right: bodyCs.paddingRight,
        top: bodyCs.paddingTop,
        bottom: bodyCs.paddingBottom,
      },
      bodyPaddingLeftPx: parsePx(bodyCs.paddingLeft),
      bodyPaddingRightPx: parsePx(bodyCs.paddingRight),
    };
  }

  function scanParentClipPairs(scopes) {
    const hits = [];
    const seen = new Set();

    for (const scope of scopes) {
      if (!(scope instanceof HTMLElement)) continue;
      const all = scope.querySelectorAll("*");
      for (const child of all) {
        if (!(child instanceof HTMLElement)) continue;
        if (!isVisible(child)) continue;
        const parent = child.parentElement;
        if (!parent || !scope.contains(parent)) continue;

        const pcs = getComputedStyle(parent);
        const clipKind = createsClipContext(pcs);
        if (!clipKind) continue;

        const childRect = child.getBoundingClientRect();
        const parentRect = parent.getBoundingClientRect();
        if (parentRect.width <= 0 && parentRect.height <= 0) continue;

        const childCs = getComputedStyle(child);
        const decor = decorativeExtensionPx({ ...childCs, className: child.className });
        const layoutDelta = layoutOverflowDeltas(childRect, parentRect);

        const paintChildRect = {
          left: childRect.left - decor,
          right: childRect.right + decor,
          top: childRect.top - decor,
          bottom: childRect.bottom + decor,
        };
        const paintDelta = layoutOverflowDeltas(paintChildRect, parentRect);

        const layoutPx = maxDelta(layoutDelta);
        const paintPx = maxDelta(paintDelta);

        if (layoutPx <= 0.5 && paintPx <= 0.5) continue;

        const key = `${buildSelector(parent)}::${buildSelector(child)}::${clipKind}`;
        if (seen.has(key)) continue;
        seen.add(key);

        hits.push({
          clipKind,
          layoutOverflowPx: layoutPx,
          paintOverflowPx: paintPx,
          layoutDelta,
          paintDelta,
          decorativeExtPx: decor,
          parent: {
            selector: buildSelector(parent),
            tag: parent.tagName,
            className: typeof parent.className === "string" ? parent.className.slice(0, 200) : "",
            box: rectSnapshot(parent),
            css: cssClipSnapshot(pcs),
            react: getReactHint(parent),
          },
          child: {
            selector: buildSelector(child),
            tag: child.tagName,
            className: typeof child.className === "string" ? child.className.slice(0, 120) : "",
            box: rectSnapshot(child),
            css: cssClipSnapshot(childCs),
            react: getReactHint(child),
          },
        });
      }
    }

    hits.sort(
      (a, b) =>
        Math.max(b.paintOverflowPx, b.layoutOverflowPx) -
        Math.max(a.paintOverflowPx, a.layoutOverflowPx),
    );
    return hits;
  }

  function promoteRootClipper(hits) {
    const map = new Map();
    for (const hit of hits) {
      const parentEl = document.querySelector(
        hit.parent.selector.split(".").slice(0, 2).join(".") || hit.parent.tag,
      );
      let rootParent = hit.parent;
      let rootKind = hit.clipKind;
      let best = hit;
      let el = parentEl;
      if (el instanceof HTMLElement) {
        let node = el;
        while (node && node !== document.body) {
          const cs = getComputedStyle(node);
          const kind = createsClipContext(cs);
          if (kind) {
            best = {
              ...hit,
              clipKind: kind,
              parent: {
                selector: buildSelector(node),
                tag: node.tagName,
                className: typeof node.className === "string" ? node.className.slice(0, 200) : "",
                box: rectSnapshot(node),
                css: cssClipSnapshot(cs),
                react: getReactHint(node),
              },
            };
            rootParent = best.parent;
            rootKind = kind;
          }
          node = node.parentElement;
        }
      }
      const dedupeKey = `${rootParent.selector}::${rootKind}`;
      const existing = map.get(dedupeKey);
      const score = Math.max(hit.paintOverflowPx, hit.layoutOverflowPx);
      if (!existing || score > existing.score) {
        map.set(dedupeKey, {
          ...best,
          clipKind: rootKind,
          parent: rootParent,
          score,
          promotedFromChild: hit.child.selector,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.score - a.score);
  }

  function scanFixedAbsolute() {
    const iw = window.innerWidth;
    const ih = window.innerHeight;
    const vv = window.visualViewport;
    const vvw = vv?.width ?? iw;
    const main = document.querySelector(".cab-app-shell main");
    const shell = document.querySelector(".cab-app-shell");
    const out = [];

    for (const el of document.querySelectorAll("*")) {
      if (!(el instanceof HTMLElement)) continue;
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed" && cs.position !== "absolute") continue;
      const r = el.getBoundingClientRect();
      const visible = isVisible(el);
      const vpOverflow = {
        left: Math.max(0, -r.left),
        right: Math.max(0, r.right - vvw),
        top: Math.max(0, -r.top),
        bottom: Math.max(0, r.bottom - (vv?.height ?? ih)),
      };
      const maxVp = Math.max(vpOverflow.left, vpOverflow.right, vpOverflow.top, vpOverflow.bottom);
      if (!visible && maxVp <= 0) continue;

      out.push({
        selector: buildSelector(el),
        position: cs.position,
        display: cs.display,
        visibility: cs.visibility,
        opacity: cs.opacity,
        rect: rectSnapshot(el),
        viewportOverflow: vpOverflow,
        maxViewportOverflowPx: Math.round(maxVp * 10) / 10,
        inMain: main?.contains(el) ?? false,
        inShell: shell?.contains(el) ?? false,
        react: getReactHint(el),
      });
    }

    out.sort((a, b) => b.maxViewportOverflowPx - a.maxViewportOverflowPx);
    return out.slice(0, 50);
  }

  function scanVisualBleedCandidates() {
    const scopes = [
      document.querySelector(".cab-app-shell header"),
      document.querySelector(".cab-app-shell main"),
    ].filter(Boolean);
    const out = [];

    for (const scope of scopes) {
      for (const el of scope.querySelectorAll("*")) {
        if (!(el instanceof HTMLElement) || !isVisible(el)) continue;
        const cs = getComputedStyle(el);
        const cn = typeof el.className === "string" ? el.className : "";
        const hasDecor =
          cs.boxShadow !== "none" ||
          parsePx(cs.outlineWidth) > 0 ||
          /\bshadow-|\bring-|\boutline-|\bborder-/.test(cn);
        if (!hasDecor) continue;

        const decor = decorativeExtensionPx({ ...cs, className: cn });
        if (decor < 2) continue;

        let clipAncestor = null;
        let node = el.parentElement;
        while (node && node !== document.body) {
          const kind = createsClipContext(getComputedStyle(node));
          if (kind) {
            clipAncestor = { selector: buildSelector(node), clipKind: kind };
            break;
          }
          node = node.parentElement;
        }

        if (!clipAncestor) continue;

        const childRect = el.getBoundingClientRect();
        const parentEl = el.parentElement;
        if (!parentEl) continue;
        const parentRect = parentEl.getBoundingClientRect();
        const paintDelta = layoutOverflowDeltas(
          {
            left: childRect.left - decor,
            right: childRect.right + decor,
            top: childRect.top - decor,
            bottom: childRect.bottom + decor,
          },
          parentRect,
        );
        const paintPx = maxDelta(paintDelta);
        if (paintPx <= 0.5) continue;

        out.push({
          selector: buildSelector(el),
          decorativeExtPx: decor,
          paintOverflowPx: paintPx,
          paintDelta,
          clipAncestor,
          css: {
            boxShadow: cs.boxShadow !== "none" ? "yes" : "none",
            outlineWidth: cs.outlineWidth,
          },
          react: getReactHint(el),
        });
      }
    }

    out.sort((a, b) => b.paintOverflowPx - a.paintOverflowPx);
    return out.slice(0, 40);
  }

  const DEBUG_STYLE_ID = "cab-visual-clip-debug-style";

  function enableVisualClipDebug() {
    disableVisualClipDebug();
    const report = runVisualClipAudit();
    const style = document.createElement("style");
    style.id = DEBUG_STYLE_ID;
    style.textContent = `
      [data-cab-visual-clip] { outline: 2px solid #ef4444 !important; outline-offset: 1px !important; }
      [data-cab-visual-clip-parent] { outline: 2px dashed #f97316 !important; outline-offset: 0 !important; }
    `;
    document.head.appendChild(style);

    const marked = new Set();
    for (const hit of report.rawClipHits.slice(0, 30)) {
      for (const el of document.querySelectorAll("*")) {
        if (!(el instanceof HTMLElement)) continue;
        if (buildSelector(el) === hit.parent.selector && !marked.has(hit.parent.selector)) {
          el.setAttribute("data-cab-visual-clip-parent", "");
          marked.add(hit.parent.selector);
        }
        if (buildSelector(el) === hit.child.selector) {
          el.setAttribute("data-cab-visual-clip", "");
        }
      }
    }
    for (const root of report.rootClippers.slice(0, 10)) {
      for (const el of document.querySelectorAll("*")) {
        if (el instanceof HTMLElement && buildSelector(el) === root.parent.selector) {
          el.setAttribute("data-cab-visual-clip-parent", "root");
        }
      }
    }
    return { markedParents: marked.size, hits: report.rawClipHits.length };
  }

  function disableVisualClipDebug() {
    document.getElementById(DEBUG_STYLE_ID)?.remove();
    for (const el of document.querySelectorAll("[data-cab-visual-clip], [data-cab-visual-clip-parent]")) {
      el.removeAttribute("data-cab-visual-clip");
      el.removeAttribute("data-cab-visual-clip-parent");
    }
  }

  function runVisualClipAudit() {
    const shell = document.querySelector(".cab-app-shell");
    const main = document.querySelector(".cab-app-shell main");
    const header = document.querySelector(".cab-app-shell header");
    const scopes = [shell, main, header, document.body].filter(Boolean);

    const viewport = logViewportContext();
    const rawClipHits = scanParentClipPairs(scopes);
    const rootClippers = promoteRootClipper(rawClipHits);
    const fixedAbsolute = scanFixedAbsolute();
    const visualBleed = scanVisualBleedCandidates();

    const shellChain = ["documentElement", "body", "cab-app-shell", "main", "header"]
      .map((name) => {
        const el =
          name === "documentElement"
            ? document.documentElement
            : name === "body"
              ? document.body
              : name === "cab-app-shell"
                ? shell
                : name === "main"
                  ? main
                  : header;
        if (!(el instanceof HTMLElement)) return null;
        const cs = getComputedStyle(el);
        return {
          name,
          selector: buildSelector(el),
          box: rectSnapshot(el),
          clipContext: createsClipContext(cs),
          css: cssClipSnapshot(cs),
        };
      })
      .filter(Boolean);

    return {
      exportedAt: new Date().toISOString(),
      pathname: location.pathname,
      viewport,
      shellChain,
      rawClipHitCount: rawClipHits.length,
      rawClipHits: rawClipHits.slice(0, 40),
      rootClippers: rootClippers.slice(0, 15),
      fixedAbsolute: fixedAbsolute.slice(0, 20),
      visualBleed: visualBleed.slice(0, 20),
      frameMismatch:
        viewport.frameWidth != null && Math.abs(viewport.frameWidth - viewport.innerWidth) > 1,
    };
  }

  window.__cabVisualClipAudit = runVisualClipAudit;
  window.__cabVisualClipDebugOn = enableVisualClipDebug;
  window.__cabVisualClipDebugOff = disableVisualClipDebug;
})();
