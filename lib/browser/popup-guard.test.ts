import assert from "node:assert/strict";
import {
  classifyPopupUrlKind,
  openDeferredPopup,
  openSafePopup,
  registerPopupBlockedDialogHandler,
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
  location: { href: string; replace: (url: string) => void };
  close: () => void;
};

let mockWindows: MockWindow[] = [];
let openImpl: (url: string) => MockWindow | null = () => null;

function installWindowOpenMock() {
  mockWindows = [];
  openImpl = (url: string) => {
    if (url === "__blocked__") return null;
    const win: MockWindow = {
      closed: false,
      location: {
        href: url,
        replace(next: string) {
          this.href = next;
        },
      },
      close() {
        this.closed = true;
      },
    };
    mockWindows.push(win);
    return win;
  };

  (globalThis as { window?: Window }).window = {
    open: (url: string) => openImpl(url) as unknown as Window,
    setTimeout: (fn: () => void) => {
      fn();
      return 0;
    },
    location: { hostname: "gestionale.test" },
  } as unknown as Window;
}

installWindowOpenMock();
registerPopupBlockedDialogHandler(null);

assert.equal(classifyPopupUrlKind("blob:abc"), "blob");
assert.equal(classifyPopupUrlKind("/api/pdf/x"), "api");
assert.equal(classifyPopupUrlKind("https://example.com"), "external");

assert.equal(detectPopupInstructionProfile("Mozilla/5.0 Chrome/120"), "chrome");
assert.equal(detectPopupInstructionProfile("Mozilla/5.0 Edg/120"), "edge");
assert.equal(detectPopupInstructionProfile("Mozilla/5.0 Firefox/120"), "firefox");

assert.equal(resolvePopupWhitelistDomain(), "gestionale.test");

const opened = openSafePopup({ url: "https://example.com/doc.pdf", context: "pdf" });
assert.equal(opened.status, "opened");

openImpl = () => null;
const blocked = openSafePopup({ url: "https://example.com/doc.pdf", context: "pdf", showBlockedDialog: false });
assert.equal(blocked.status, "blocked");
if (blocked.status === "blocked") {
  assert.ok(getActivePopupRetrySession()?.id === blocked.sessionId);
  clearPopupRetrySession(blocked.sessionId);
}

openImpl = (url: string) => {
  if (url === "about:blank") return null;
  return {
    closed: false,
    location: { href: url, replace(next: string) { this.href = next; } },
    close() { this.closed = true; },
  } as MockWindow;
};

const preopenBlocked = openDeferredPopup({ context: "etichette", label: "PDF etichetta" });
assert.equal("status" in preopenBlocked && preopenBlocked.status, "blocked");

openImpl = (url: string) => {
  const win: MockWindow = {
    closed: false,
    location: {
      href: url,
      replace(next: string) {
        this.href = next;
      },
    },
    close() {
      this.closed = true;
    },
  };
  mockWindows.push(win);
  return win;
};

const deferred = openDeferredPopup({ context: "pdf", label: "PDF" });
assert.ok(!("status" in deferred));

if (!("status" in deferred)) {
  const navigated = deferred.navigate("blob:pdf-test");
  assert.equal(navigated.status, "opened");
  assert.equal(mockWindows[mockWindows.length - 1]?.location.href, "blob:pdf-test");

  const deferred2 = openDeferredPopup({ context: "pdf" });
  assert.ok(!("status" in deferred2));
  if (!("status" in deferred2)) {
    const winIndex = mockWindows.length - 1;
    deferred2.close();
    assert.equal(mockWindows[winIndex]?.closed, true);
  }

  const deferred3 = openDeferredPopup({ context: "pdf" });
  assert.ok(!("status" in deferred3));
  if (!("status" in deferred3)) {
    const idx = mockWindows.length - 1;
    deferred3.close();
    assert.equal(mockWindows[idx]?.closed, true, "fetch fail must close blank tab");
  }
}

assert.ok(POPUP_RETRY_SESSION_TTL_MS > 0);

console.log("popup-guard: OK");
