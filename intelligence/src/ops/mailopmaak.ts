/* ============================================================
   OPS — mailopmaak: hoe een melding eruitziet
   ------------------------------------------------------------
   DE EIS: de ontvanger moet binnen enkele seconden begrijpen wat er aan
   de hand is. Geen logdump.

   DAAROM DEZE ORDE. Bovenaan staat wat er stuk is en hoe erg. Daaronder
   de velden die een mens nodig heeft om te besluiten of hij nu iets moet
   doen: sinds wanneer, hoe vaak gezien, wat is de aanbevolen actie. De
   ruwe meting staat er wel bij, maar onderaan en per signaal — want
   zonder de meting is een alarm niet na te trekken, en dat is precies
   het defect dat deze release ook in de signaalregels heeft gerepareerd.

   WAARSCHIJNLIJKE OORZAAK ALLEEN INDIEN BEWEZEN. De opdracht is daar
   expliciet in. Deze module VERZINT er geen: hij zet de `advies`-tekst
   van het signaal neer, en die komt uit de gezondheidsmeting. Staat er
   geen advies, dan staat er geen oorzaak. Een lege regel is eerlijker
   dan een gok.

   ALLES WORDT GE-ESCAPED. De meting is geen HTML en kan tekens bevatten
   die het wel lijken. `escape()` staat om elke interpolatie heen, zonder
   uitzondering — ook om de velden die wij zelf samenstellen, want een
   uitzondering wordt bij de volgende wijziging vergeten.

   GEEN EXTERNE BRONNEN. Geen plaatjes, geen webfonts, geen tracking.
   Een alarmmail moet leesbaar zijn in een client die alles blokkeert, en
   hij hoort niemands openingsgedrag te meten.
   ============================================================ */

import type { Meldernst } from "./meldernst.ts";

export type Berichtmelding = {
  readonly id: number;
  readonly sleutel: string;
  readonly groep: string;
  readonly niveau: string;
  readonly meting: string;
  readonly advies: string | null;
  readonly eersteDetectie: string;
  readonly laatsteMeting: string;
  readonly kerenGezien: number;
  readonly gesloten: string | null;
};

export type Berichtgegevens = {
  readonly soort: string;
  readonly ernst: Meldernst | null;
  readonly titel: string;
  readonly bundel: string;
  readonly meldingen: readonly Berichtmelding[];
  /** Over hoeveel ONDERSCHEIDEN bundels gaat dit bericht? */
  readonly bundels?: number;
  /** De namen van die bundels, leesbaar; voor de regel 'Betrokken'. */
  readonly bundelnamen?: readonly string[];
  readonly meldingId: string;
  readonly monitorUrl: string | null;
  readonly nu: string;
};

export type MailOpmaak = {
  readonly onderwerp: string;
  readonly html: string;
  readonly tekst: string;
};

export function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* De huisstijl van Vibe Energy, in de enige vorm die een mailclient
   betrouwbaar aanhoudt: inline stijlen en een tabel. Geen klasse-CSS —
   Outlook en Gmail knippen een <style>-blok weg of negeren het. */
const DONKER = "#0b1b2b";
const GRIJS = "#5a6b7a";
const RAND = "#dfe5ea";

/** De kleur per ernst. Rood is voor kritiek, niet voor alles. */
const KLEUR: Readonly<Record<string, string>> = {
  CRITICAL: "#b3261e",
  FOUT: "#c25e00",
  WARNING: "#8a6d00",
  HERSTEL: "#1a7f37",
};

const LABEL: Readonly<Record<string, string>> = {
  CRITICAL: "KRITIEK",
  FOUT: "FOUT",
  WARNING: "WAARSCHUWING",
  HERSTEL: "HERSTELD",
  BEGINSAMENVATTING: "OVERZICHT",
  TEST: "TEST",
};

/** Het ernstwoord voor het onderwerp en de kop. */
function ernstwoord(g: Berichtgegevens): string {
  if (g.soort === "HERSTEL") return "HERSTEL";
  if (g.soort === "BEGINSAMENVATTING") return g.ernst ?? "WARNING";
  if (g.soort === "TEST") return "TEST";
  return g.ernst ?? "WARNING";
}

export function bouwMailBericht(g: Berichtgegevens): MailOpmaak {
  const woord = ernstwoord(g);
  const kleur = KLEUR[woord] ?? GRIJS;
  const label = LABEL[woord] ?? woord;

  /* [Vibe Energy Intelligence] [ERNST] Korte omschrijving — de vorm die
     de opdracht voorschrijft. */
  const onderwerp = `[Vibe Energy Intelligence] [${woord}] ${g.titel}`;

  const betrokken = g.bundel.startsWith("bron:")
    ? `bron ${g.bundel.slice("bron:".length)}`
    : g.bundelnamen && g.bundelnamen.length > 1
      ? g.bundelnamen.join(", ")
      : [...new Set(g.meldingen.map((m) => m.groep))].join(", ") || "platform";

  const eerste = g.meldingen
    .map((m) => m.eersteDetectie)
    .sort()
    .at(0) ?? "onbekend";
  const laatste = g.meldingen
    .map((m) => m.laatsteMeting)
    .sort()
    .at(-1) ?? "onbekend";

  /* DE STATUSREGEL MOET KLOPPEN OVER HET AANTAL BUNDELS.
     Er stond onvoorwaardelijk "N signalen in deze bundel", ook in een
     beginsamenvatting die over MEERDERE bundels gaat. Gemeten op de
     productiestand van 14 oktober 2026: vier signalen uit TWEE bundels
     (rendo-nieuws en tenderned-laatste-publicatie) lazen als "4 signalen
     in deze bundel", en dat suggereert een storing waar er twee zijn. */
  const bundels = g.bundels ?? 1;
  const status =
    g.soort === "HERSTEL"
      ? "opgelost — alle signalen in deze bundel zijn weer OK gemeten"
      : bundels > 1
        ? `loopt nog; ${g.meldingen.length} signalen in ${bundels} afzonderlijke storingen`
        : g.meldingen.length === 1
          ? `loopt nog; ${g.meldingen[0]!.kerenGezien}× gezien sinds de eerste detectie`
          : `loopt nog; ${g.meldingen.length} signalen in deze ene storing`;

  /* Alleen een oorzaak als er bewijs voor is: het advies uit de meting.

     EN BIJ EEN HERSTEL GEEN ADVIES. Gevonden door toets 25: een
     herstelmail droeg nog het reparatieadvies van de storing die net is
     opgelost ('npm run bronaudit voor de reden per bron'). Dat is een
     instructie om iets te repareren dat niet meer stuk is, en het is de
     snelste manier om een herstelbericht te laten lezen als een nieuw
     alarm. De soort gaat daarom VOOR het advies. */
  const adviezen = [...new Set(g.meldingen.map((m) => m.advies).filter((a): a is string => !!a))];
  const actie =
    g.soort === "HERSTEL"
      ? "geen actie nodig; deze melding sluit de keten van een eerder gemelde storing."
      : adviezen.length > 0
        ? adviezen.join(" ")
        : "geen geautomatiseerd advies beschikbaar. Zie de monitoring voor de volledige meting.";

  /* ---------------------------------------------------------------- HTML */
  const rij = (naam: string, waarde: string) =>
    `<tr>
       <td style="padding:6px 14px 6px 0;color:${GRIJS};font-size:13px;white-space:nowrap;vertical-align:top">${escape(naam)}</td>
       <td style="padding:6px 0;color:${DONKER};font-size:13px;vertical-align:top">${escape(waarde)}</td>
     </tr>`;

  const signaalblok = g.meldingen
    .map(
      (m) => `
      <div style="border-left:3px solid ${RAND};padding:0 0 0 12px;margin:0 0 14px 0">
        <div style="color:${DONKER};font-size:13px;font-weight:600">${escape(m.sleutel)}</div>
        <div style="color:${GRIJS};font-size:12px;margin:2px 0 0 0">niveau ${escape(m.niveau)} · ${escape(String(m.kerenGezien))}× gezien · melding ${escape(String(m.id))}</div>
        <div style="color:${DONKER};font-size:12px;margin:6px 0 0 0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-word">${escape(m.meting)}</div>
      </div>`,
    )
    .join("");

  const monitor = g.monitorUrl
    ? `<p style="margin:22px 0 0 0;font-size:13px">
         <a href="${escape(g.monitorUrl)}" style="color:#0b63ce">Monitoring openen</a>
       </p>`
    : "";

  const html = `<div style="background:#f5f7f9;padding:24px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid ${RAND};border-radius:10px;width:100%">
    <tr><td style="padding:0">
      <div style="background:${kleur};color:#ffffff;padding:14px 22px;border-radius:9px 9px 0 0;font-size:12px;letter-spacing:.09em;font-weight:700">${escape(label)}</div>
    </td></tr>
    <tr><td style="padding:22px">
      <div style="color:${GRIJS};font-size:12px;margin:0 0 4px 0">Vibe Energy Intelligence</div>
      <h1 style="margin:0 0 18px 0;color:${DONKER};font-size:19px;line-height:1.3;font-weight:650">${escape(g.titel)}</h1>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">
        ${rij("Ernst", label)}
        ${rij("Betrokken", betrokken)}
        ${rij("Eerst gezien", eerste)}
        ${rij("Laatst gemeten", laatste)}
        ${rij("Status", status)}
        ${rij("Aanbevolen actie", actie)}
        ${rij("Melding-ID", g.meldingId)}
      </table>
      <h2 style="margin:24px 0 12px 0;color:${DONKER};font-size:14px;font-weight:650">Signalen</h2>
      ${signaalblok}
      ${monitor}
      <p style="margin:22px 0 0 0;color:${GRIJS};font-size:11px;line-height:1.5;border-top:1px solid ${RAND};padding-top:14px">
        Verstuurd op ${escape(g.nu)} door Vibe Energy Intelligence. Dit is een geautomatiseerde
        operationele melding; er wordt geen inhoud gepubliceerd zonder menselijke goedkeuring.
      </p>
    </td></tr>
  </table>
</div>`;

  /* ------------------------------------------------------------- TEKST */
  const tekst = [
    `[${label}] ${g.titel}`,
    "",
    `Ernst            ${label}`,
    `Betrokken        ${betrokken}`,
    `Eerst gezien     ${eerste}`,
    `Laatst gemeten   ${laatste}`,
    `Status           ${status}`,
    `Aanbevolen actie ${actie}`,
    `Melding-ID       ${g.meldingId}`,
    "",
    "SIGNALEN",
    ...g.meldingen.flatMap((m) => [
      `  ${m.sleutel}  (niveau ${m.niveau}, ${m.kerenGezien}x gezien, melding ${m.id})`,
      `    ${m.meting}`,
    ]),
    ...(g.monitorUrl ? ["", `Monitoring: ${g.monitorUrl}`] : []),
    "",
    `Verstuurd op ${g.nu} door Vibe Energy Intelligence.`,
    "Geautomatiseerde operationele melding; er wordt geen inhoud gepubliceerd zonder",
    "menselijke goedkeuring.",
  ].join("\n");

  return { onderwerp, html, tekst };
}
