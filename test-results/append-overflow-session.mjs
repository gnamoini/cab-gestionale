import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "test-results/overflow-runtime-final.json");
const route = process.argv[2];
const sessionPath = process.argv[3] ?? path.join(ROOT, "test-results/overflow-runtime-temp-session.json");

const session = JSON.parse(fs.readFileSync(sessionPath, "utf8"));

let payload = {
  collectedAt: new Date().toISOString(),
  baseUrl: "http://localhost:3000",
  viewport: { width: 724, height: 900 },
  login: { loggedIn: true, reason: "cursor_browser_session" },
  sessionCount: 0,
  sessions: [],
};

if (fs.existsSync(OUT)) {
  payload = JSON.parse(fs.readFileSync(OUT, "utf8"));
}

payload.sessions = payload.sessions.filter((s) => s.route !== route);
payload.sessions.push({
  route,
  viewport: "724",
  viewportWidth: 724,
  url: session.pathname ? `http://localhost:3000${session.pathname}` : undefined,
  session,
});
payload.sessionCount = payload.sessions.length;
payload.collectedAt = new Date().toISOString();

fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
console.log(`Appended ${route} (${payload.sessions.length} total)`);
