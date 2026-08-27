import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  classifyPopupUrlKind,
  openDeferredPopup,
  openSafePopup,
  registerPopupBlockedDialogHandler,
  resolvePopupRetrySessionUrl,
  retryPopupFromSession,
} from "@/lib/browser/popup-guard";
import {
  clearPopupRetrySession,
  getActivePopupRetrySession,
  POPUP_RETRY_SESSION_TTL_MS,
} from "@/lib/browser/popup-retry-session";
import {
  detectPopupInstructionProfile,
  resolvePopupWhitelistDomain,
} from "@/lib/browser/popup-instructions";

type MockWindow = {
  closed: boolean;
  opener: Window | null;
  location: { href: string; replace: (url: string) => void };
  document: {
    open: () => void;
    write: (html: string) => void;
    close: () => void;
    createElement: (tag: string) => {
      tag: string;
      href: string;
      target: string;
      style: { display: string };
      click: () => void;
    };
    body: {
      appendChild: () => void;
      removeChild: () => void;
    };
  };
  close: () => void;
};

let mockWindows: MockWindow[] = [];
let openImpl: (url: string, target?: string, features?: string) => MockWindow | null = () => null;
let dialogCalls = 0;
let lastIframeSrc = "";
let replaceCalls: string[] = [];

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
      write: (html: string) => {
        const match = /<iframe[^>]+src="([^"]+)"/.exec(html);
        lastIframeSrc = match?.[1] ?? "";
      },
      close: () => {},
      createElement: (tag: string) => ({
        tag,
        href: "",
        target: "",
        style: { display: "" },
        click: () => {},
      }),
      body: {
        appendChild: () => {},
        removeChild: () => {},
      },
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
  dialogCalls = 0;
  lastIframeSrc = "";
  replaceCalls = [];
  openImpl = (url: string) => createMockWindow(url);

  (globalThis as { window?: Window }).window = {
    open: (url: string, target?: string, features?: string) =>
      openImpl(url, target, features) as unknown as Window,
    setTimeout: (fn: () => void) => {
      fn();
      return 0;
    },
    location: { hostname: "gestionale.test" },
  } as unknown as Window;
}

function installBlockedOpenMock() {
  mockWindows = [];
  dialogCalls = 0;
  replaceCalls = [];
  openImpl = () => null;
  (globalThis as { window?: Window }).window = {
    open: () => null,
    setTimeout: (fn: () => void) => {
      fn();
      return 0;
    },
    location: { hostname: "gestionale.test" },
  } as unknown as Window;
}

installWindowOpenMock();
registerPopupBlockedDialogHandler(() => {
  dialogCalls += 1;
});

assert.equal(classifyPopupUrlKind("blob:abc"), "blob");
assert.equal(classifyPopupUrlKind("/api/pdf/x"), "api");
assert.equal(classifyPopupUrlKind("https://example.com"), "external");

assert.equal(detectPopupInstructionProfile("Mozilla/5.0 Chrome/120"), "chrome");
assert.equal(detectPopupInstructionProfile("Mozilla/5.0 Edg/120"), "edge");
assert.equal(detectPopupInstructionProfile("Mozilla/5.0 Firefox/120"), "firefox");
assert.equal(
  detectPopupInstructionProfile(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
  ),
  "safari_ios",
);

assert.equal(resolvePopupWhitelistDomain(), "gestionale.test");

assert.equal(resolvePopupRetrySessionUrl("/api/pdf/artifacts/x"), "/api/pdf/artifacts/x");
assert.equal(resolvePopupRetrySessionUrl("about:blank"), null);
assert.equal(resolvePopupRetrySessionUrl("blob:pending"), null);
assert.equal(
  resolvePopupRetrySessionUrl("about:blank", "/api/pdf/artifacts/preventivo"),
  "/api/pdf/artifacts/preventivo",
);

// 1 + 4: popup allowed → opened, no dialog
dialogCalls = 0;
const opened = openSafePopup({ url: "https://example.com/doc.pdf", context: "pdf", showBlockedDialog: false });
assert.equal(opened.status, "opened");
assert.equal(dialogCalls, 0);
assert.equal(mockWindows.length, 1);
assert.equal(mockWindows[0]?.opener, null);

// 2 + 3: popup blocked → handler + no residual window
installBlockedOpenMock();
registerPopupBlockedDialogHandler(() => {
  dialogCalls += 1;
});
dialogCalls = 0;
const blocked = openSafePopup({
  url: "https://example.com/doc.pdf",
  context: "pdf",
  showBlockedDialog: true,
});
assert.equal(blocked.status, "blocked");
assert.equal(mockWindows.length, 0);
assert.equal(dialogCalls, 1);
if (blocked.status === "blocked") {
  assert.ok(getActivePopupRetrySession()?.id === blocked.sessionId);
  clearPopupRetrySession(blocked.sessionId);
}

// deferred preopen blocked with retryUrl → anchor fallback when window.open returns null
installBlockedOpenMock();
registerPopupBlockedDialogHandler(() => {
  dialogCalls += 1;
});
dialogCalls = 0;
const preopenBlocked = openDeferredPopup({
  context: "pdf",
  label: "PDF",
  retryUrl: "/api/pdf/artifacts/preventivo?id=1",
});
assert.ok(!("status" in preopenBlocked), "retryUrl must use anchor fallback without blocked toast");
assert.equal(dialogCalls, 0);

// 6: deferred happy path — same window navigated
installWindowOpenMock();
registerPopupBlockedDialogHandler(() => {
  dialogCalls += 1;
});
dialogCalls = 0;
const deferred = openDeferredPopup({ context: "pdf", label: "PDF" });
assert.ok(!("status" in deferred));

if (!("status" in deferred)) {
  const navigated = deferred.navigate("/api/pdf/artifacts/preventivo?id=1");
  assert.equal(navigated.status, "opened");
  assert.equal(mockWindows[mockWindows.length - 1]?.location.href, "/api/pdf/artifacts/preventivo?id=1");
  assert.equal(dialogCalls, 0);

  replaceCalls = [];
  lastIframeSrc = "";
  const blobNav = deferred.navigate("blob:pdf-test");
  assert.equal(blobNav.status, "opened");
  assert.deepEqual(replaceCalls, ["blob:pdf-test"], "blob navigate must call location.replace first");
  assert.equal(mockWindows[mockWindows.length - 1]?.location.href, "blob:pdf-test");
  assert.equal(lastIframeSrc, "", "iframe must not be used when location.replace succeeds");

  // replace fails → anchor _self in same tab (no iframe, no second window.open)
  const deferredIframe = openDeferredPopup({ context: "pdf", label: "PDF iframe" });
  assert.ok(!("status" in deferredIframe));
  if (!("status" in deferredIframe)) {
    const iframeWin = mockWindows[mockWindows.length - 1];
    assert.ok(iframeWin);
    replaceCalls = [];
    lastIframeSrc = "";
    iframeWin!.location.replace = () => {
      throw new Error("replace blocked");
    };
    const countBefore = mockWindows.length;
    const iframeNav = deferredIframe.navigate("blob:iframe-fallback");
    assert.equal(iframeNav.status, "opened");
    assert.equal(mockWindows.length, countBefore, "anchor _self must not open another window");
    assert.equal(lastIframeSrc, "", "iframe must not be used");
  }

  // 9: fetch error path closes blank tab, no retry session
  const deferredErr = openDeferredPopup({ context: "pdf" });
  assert.ok(!("status" in deferredErr));
  if (!("status" in deferredErr)) {
    const idx = mockWindows.length - 1;
    deferredErr.close();
    assert.equal(mockWindows[idx]?.closed, true);
  }
  assert.equal(getActivePopupRetrySession(), null);

  // navigate failure → blocked session with blob, no second window.open
  const deferredNav = openDeferredPopup({ context: "pdf" });
  assert.ok(!("status" in deferredNav));
  if (!("status" in deferredNav)) {
    const win = mockWindows[mockWindows.length - 1];
    assert.ok(win);
    win!.closed = true;
    const beforeCount = mockWindows.length;
    dialogCalls = 0;
    const navBlocked = deferredNav.navigate("blob:retry-me", { revokeBlobUrlAfterMs: 120_000 });
    assert.equal(navBlocked.status, "blocked");
    assert.equal(mockWindows.length, beforeCount, "navigate must not call window.open again");
    assert.equal(dialogCalls, 0, "navigate failure must not show popup-blocked toast");
    assert.equal(getActivePopupRetrySession()?.url, "blob:retry-me");
    if (navBlocked.status === "blocked") clearPopupRetrySession(navBlocked.sessionId);
  }
}

// 5a: retryUrl + null window.open → anchor fallback (no blocked session)
installWindowOpenMock();
registerPopupBlockedDialogHandler(null);
openImpl = () => null;
const anchorFallback = openDeferredPopup({
  context: "pdf",
  retryUrl: "/api/pdf/artifacts/report-bundle",
  showBlockedDialog: false,
});
assert.ok(!("status" in anchorFallback));
if (!("status" in anchorFallback)) {
  const nav = anchorFallback.navigate("/api/pdf/artifacts/report-bundle");
  assert.equal(nav.status, "opened");
}

// 5b: retry opens blob after full navigate chain fails
installWindowOpenMock();
registerPopupBlockedDialogHandler(null);
const deferredBlob = openDeferredPopup({ context: "pdf", showBlockedDialog: false });
assert.ok(!("status" in deferredBlob));
if (!("status" in deferredBlob)) {
  const win = mockWindows[mockWindows.length - 1];
  assert.ok(win);
  win!.location.replace = () => {
    throw new Error("replace failed");
  };
  const navOk = deferredBlob.navigate("blob:stored");
  assert.equal(navOk.status, "opened", "location.href fallback when replace fails");
  assert.equal(win!.location.href, "blob:stored");
}

// openSafePopup blob: direct window.open(blob) (no about:blank preopen)
installWindowOpenMock();
registerPopupBlockedDialogHandler(null);
replaceCalls = [];
const blobOpened = openSafePopup({ url: "blob:safe-popup", context: "pdf", showBlockedDialog: false });
assert.equal(blobOpened.status, "opened");
assert.equal(mockWindows.length, 1);
assert.equal(mockWindows[0]?.location.href, "blob:safe-popup");
assert.deepEqual(replaceCalls, []);

// 7: documento API URL
installWindowOpenMock();
registerPopupBlockedDialogHandler(null);
const docOpened = openSafePopup({ url: "/api/documenti/preview/1", context: "documento" });
assert.equal(docOpened.status, "opened");

// 8: double click opens two windows when allowed
installWindowOpenMock();
registerPopupBlockedDialogHandler(null);
const d1 = openDeferredPopup({ context: "etichette" });
const d2 = openDeferredPopup({ context: "etichette" });
assert.ok(!("status" in d1));
assert.ok(!("status" in d2));
assert.equal(mockWindows.length, 2);
if (!("status" in d1)) d1.close();
if (!("status" in d2)) d2.close();

// window.open must not pass noopener features (Chromium false positive)
const popupGuardSrc = fs.readFileSync(
  path.join(process.cwd(), "lib/browser/popup-guard.ts"),
  "utf8",
);
assert.doesNotMatch(popupGuardSrc, /window\.open\([^)]*noopener/);
assert.doesNotMatch(popupGuardSrc, /<embed\b/);
assert.match(popupGuardSrc, /scheduleBlobUrlRevoke/);
assert.match(popupGuardSrc, /window\.setTimeout\([\s\S]*URL\.revokeObjectURL/);

assert.ok(POPUP_RETRY_SESSION_TTL_MS > 0);

registerPopupBlockedDialogHandler(null);
console.log("popup-guard: OK");
