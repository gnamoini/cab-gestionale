import assert from "node:assert/strict";
import { openDeferredPopup, registerPopupBlockedDialogHandler } from "@/lib/browser/popup-guard";
import { openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";

type MockWindow = {
  closed: boolean;
  opener: Window | null;
  location: { href: string; replace: (url: string) => void };
  document: {
    open: () => void;
    write: (html: string) => void;
    close: () => void;
  };
  close: () => void;
};

let mockWindows: MockWindow[] = [];
let openImpl: (url: string) => MockWindow | null = () => null;
let replaceCalls: string[] = [];
let anchorClicks = 0;

function createMockWindow(url: string): MockWindow {
  const win: MockWindow = {
    closed: false,
    opener: globalThis as unknown as Window,
    location: {
      href: url,
      replace(next: string) {
        replaceCalls.push(next);
        this.href = next;
      },
    },
    document: {
      open: () => {},
      write: () => {
        throw new Error("iframe blocked");
      },
      close: () => {},
    },
    close() {
      this.closed = true;
    },
  };
  mockWindows.push(win);
  return win;
}

function installWindowOpenMock() {
  mockWindows = [];
  replaceCalls = [];
  anchorClicks = 0;
  openImpl = (url: string) => createMockWindow(url);
  (globalThis as { window?: Window; document?: Document }).window = {
    open: (url: string) => openImpl(url) as unknown as Window,
    setTimeout: (fn: () => void) => {
      fn();
      return 0;
    },
    location: { hostname: "gestionale.test" },
  } as unknown as Window;
  (globalThis as { document?: Document }).document = {
    createElement: (tag: string) => {
      const el = {
        tag,
        href: "",
        target: "",
        rel: "",
        download: "",
        style: { display: "" },
        click: () => {
          if (tag === "a") anchorClicks += 1;
        },
      };
      return el as unknown as HTMLElement;
    },
    body: {
      appendChild: () => {},
      removeChild: () => {},
    },
  } as unknown as Document;
}

installWindowOpenMock();
registerPopupBlockedDialogHandler(null);

// deferred blob navigate fails → close preopen tab, anchor fallback (no second window.open)
const deferred = openDeferredPopup({ context: "pdf", label: "PDF", showBlockedDialog: false });
assert.ok(!("status" in deferred));
if (!("status" in deferred)) {
  const preopen = mockWindows[mockWindows.length - 1];
  assert.ok(preopen);
  preopen!.location.replace = () => {
    throw new Error("replace blocked");
  };
  const beforeOpens = mockWindows.length;
  const opened = openUrlInNewTab("blob:deferred-fallback", {
    deferredHandle: deferred,
    context: "pdf",
    downloadFileName: "test.pdf",
  });
  assert.equal(opened, true);
  assert.equal(anchorClicks, 0, "location.href fallback — no anchor");
  assert.equal(preopen!.closed, false, "same tab stays open");
  assert.equal(preopen!.location.href, "blob:deferred-fallback");
  assert.equal(mockWindows.length, beforeOpens, "must not call window.open again after deferred");
}

// happy path: navigate same tab, no extra window.open
installWindowOpenMock();
const deferredOk = openDeferredPopup({ context: "pdf", showBlockedDialog: false });
assert.ok(!("status" in deferredOk));
if (!("status" in deferredOk)) {
  const countBefore = mockWindows.length;
  const opened = openUrlInNewTab("blob:happy", { deferredHandle: deferredOk, context: "pdf" });
  assert.equal(opened, true);
  assert.equal(mockWindows.length, countBefore, "successful navigate must not open another tab");
  assert.equal(mockWindows[mockWindows.length - 1]?.location.href, "blob:happy");
}

// API path: anchor sync, no window.open
installWindowOpenMock();
const apiOpened = openUrlInNewTab("/api/pdf/artifacts/preventivo?id=1", { context: "pdf" });
assert.equal(apiOpened, true);
assert.equal(anchorClicks, 1);
assert.equal(mockWindows.length, 0, "API PDF must not window.open");

console.log("open-url-new-tab.test.ts OK");
