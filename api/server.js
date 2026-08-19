/* ============================================================
   VIBE ENERGY — Brochure-API
   ------------------------------------------------------------
   POST /api/brochure
   Valideert de aanvraag, mailt de lead naar sales@vibeenergy.nl
   en stuurt de bezoeker een mail met de brochurelink, via Resend.

   ENV:
     RESEND_API_KEY  (verplicht in productie; nooit in git/client)
     APP_ORIGIN      toegestane CORS-origins, kommagescheiden
                     (default: https://www.vibeenergy.nl,https://vibeenergy.nl)
     RESEND_STUB=1   alleen voor tests: geen echte Resend-calls
     PORT            (Railway zet deze)
   ============================================================ */
import express from "express";
import crypto from "node:crypto";

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const STUB = process.env.RESEND_STUB === "1";
const SITE = "https://www.vibeenergy.nl";
const FROM = "Vibe Energy <no-reply@vibeenergy.nl>";
const SALES = "sales@vibeenergy.nl"; // vast, niet overschrijfbaar vanuit de client

const ALLOWED_ORIGINS = (process.env.APP_ORIGIN || "https://www.vibeenergy.nl,https://vibeenergy.nl")
  .split(",").map((s) => s.trim()).filter(Boolean);

/* Whitelist: brochure-id -> titel, document en bronpagina. De client levert
   alleen het id; URL en titel komen altijd van de server. */
const BROCHURES = {
  home:          { title: "Van energiekosten naar energieopbrengsten", doc: "energie-als-vastgoedopbrengst.html", page: "/" },
  exploitatie:   { title: "Exploitatie zonder investering",            doc: "exploitatie-zonder-investering.html", page: "/oplossing-exploitatie" },
  energielabel:  { title: "Energielabel verhogen",                     doc: "energielabel-verhogen.html",          page: "/oplossing-energielabel" },
  laadplein:     { title: "Laadplein zonder netverzwaring",            doc: "laadplein-zonder-verzwaring.html",    page: "/oplossing-laadplein" },
  netcongestie:  { title: "Netcongestie oplossen",                     doc: "netcongestie-oplossen.html",          page: "/oplossing-netcongestie" },
};

/* ---------- rate limiting + dedupe (in-memory) ---------- */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_IP = 5;
const MAX_PER_EMAIL = 3;
const ipHits = new Map();     // ip -> [timestamps]
const emailHits = new Map();  // email -> [timestamps]
const sentKeys = new Map();   // dedupeKey -> timestamp

function prune(map, windowMs) {
  const cut = Date.now() - windowMs;
  for (const [k, v] of map) {
    const kept = Array.isArray(v) ? v.filter((t) => t > cut) : v > cut ? v : null;
    if (!kept || (Array.isArray(kept) && !kept.length)) map.delete(k);
    else map.set(k, kept);
  }
}
setInterval(() => { prune(ipHits, WINDOW_MS); prune(emailHits, WINDOW_MS); prune(sentKeys, WINDOW_MS); }, 60 * 1000).unref();

function hit(map, key, max) {
  const now = Date.now();
  const arr = (map.get(key) || []).filter((t) => t > now - WINDOW_MS);
  if (arr.length >= max) return false;
  arr.push(now);
  map.set(key, arr);
  return true;
}

/* ---------- CORS: alleen eigen origins, geen * ---------- */
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

app.use(express.json({ limit: "8kb" }));
app.use((err, _req, res, next) => {
  if (err) return res.status(400).json({ ok: false, error: "bad_request" });
  next();
});

app.get("/health", (_req, res) => res.json({ ok: true }));
if (STUB) app.get("/__stub/sent", (_req, res) => res.json(stubSent));

/* ---------- Resend ---------- */
const stubSent = []; // alleen gevuld in stub-mode, voor tests
async function resendSend(payload, idempotencyKey) {
  if (STUB) {
    if (process.env.RESEND_STUB_FAIL === "1") return { ok: false, status: 500 };
    stubSent.push({ ...payload, idempotencyKey });
    return { ok: true, id: "stub-" + crypto.randomUUID() };
  }
  if (!RESEND_API_KEY) return { ok: false, status: 503, error: "not_configured" };
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 15000);
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
      signal: ac.signal,
    });
    const body = await r.json().catch(() => ({}));
    if (r.ok) return { ok: true, id: body.id || "" };
    // geen provider-payload naar de client; alleen serverlog zonder secrets
    console.error(`[brochure] resend ${r.status} for ${payload.to}: ${JSON.stringify(body).slice(0, 300)}`);
    return { ok: false, status: r.status };
  } catch (e) {
    console.error(`[brochure] resend error: ${e.name || e.message}`);
    return { ok: false, status: 504 };
  } finally {
    clearTimeout(timer);
  }
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function salesHtml({ name, email, phone, brochure, page, ts }) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#0f2230;font-size:15px;line-height:1.7">
<h2 style="margin:0 0 12px;color:#06121C">Nieuwe brochureaanvraag</h2>
<p style="margin:0">
<strong>Naam:</strong> ${esc(name || "—")}<br>
<strong>E-mail:</strong> ${esc(email)}<br>
<strong>Telefoon:</strong> ${esc(phone)}<br>
<strong>Brochure:</strong> ${esc(brochure.title)}<br>
<strong>Bronpagina:</strong> ${esc(SITE + brochure.page)}<br>
<strong>Tijdstip:</strong> ${esc(ts)}</p></div>`;
}

function visitorHtml({ name, brochure }) {
  const first = (name || "").trim().split(/\s+/)[0];
  const hi = first ? `Beste ${esc(first)},` : "Beste,";
  const url = `${SITE}/${brochure.doc}`;
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#0f2230;max-width:560px;margin:0 auto">
<div style="background:#06121C;padding:26px 28px"><span style="color:#00ADEF;font-weight:700;letter-spacing:.04em;font-size:18px">VIBE ENERGY</span></div>
<div style="padding:30px 28px;font-size:15px;line-height:1.6">
<p style="margin:0 0 14px">${hi}</p>
<p style="margin:0 0 14px">Bedankt voor uw interesse. Uw brochure <strong>${esc(brochure.title)}</strong> staat voor u klaar:</p>
<p style="margin:22px 0"><a href="${esc(url)}" style="display:inline-block;background:#00ADEF;color:#041018;font-weight:700;text-decoration:none;padding:13px 24px;border-radius:4px">Brochure openen &rarr;</a></p>
<p style="margin:14px 0 0;color:#5b6b76;font-size:13px">Werkt de knop niet? Kopieer deze link:<br>${esc(url)}</p>
<p style="margin:22px 0 0">Vragen? Beantwoord gerust deze e-mail.<br>&mdash; Team Vibe Energy</p>
</div></div>`;
}

/* ---------- endpoint ---------- */
app.post("/api/brochure", async (req, res) => {
  const b = req.body || {};

  // honeypot: bots die het verborgen veld invullen krijgen een nep-succes
  if (typeof b.website === "string" && b.website.trim() !== "") {
    return res.json({ ok: true });
  }

  const name = String(b.name || "").trim().slice(0, 200);
  const email = String(b.email || "").trim().slice(0, 254);
  const phone = String(b.phone || "").trim().slice(0, 40);
  const slug = String(b.brochure || "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return res.status(422).json({ ok: false, error: "email" });
  }
  if (phone.replace(/\D/g, "").length < 8) {
    return res.status(422).json({ ok: false, error: "phone" });
  }
  const brochure = BROCHURES[slug];
  if (!brochure) {
    return res.status(422).json({ ok: false, error: "brochure" });
  }

  const ip = req.ip || "unknown";
  if (!hit(ipHits, ip, MAX_PER_IP) || !hit(emailHits, email.toLowerCase(), MAX_PER_EMAIL)) {
    return res.status(429).json({ ok: false, error: "rate_limited" });
  }

  // server-side dedupe: zelfde e-mail + brochure binnen het venster -> geen tweede mail
  const dedupeKey = crypto.createHash("sha256").update(`${email.toLowerCase()}|${slug}`).digest("hex");
  if (sentKeys.has(dedupeKey)) {
    return res.json({ ok: true, deduped: true });
  }

  const ts = new Date().toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam", dateStyle: "full", timeStyle: "short" });
  const lead = { name, email, phone, brochure, page: brochure.page, ts };

  // 1) salesmail — verplicht voor succes
  const sales = await resendSend({
    from: FROM,
    to: [SALES],
    reply_to: email,
    subject: `Nieuwe brochureaanvraag — ${brochure.title}`,
    html: salesHtml(lead),
  }, `brochure-sales-${dedupeKey}`);

  if (!sales.ok) {
    return res.status(sales.status === 503 ? 503 : 502).json({ ok: false, error: "mail_failed" });
  }
  sentKeys.set(dedupeKey, Date.now());

  // 2) bezoekersmail — best effort; falen maakt de lead niet ongedaan
  const visitor = await resendSend({
    from: FROM,
    to: [email],
    reply_to: SALES,
    subject: `Uw Vibe Energy brochure — ${brochure.title}`,
    html: visitorHtml(lead),
  }, `brochure-visitor-${dedupeKey}`);

  return res.json({ ok: true, id: sales.id, visitorMail: !!visitor.ok });
});

app.use((_req, res) => res.status(404).json({ ok: false, error: "not_found" }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`[brochure-api] listening on :${port} (stub=${STUB}, key=${RESEND_API_KEY ? "present" : "MISSING"})`));
