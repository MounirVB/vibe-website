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
await sleep(200);

/* ============================================================
   RONDE 4 — /api/meld: operationele alarmering
   ------------------------------------------------------------
   Dit endpoint mailt naar marketing@vibeenergy.nl. Het is het pad
   waarlangs INTEL_MELD_WEBHOOK zijn meldingen aflevert, en daarmee het
   enige pad in deze service dat NIET door een bezoeker wordt
   aangeroepen maar door de worker in het privenetwerk.

   Wat hier getoetst wordt is wat er misgaat als het misgaat: een
   endpoint dat mail namens vibeenergy.nl kan versturen en dat zonder
   token open zou staan, is een open relay.
   ============================================================ */
const MELD_T = "toets-meldtoken-niet-geheim";
async function meld(body, headers = {}, base = BASE) {
  const r = await fetch(`${base}/api/meld`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  let json = null;
  try { json = await r.json(); } catch {}
  return { status: r.status, json };
}
const MELDING = {
  dienst: "vibe-energy-intelligence",
  niveau: "FOUT",
  titel: "ingestie/brondekking — 1 bron FAILED",
  items: [{ signaal: "ingestie/brondekking", niveau: "FOUT", meting: "FAILED: rendo-nieuws", advies: "npm run bronaudit", sinds: "2026-10-13T15:00:00Z", keren_gezien: 14 }],
  afdruk: "afdruk-een",
};

/* ---- 4a: zonder MELD_TOKEN staat het pad DICHT ---- */
srv = startServer();
await waitUp();
let m = await meld(MELDING);
check("meld zonder MELD_TOKEN -> 503 (pad niet ingericht, geen open relay)", m.status === 503 && m.json?.error === "meld_not_configured", `status=${m.status}`);
srv.kill();
await sleep(200);

/* ---- 4b..: met token ---- */
srv = startServer({ MELD_TOKEN: MELD_T });
await waitUp();

m = await meld(MELDING);
check("meld zonder bearer -> 401", m.status === 401, `status=${m.status}`);

m = await meld(MELDING, { Authorization: "Bearer fout-token-met-andere-lengte" });
check("meld met verkeerd token -> 401", m.status === 401, `status=${m.status}`);

m = await meld(MELDING, { Authorization: `Bearer ${MELD_T}` });
check("meld met geldig token -> 200", m.status === 200 && m.json?.ok === true && m.json?.items === 1, JSON.stringify(m.json));

let s4 = await sent();
const laatste = s4[s4.length - 1];
check("de ontvanger is VAST marketing@vibeenergy.nl", Array.isArray(laatste?.to) && laatste.to.length === 1 && laatste.to[0] === "marketing@vibeenergy.nl", JSON.stringify(laatste?.to));
check("het onderwerp draagt het niveau", /^\[FOUT\] Vibe Energy Intelligence —/.test(laatste?.subject || ""), laatste?.subject);
check("de afzender is het geverifieerde domein", String(laatste?.from || "").includes("no-reply@vibeenergy.nl"), laatste?.from);
check("de idempotentiesleutel komt uit de afdruk", laatste?.idempotencyKey === "meld-afdruk-een", laatste?.idempotencyKey);
check("de mail is Nederlands en noemt de handeling", /Handeling/.test(laatste?.html || "") && /operationele/.test(laatste?.html || ""));
check("de mail bevat geen persoonsgegevens-belofte zonder dekking", /geen klant- of persoonsgegevens/.test(laatste?.html || ""));

/* ---- een AANROEPER MAG DE ONTVANGER NIET KIEZEN ---- */
m = await meld({ ...MELDING, afdruk: "afdruk-twee", to: ["aanvaller@example.com"], MARKETING: "aanvaller@example.com" }, { Authorization: `Bearer ${MELD_T}` });
s4 = await sent();
const na = s4[s4.length - 1];
check("een opgegeven ontvanger wordt genegeerd", m.status === 200 && na.to[0] === "marketing@vibeenergy.nl", JSON.stringify(na.to));

/* ---- validatie ---- */
check("onbekend niveau -> 422", (await meld({ ...MELDING, niveau: "EXPLODEER" }, { Authorization: `Bearer ${MELD_T}` })).status === 422);
check("lege titel -> 422", (await meld({ ...MELDING, titel: "" }, { Authorization: `Bearer ${MELD_T}` })).status === 422);
check("geen items -> 422", (await meld({ ...MELDING, items: [] }, { Authorization: `Bearer ${MELD_T}` })).status === 422);

/* ---- BUNDELING: drie signalen, een probleem ---- */
m = await meld({
  niveau: "KRITIEK",
  titel: "rendo-nieuws is onbereikbaar",
  bundel: "bron rendo-nieuws",
  afdruk: "afdruk-bundel",
  items: [
    { signaal: "ingestie/brondekking", niveau: "FOUT", meting: "FAILED: rendo-nieuws", advies: null, sinds: "2026-10-13T15:00:00Z", keren_gezien: 14 },
    { signaal: "ingestie/bronnen met opeenvolgende fouten", niveau: "FOUT", meting: "1 van 20", advies: null, sinds: "2026-10-13T13:04:00Z", keren_gezien: 16 },
    { signaal: "ingestie/storingssoort TOEGANG_BEPERKT", niveau: "FOUT", meting: "1 bron", advies: null, sinds: "2026-10-13T16:02:00Z", keren_gezien: 13 },
  ],
}, { Authorization: `Bearer ${MELD_T}` });
s4 = await sent();
const bundel = s4[s4.length - 1];
check("een bundel levert EEN mail met alle drie de signalen", m.status === 200 && m.json.items === 3, JSON.stringify(m.json));
check("de mail benoemt het ene onderliggende probleem", /\u00e9\u00e9n onderliggend probleem/.test(bundel.html) && /rendo-nieuws/.test(bundel.html), bundel.html.slice(0, 0));
check("het onderwerp van een kritieke bundel begint met KRITIEK", /^\[KRITIEK\]/.test(bundel.subject), bundel.subject);

/* ---- HERSTEL en SAMENVATTING hebben hun eigen voorvoegsel ---- */
m = await meld({ ...MELDING, niveau: "HERSTEL", titel: "ingestie/brondekking is weer OK", afdruk: "afdruk-herstel" }, { Authorization: `Bearer ${MELD_T}` });
s4 = await sent();
check("herstelmail -> [HERSTEL]", m.status === 200 && /^\[HERSTEL\]/.test(s4[s4.length - 1].subject), s4[s4.length - 1].subject);

m = await meld({ ...MELDING, niveau: "WAARSCHUWING", titel: "6 waarschuwing(en)", afdruk: "afdruk-dag" }, { Authorization: `Bearer ${MELD_T}` });
s4 = await sent();
check("dagsamenvatting -> [SAMENVATTING]", m.status === 200 && /^\[SAMENVATTING\]/.test(s4[s4.length - 1].subject), s4[s4.length - 1].subject);

/* ---- GEEN CORS op dit pad ---- */
const meldPre = await fetch(`${BASE}/api/meld`, { method: "OPTIONS", headers: { Origin: ORIGIN_OK } });
check("preflight op /api/meld geeft geen POST-toegang zonder token", meldPre.status === 204 || meldPre.status === 404);

srv.kill();
await sleep(200);

/* ---- Resend-fout op het meldpad geeft GEEN vals succes ---- */
srv = startServer({ MELD_TOKEN: MELD_T, RESEND_STUB_FAIL: "1" });
await waitUp();
m = await meld({ ...MELDING, afdruk: "afdruk-faal" }, { Authorization: `Bearer ${MELD_T}` });
check("mailfout op het meldpad -> 502, geen vals succes", m.status === 502 && m.json?.ok === false, JSON.stringify(m.json));
srv.kill();

console.log(`\n${passed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
