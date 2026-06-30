import fs from "node:fs";
import { chromium } from "playwright";

const cookies = fs.readFileSync("test-results/.overflow-session-cookies.tmp", "utf8").trim();

function parseCookieHeader(header, baseUrl) {
  const u = new URL(baseUrl);
  return header
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((pair) => {
      const i = pair.indexOf("=");
      return {
        name: pair.slice(0, i).trim(),
        value: pair.slice(i + 1).trim(),
        domain: u.hostname,
        path: "/",
        sameSite: "Lax",
      };
    });
}

async function probe(route) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 724, height: 900 } });
  await ctx.addCookies(parseCookieHeader(cookies, "http://localhost:3000"));
  const page = await ctx.newPage();
  await page.goto(`http://localhost:3000${route}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector(".cab-app-shell", { timeout: 60_000 });
  await page.waitForTimeout(8000);

  const result = await page.evaluate(() => {
    const iw = window.innerWidth;
    const bodyChildren = [...document.body.children].map((el) => ({
      tag: el.tagName,
      id: el.id,
      cls: typeof el.className === "string" ? el.className.slice(0, 100) : "",
      display: getComputedStyle(el).display,
      position: getComputedStyle(el).position,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      right: el.getBoundingClientRect().right,
      overflowPx: Math.max(0, el.getBoundingClientRect().right - iw),
    }));
    const modals = [...document.querySelectorAll("[data-cab-modal-root], [role=dialog]")].map((el) => ({
      tag: el.tagName,
      display: getComputedStyle(el).display,
      ariaHidden: el.getAttribute("aria-hidden"),
      scrollWidth: el.scrollWidth,
      right: el.getBoundingClientRect().right,
      overflowPx: Math.max(0, el.getBoundingClientRect().right - iw),
    }));
    const fixed = [...document.querySelectorAll(".fixed")].map((el) => ({
      cls: typeof el.className === "string" ? el.className.slice(0, 100) : "",
      display: getComputedStyle(el).display,
      right: el.getBoundingClientRect().right,
      overflowPx: Math.max(0, el.getBoundingClientRect().right - iw),
      inMain: document.querySelector("main")?.contains(el) ?? false,
    }));
    const mirror = document.querySelector(".cab-gestionale-scroll-gutter-mirror");
    return {
      route: location.pathname,
      innerWidth: iw,
      bodyChildren,
      modals,
      fixed,
      headerMirror: mirror
        ? {
            right: mirror.getBoundingClientRect().right,
            scrollWidth: mirror.scrollWidth,
            overflowPx: Math.max(0, mirror.getBoundingClientRect().right - iw),
            scrollbarInset: getComputedStyle(document.documentElement).getPropertyValue(
              "--cab-main-scrollbar-inset",
            ),
          }
        : null,
    };
  });

  await browser.close();
  return result;
}

const out = [];
for (const route of ["/preventivi", "/dashboard"]) {
  out.push(await probe(route));
}

fs.writeFileSync("test-results/overflow-invisible-probe.json", JSON.stringify(out, null, 2));
console.log("Wrote overflow-invisible-probe.json");
