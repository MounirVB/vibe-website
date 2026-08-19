/* Testsuite voor de brochure-API — draait volledig tegen de stub (geen echte mails).
   Gebruik: npm test (in api/). */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = 8971;
const BASE = `http://127.0.0.1:${PORT}`;
const ORIGIN_OK = "https://www.vibeenergy.nl";

let passed = 0, failed = 0;
function check(label, cond, extra = "") {
  if (cond) { passed++; console.log(`  PASS  ${label}`); }
  else { failed++; console.log(`  FAIL  ${label} ${extra}`); }
}

async function post(body, headers = {}) {
  const r = await fetch(`${BASE}/api/brochure`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN_OK, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  let json = null;
  try { json = await r.json(); } catch {}
  return { status: r.status, json, headers: r.headers };
}
const sent = async () => (await fetch(`${BASE}/__stub/sent`)).json();

function startServer(env = {}) {
  const child = spawn("node", ["server.js"], {
    cwd: new URL("..", import.meta.url).pathname,
    env: { ...process.env, PORT: String(PORT), RESEND_STUB: "1", ...env },
    stdio: "ignore",
  });
  return child;
}
async function waitUp() {
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(`${BASE}/health`)).ok) return; } catch {}
    await sleep(150);
  }
  throw new Error("server kwam niet op");
}

const VALID = { name: "Test Persoon", email: "test@example.com", phone: "0612345678", brochure: "netcongestie" };

/* ---------- ronde 1: normale stub ---------- */
let srv = startServer();
await waitUp();

// 1. geldige aanvraag
let r = await post(VALID);
check("geldige aanvraag -> 200 ok", r.status === 200 && r.json?.ok === true && String(r.json.id).startsWith("stub-"), JSON.stringify(r.json));
let s = await sent();
check("2 mails verstuurd (sales + bezoeker)", s.length === 2, `count=${s.length}`);
check("salesmail naar sales@vibeenergy.nl", s[0]?.to?.[0] === "sales@vibeenergy.nl", JSON.stringify(s[0]?.to));
check("salesmail reply-to = bezoeker", s[0]?.reply_to === VALID.email);
check("salesmail bevat naam/tel/brochure/bron/tijd", ["Test Persoon", "0612345678", "Netcongestie oplossen", "/oplossing-netcongestie", "Tijdstip"].every((x) => s[0]?.html?.includes(x)));
check("subject correct", s[0]?.subject === "Nieuwe brochureaanvraag — Netcongestie oplossen", s[0]?.subject);
check("bezoekersmail naar bezoeker, reply-to sales", s[1]?.to?.[0] === VALID.email && s[1]?.reply_to === "sales@vibeenergy.nl");
check("bezoekersmail linkt naar whitelisted brochure-URL", s[1]?.html?.includes("https://www.vibeenergy.nl/netcongestie-oplossen.html"));

// 2. duplicate submit -> dedupe, geen extra mail
r = await post(VALID);
check("duplicate -> 200 deduped", r.status === 200 && r.json?.deduped === true, JSON.stringify(r.json));
s = await sent();
check("geen extra mails na duplicate", s.length === 2, `count=${s.length}`);

// 3. ongeldige e-mail
r = await post({ ...VALID, email: "geen-mail" });
check("ongeldige e-mail -> 422", r.status === 422 && r.json?.error === "email");

// 4. ontbrekend/ongeldig telefoonnummer
r = await post({ ...VALID, email: "t2@example.com", phone: "12" });
check("ongeldig telefoonnummer -> 422", r.status === 422 && r.json?.error === "phone");

// 5. onbekende brochure
r = await post({ ...VALID, email: "t3@example.com", brochure: "../../etc/passwd" });
check("onbekende brochure -> 422", r.status === 422 && r.json?.error === "brochure");

// 6. recipient-manipulatie wordt genegeerd
r = await post({ ...VALID, email: "t4@example.com", brochure: "laadplein", to: "aanvaller@evil.com", recipient: "aanvaller@evil.com", sales: "aanvaller@evil.com" });
s = await sent();
const last = s[s.length - 2];
check("client-recipient genegeerd; sales blijft vast", r.status === 200 && last?.to?.[0] === "sales@vibeenergy.nl", JSON.stringify(last?.to));

// 7. arbitrary URL uit frontend komt niet in de mail
r = await post({ ...VALID, email: "t5@example.com", brochure: "energielabel", url: "https://evil.com/phish.pdf" });
s = await sent();
const vis = s[s.length - 1];
check("arbitrary url genegeerd; link = whitelist", !vis?.html?.includes("evil.com") && vis?.html?.includes("https://www.vibeenergy.nl/energielabel-verhogen.html"));

// 8. honeypot -> nep-succes, geen mail
const before = (await sent()).length;
r = await post({ ...VALID, email: "bot@example.com", website: "http://spam" });
check("honeypot -> 200 zonder mail", r.status === 200 && (await sent()).length === before);

// 9. CORS
let pre = await fetch(`${BASE}/api/brochure`, { method: "OPTIONS", headers: { Origin: ORIGIN_OK, "Access-Control-Request-Method": "POST" } });
check("CORS preflight eigen origin -> ACAO gezet", pre.status === 204 && pre.headers.get("access-control-allow-origin") === ORIGIN_OK);
pre = await fetch(`${BASE}/api/brochure`, { method: "OPTIONS", headers: { Origin: "https://evil.com", "Access-Control-Request-Method": "POST" } });
check("CORS vreemde origin -> geen ACAO", !pre.headers.get("access-control-allow-origin"));
check("nooit ACAO *", pre.headers.get("access-control-allow-origin") !== "*");

// 10. payload size limit
r = await post(JSON.stringify({ ...VALID, email: "t6@example.com", name: "x".repeat(20000) }));
check("payload > 8kb -> 4xx", r.status === 400 || r.status === 413, `status=${r.status}`);

// 11. rate limit per IP (5/venster) — blijf posten tot de limiet valt
let limited = null;
for (let i = 0; i < 6 && !limited; i++) {
  const rr = await post({ ...VALID, email: `t7-${i}@example.com`, brochure: "home" });
  if (rr.status === 429) limited = rr;
}
check("rate limit per IP -> 429", limited?.status === 429 && limited?.json?.error === "rate_limited", `status=${limited?.status}`);

// 12. geen secrets/stacktraces in error-responses
r = await post("{kapotte json");
check("kapotte JSON -> 400 zonder stacktrace", r.status === 400 && JSON.stringify(r.json || {}).length < 100 && !JSON.stringify(r.json).match(/at |Error:/));

srv.kill();
await sleep(200);

/* ---------- ronde 2: Resend-failure ---------- */
srv = startServer({ RESEND_STUB_FAIL: "1" });
await waitUp();
r = await post(VALID);
check("Resend-fout -> 502 mail_failed (geen vals succes)", r.status === 502 && r.json?.ok === false && r.json?.error === "mail_failed", JSON.stringify(r.json));
srv.kill();
await sleep(200);

/* ---------- ronde 3: geen key, geen stub -> 503 ---------- */
srv = startServer({ RESEND_STUB: "", RESEND_API_KEY: "" });
await waitUp();
r = await post(VALID);
check("geen API key -> 503 not_configured", r.status === 503, `status=${r.status}`);
srv.kill();

console.log(`\n${passed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
