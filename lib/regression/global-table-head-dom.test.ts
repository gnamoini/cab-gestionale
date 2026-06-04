/**
 * Global table head — valid HTML nesting (thead > tr > th, no th-in-th / tr-in-tr).
 */
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  GlobalTableHead,
  GlobalTableHeadLabel,
  GlobalTableSortTh,
  normalizeGlobalTableHeadChildren,
} from "@/components/gestionale/global-table/global-table-header";

function assertValidTableHead(html: string) {
  assert.match(html, /<thead[^>]*>\s*<tr[^>]*>/, "expected thead > tr");
  assert.doesNotMatch(html, /<th(?:[^>]*)>\s*<th[\s>]/, "nested th inside th");
  assert.doesNotMatch(html, /<tr(?:[^>]*)>\s*<tr[\s>]/, "nested tr inside tr");
  assert.doesNotMatch(html, /<thead[^>]*>[\s\S]*<thead[\s>]/, "nested thead");
}

{
  const html = renderToStaticMarkup(
    createElement(
      "table",
      null,
      createElement(
        GlobalTableHead,
        null,
        createElement(GlobalTableHeadLabel, { label: "Mese" }),
        createElement(GlobalTableHeadLabel, { label: "Completate" }),
        createElement(GlobalTableHeadLabel, {
          label: "",
          thClassName: "w-10",
          scope: "col",
          "aria-label": "Espandi settimane",
        }),
      ),
    ),
  );
  assertValidTableHead(html);
  assert.match(html, /Espandi settimane/);
}

{
  const html = renderToStaticMarkup(
    createElement(
      "table",
      null,
      createElement(
        GlobalTableHead,
        null,
        createElement(GlobalTableSortTh, {
          label: "Codice",
          columnKey: "codice",
          sortColumn: null,
          sortPhase: "natural",
          onSort: () => {},
        }),
        createElement(GlobalTableHeadLabel, { label: "Azioni", align: "right" }),
      ),
    ),
  );
  assertValidTableHead(html);
}

{
  const html = renderToStaticMarkup(
    createElement(
      "table",
      null,
      createElement(
        GlobalTableHead,
        null,
        createElement(
          "tr",
          { className: "custom-row" },
          createElement(GlobalTableHeadLabel, { label: "Già in riga" }),
        ),
      ),
    ),
  );
  assertValidTableHead(html);
  assert.match(html, /custom-row/);
  assert.doesNotMatch(html, /<tr[^>]*>[\s\S]*<tr[^>]*>[\s\S]*custom-row/, "duplicate tr wrapper");
}

{
  const manualRow = renderToStaticMarkup(
    createElement(
      "table",
      null,
      createElement(
        "thead",
        null,
        createElement(
          "tr",
          null,
          createElement(GlobalTableHeadLabel, { label: "Manuale" }),
        ),
      ),
    ),
  );
  assertValidTableHead(manualRow);
}

{
  const normalized = normalizeGlobalTableHeadChildren([
    createElement(GlobalTableHeadLabel, { label: "A" }),
    createElement("th", { className: "raw" }, "B"),
  ]);
  const html = renderToStaticMarkup(createElement("thead", null, normalized));
  assertValidTableHead(html);
  assert.match(html, />A</);
  assert.match(html, />B</);
}

{
  const html = renderToStaticMarkup(
    createElement(
      "table",
      null,
      createElement(GlobalTableHead, {
        sticky: true,
        children: createElement(
          "tr",
          { className: "h-14 matrix-row" },
          createElement("th", { scope: "col" }, "Anno"),
          createElement("th", { scope: "col" }, "Gen"),
        ),
      }),
    ),
  );
  assertValidTableHead(html);
  assert.match(html, /matrix-row/);
  assert.match(html, />Anno</);
}

{
  const html = renderToStaticMarkup(
    createElement(
      "table",
      null,
      createElement(
        GlobalTableHead,
        null,
        createElement("th", { className: "sticky left-0" }, "Dipendente"),
        createElement("th", null, "01"),
        createElement(GlobalTableHeadLabel, { label: "Ord.", align: "center" }),
      ),
    ),
  );
  assertValidTableHead(html);
  assert.match(html, /sticky left-0/);
}

{
  function Tooltip({ children }: { children?: React.ReactNode }) {
    return children ?? null;
  }
  const html = renderToStaticMarkup(
    createElement(
      "table",
      null,
      createElement(
        GlobalTableHead,
        null,
        createElement(GlobalTableHeadLabel, { label: "Dipendente" }),
        createElement(Tooltip, {
          children: createElement("th", { scope: "col" }, "03"),
        }),
      ),
    ),
  );
  assertValidTableHead(html);
  assert.match(html, />03</);
}

console.log("global-table-head-dom.test.ts OK");
