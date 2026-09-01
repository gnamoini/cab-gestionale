import assert from "node:assert/strict";
import { resolveAuthorLabel } from "@/lib/auth/resolve-author-label";

assert.equal(
  resolveAuthorLabel({
    userId: "u-1",
    snapshotName: "Mario Rossi",
    viewerId: "u-viewer",
    viewerDisplayName: "Viewer Sbagliato",
  }),
  "Mario Rossi",
);

assert.equal(
  resolveAuthorLabel({
    userId: "u-me",
    profile: { nome: "Io", cognome: null },
    viewerId: "u-me",
    viewerDisplayName: "Tu (sessione)",
  }),
  "Tu (sessione)",
);

assert.equal(
  resolveAuthorLabel({
    userId: "u-other",
    viewerId: "u-me",
    viewerDisplayName: "Io Viewer",
  }),
  "Utente",
);

assert.equal(resolveAuthorLabel({ userId: null }), "Sistema");

console.log("resolve-author-label.test.ts OK");
