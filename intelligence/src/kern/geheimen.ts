/* ============================================================
   KERN — één plek waar een geheim uit tekst wordt gehaald
   ------------------------------------------------------------
   HET DEFECT DAT DIT OPLOST — gemeten, niet vermoed.

   `kern/log.ts` schermde geheimen al af, maar deed dat met patronen die
   module-privé stonden. Daardoor was de afscherming alleen van kracht op
   de route die toevallig door de logger liep. De route die het NIET deed
   was de route die telt:

     kern/wachtrij.ts nam `fout.message` ruw over en schreef die in
     intel.taken.laatste_fout.

   En `ops/backup.ts` gaf de volledige verbindings-URL als laatste
   argv-element aan pg_dump. Node zet bij een mislukte execFile de hele
   commandoregel in `Error.message`. Een falende back-up schreef daarmee
   het productiewachtwoord in de database.

   Twee grendels, want één is te weinig:

   1 Het geheim hoort niet op een commandoregel te staan. Zie
     ops/pgomgeving.ts: de credential gaat via de procesomgeving.
   2 Mocht er tóch ergens een geheim in tekst belanden, dan haalt
     `redigeer()` hem eruit — en elke persisteer- en logroute roept die
     aan. Dit bestand is de enige plek waar de patronen staan.
   ============================================================ */

export const VERBORGEN = "[verborgen]";

/** Sleutelnamen die nooit een waarde mogen tonen. */
export const VERDACHTE_SLEUTEL =
  /(sleutel|key|token|secret|geheim|wachtwoord|password|authorization|cookie|bearer|private)/i;

/**
 * Patronen van geheimen zoals ze in een waarde kunnen opduiken.
 *
 * De postgres-variant dekt ook `postgres://`, een poort, en een
 * wachtwoord met leestekens. Hij vervangt de hele `scheme://user:pass@`
 * zodat er geen gebruikersnaam overblijft om op te raden.
 */
const VERDACHTE_WAARDE: readonly RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\bghp_[A-Za-z0-9]{20,}\b/g,
  /\bre_[A-Za-z0-9_-]{16,}\b/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp|https?):\/\/[^/@\s:]+:[^@\s]+@/gi,
  /\bPG(?:PASSWORD|PASSFILE)\s*=\s*\S+/g,
  /\b(?:password|wachtwoord|passwd|pwd)\s*=\s*\S+/gi,
];

/* Een te kort geheim letterlijk wegstrepen maakt gewone tekst
   onleesbaar: een wachtwoord 'test' zou elk woord 'test' verbergen.
   Acht tekens is de ondergrens waaronder we alleen op patroon gaan. */
const MINIMALE_LETTERLIJKE_LENGTE = 8;

function ontsnap(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Haalt geheimen uit vrije tekst.
 *
 * @param tekst de tekst zoals die gelogd of bewaard zou worden
 * @param extra letterlijke geheimen die we kennen (bijv. het wachtwoord
 *              uit de geconfigureerde verbindings-URL). Korter dan acht
 *              tekens wordt genegeerd; zie de toelichting hierboven.
 */
export function redigeer(tekst: string, extra: readonly (string | null | undefined)[] = []): string {
  let uit = tekst;
  for (const p of VERDACHTE_WAARDE) uit = uit.replace(p, VERBORGEN);
  for (const geheim of extra) {
    if (!geheim || geheim.length < MINIMALE_LETTERLIJKE_LENGTE) continue;
    uit = uit.replace(new RegExp(ontsnap(geheim), "g"), VERBORGEN);
  }
  return uit;
}

/**
 * De boodschap van een onbekende fout, geredigeerd.
 *
 * Gebruik dit op ELKE plek waar een foutmelding naar stdout, stderr of
 * een databasekolom gaat. Node zet bij een mislukte execFile de hele
 * commandoregel in `message`, `cmd` én de eerste stackregel; die drie
 * zijn gemeten op node v24. We nemen daarom alleen de message en halen
 * het geheim eruit, met het geconfigureerde wachtwoord als extra.
 */
export function redacteerFout(fout: unknown): string {
  const ruw = fout instanceof Error ? fout.message : String(fout);
  return redigeer(ruw, [wachtwoordUit(process.env.INTEL_DB_URL)]);
}

/**
 * Het wachtwoord uit een verbindings-URL, zodat `redigeer` het ook
 * letterlijk kan wegstrepen wanneer het buiten zijn URL opduikt —
 * bijvoorbeeld omdat een gereedschap het los in een foutmelding zet.
 *
 * Geeft null bij een URL zonder wachtwoord of bij onparseerbare tekst.
 * Werpt NOOIT: een redactiehulp die zelf omvalt is erger dan geen hulp.
 */
export function wachtwoordUit(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.password ? decodeURIComponent(u.password) : null;
  } catch {
    const m = /^[a-z+]+:\/\/[^/@\s:]+:([^@\s]+)@/i.exec(url);
    return m?.[1] ? decodeURIComponent(m[1]) : null;
  }
}
