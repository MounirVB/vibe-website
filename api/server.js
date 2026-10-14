/* ============================================================
   VIBE ENERGY — Brochure- en meldingen-API
   ------------------------------------------------------------
   POST /api/brochure
   Valideert de aanvraag, mailt de lead naar sales@vibeenergy.nl
   en stuurt de bezoeker een mail met de brochurelink, via Resend.

   POST /api/meld
   Zet een operationele melding van het intelligenceplatform om in een
   e-mail naar marketing@vibeenergy.nl. Vraagt een bearer-token.

   WAAROM DE ALARMERING HIER ZIT EN NIET IN EEN NIEUWE DIENST.
   `intelligence/src/ops/melden.ts` kan al meldingen afleveren op een
   https-webhook (INTEL_MELD_WEBHOOK), met pogingen, foutregistratie en
   deduplicatie in de database. Wat ontbrak was een BESTEMMING. En deze
   service heeft al wat daarvoor nodig is: een werkende Resend-sleutel,
   een geverifieerd afzenderdomein (de brochuremail gaat sinds augustus
   2026 vanaf no-reply@vibeenergy.nl) en een idempotentiesleutel per
   bericht. Een tweede provider erbij zou een tweede sleutel, een tweede
   domeinverificatie en een tweede faalwijze betekenen voor precies
   dezelfde handeling.

   ENV:
     RESEND_API_KEY  (verplicht in productie; nooit in git/client)
     MELD_TOKEN      (verplicht voor /api/meld; zonder token weigert hij)
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

/* De bestemming van operationele meldingen. VAST, net als SALES.
   Een aanroeper die zijn eigen ontvanger mag opgeven, maakt van deze
   service een open mailrelay — en bij een alarmeringspad is dat extra
   wrang, want dan kan iemand met het token mail namens vibeenergy.nl
   naar een willekeurig adres sturen. */
const MARKETING = "marketing@vibeenergy.nl";
const MELD_TOKEN = process.env.MELD_TOKEN || "";
/* Waar een mens de melding in context kan zien. Het dashboard is
   geauthenticeerd, dus een link erheen geeft niets weg. */
const MONITOR_URL = process.env.INTEL_DASHBOARD_URL || "https://vibe-intel-api-production.up.railway.app";

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

/* ============================================================
   OPERATIONELE MELDINGEN
   ============================================================ */

/** Vergelijkt twee tokens in constante tijd. */
function tokenKlopt(gegeven) {
  if (!MELD_TOKEN || typeof gegeven !== "string" || gegeven.length === 0) return false;
  const a = Buffer.from(gegeven);
  const b = Buffer.from(MELD_TOKEN);
  /* timingSafeEqual eist gelijke lengte, en de lengte zelf is geen
     geheim dat het beschermen waard is — maar vergelijken zonder deze
     controle gooit. */
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

const NIVEAUKLEUR = {
  KRITIEK: "#B00020",
  FOUT: "#C2410C",
  WAARSCHUWING: "#8A6100",
  HERSTEL: "#1C7B4D",
};

const NIVEAUWOORD = {
  KRITIEK: "Kritieke storing",
  FOUT: "Storing",
  WAARSCHUWING: "Waarschuwingen — dagelijkse samenvatting",
  HERSTEL: "Opgelost",
};

function meldHtml({ niveau, titel, items, bundel }) {
  const kleur = NIVEAUKLEUR[niveau] || "#0f2230";
  const kop = NIVEAUWOORD[niveau] || "Melding";
  const regels = items
    .map(
      (i) => `<tr>
<td style="padding:10px 12px;border-top:1px solid #e3e8ec;vertical-align:top">
  <div style="font-weight:700;color:#06121C">${esc(i.signaal)}</div>
  <div style="color:#5b6b76;font-size:13px;margin-top:2px">${esc(i.niveau)} · sinds ${esc(
    (i.sinds || "").slice(0, 16).replace("T", " "),
  )} · ${esc(String(i.keren_gezien ?? "?"))}× gezien</div>
  <div style="margin-top:6px">${esc(i.meting || "")}</div>
  ${i.advies ? `<div style="margin-top:6px;color:#0b5a7a"><strong>Handeling:</strong> ${esc(i.advies)}</div>` : ""}
</td></tr>`,
    )
    .join("");

  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#0f2230;max-width:640px;margin:0 auto">
<div style="background:#06121C;padding:22px 26px">
  <span style="color:#00ADEF;font-weight:700;letter-spacing:.04em;font-size:17px">VIBE ENERGY</span>
  <span style="color:#7e8c96;font-size:13px;margin-left:10px">Intelligence — operationele monitoring</span>
</div>
<div style="padding:22px 26px">
  <div style="display:inline-block;background:${kleur};color:#fff;font-weight:700;font-size:12px;letter-spacing:.06em;padding:5px 10px;border-radius:3px">${esc(
    niveau,
  )}</div>
  <h2 style="margin:14px 0 4px;color:#06121C;font-size:19px">${esc(kop)}</h2>
  <p style="margin:0 0 4px;font-size:15px">${esc(titel)}</p>
  ${
    bundel
      ? `<p style="margin:10px 0 0;padding:10px 12px;background:#f1f6f9;border-left:3px solid #00ADEF;font-size:14px">
  Deze ${items.length} signalen horen bij <strong>één onderliggend probleem</strong>: ${esc(bundel)}.</p>`
      : ""
  }
  <table style="width:100%;border-collapse:collapse;margin:18px 0;font-size:14px">${regels}</table>
  <p style="margin:18px 0 0">
    <a href="${esc(MONITOR_URL)}" style="display:inline-block;background:#00ADEF;color:#041018;font-weight:700;text-decoration:none;padding:11px 20px;border-radius:4px">Monitoring openen &rarr;</a>
  </p>
  <p style="margin:18px 0 0;color:#5b6b76;font-size:12px;line-height:1.6">
    Verzonden door Vibe Energy Intelligence. Dit is een automatisch bericht over de
    operationele toestand van het platform; er staan geen klant- of persoonsgegevens in.
    Antwoorden op dit bericht komt niet bij een mens terecht.
  </p>
</div></div>`;
}

app.post("/api/meld", async (req, res) => {
  /* GEEN CORS, GEEN BROWSER. Dit endpoint is voor de worker en de
     planner in het privénetwerk; een origin-header hoort hier niet. */
  const auth = String(req.headers.authorization || "");
  const gegeven = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!MELD_TOKEN) {
    /* Expliciet 503 en niet 401: het verschil tussen "jij mag niet" en
       "dit pad is niet ingericht" is voor de aanroeper bruikbaar, en
       melden.ts legt de reden vast in laatste_bezorgfout. */
    return res.status(503).json({ ok: false, error: "meld_not_configured" });
  }
  if (!tokenKlopt(gegeven)) return res.status(401).json({ ok: false, error: "unauthorized" });

  const b = req.body || {};
  const niveau = String(b.niveau || "").toUpperCase();
  if (!Object.prototype.hasOwnProperty.call(NIVEAUKLEUR, niveau)) {
    return res.status(422).json({ ok: false, error: "niveau" });
  }
  const titel = String(b.titel || "").trim().slice(0, 300);
  if (!titel) return res.status(422).json({ ok: false, error: "titel" });

  const items = Array.isArray(b.items) ? b.items.slice(0, 50) : [];
  if (!items.length) return res.status(422).json({ ok: false, error: "items" });

  const bundel = b.bundel ? String(b.bundel).slice(0, 120) : null;
  /* De afdruk komt van de aanroeper en is zijn deduplicatiesleutel. Valt
     hij weg, dan maken we er zelf een uit de inhoud: twee identieke
     berichten mogen nooit twee mails worden, ook niet als de aanroeper
     dat veld vergeet. */
  const afdruk = String(
    b.afdruk ||
      crypto.createHash("sha256").update(JSON.stringify({ niveau, titel, items })).digest("hex"),
  ).slice(0, 80);

  const voorvoegsel =
    niveau === "WAARSCHUWING" ? "[SAMENVATTING]" : niveau === "HERSTEL" ? "[HERSTEL]" : `[${niveau}]`;

  const uit = await resendSend(
    {
      from: FROM,
      to: [MARKETING],
      subject: `${voorvoegsel} Vibe Energy Intelligence — ${titel}`.slice(0, 180),
      html: meldHtml({ niveau, titel, items, bundel }),
    },
    `meld-${afdruk}`,
  );

  if (!uit.ok) {
    return res.status(uit.status === 503 ? 503 : 502).json({ ok: false, error: "mail_failed" });
  }
  return res.json({ ok: true, id: uit.id, items: items.length });
});

app.use((_req, res) => res.status(404).json({ ok: false, error: "not_found" }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`[brochure-api] listening on :${port} (stub=${STUB}, key=${RESEND_API_KEY ? "present" : "MISSING"})`));
