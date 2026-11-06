/* ============================================================
   BRONNEN — VEILIGE TEKSTEXTRACTIE UIT EEN PDF
   ------------------------------------------------------------
   HET GEMETEN GAT, 5 november 2026.

   De ACM publiceert haar energiebesluiten als PDF. Gemeten op het
   geschilbesluit Jumbo – Liander over het congestierapport:

     de besluitPAGINA   4.834 tekens zichtbare tekst — een samenvatting
     het besluitSTUK    https://www.acm.nl/system/files/documents/
                        geschilbesluit-jumbo-liander-over-
                        congestierapport.pdf
                        182.008 bytes, content-type application/pdf

   De collector kent acht bronsoorten (rss, atom, json_api, odata, sru,
   sitemap, html_lijst, dataset, tijdreeks, wfs) en geen van die acht
   leest een PDF. Het dragende document van een ACM-besluit was dus
   principieel onbereikbaar, en wat de claimketen van zo'n besluit zag
   was de samenvatting eromheen.

   ------------------------------------------------------------
   WAAROM GEEN BIBLIOTHEEK

   De opdracht eist een "veilige parser zonder externe
   code-uitvoering". Deze module is daarom zelfstandig en gebruikt
   alleen `node:zlib`. Drie redenen, in deze orde:

   1 GEEN CODE-UITVOERING BIJ CONSTRUCTIE. Een PDF kan JavaScript,
     ingebedde bestanden en open-actions bevatten. Deze parser
     INTERPRETEERT niets: hij zoekt objecten, inflate't streams en leest
     tekstoperatoren. Er is geen tak die iets uitvoert, dus er is ook
     geen tak die dat per ongeluk kan.

   2 DE BOMBESCHERMING MOET VAN MIJ ZIJN. Een decompressieplafond is
     alleen een plafond als de lezer hem zelf handhaaft; een
     bibliotheek die alles in geheugen inflate't en daarna een limiet
     toepast, is al over.

   3 DE REPO IS PUBLIEK EN HEEFT EEN KWETSBAARHEDENPOORT. `express` en
     `pg` zijn de enige twee productieafhankelijkheden. Een PDF-parser
     erbij is een leveringsketen die niemand hier kan overzien, voor een
     taak die in 400 regels past.

   ------------------------------------------------------------
   WAT DEZE MODULE NIET IS

   GEEN CRAWLER. Hij haalt niets zelf op en kent geen enkele URL. Hij
   krijgt bytes en een herkomst, en geeft tekst of een weigering. Welke
   documenten mogen worden opgehaald, staat in het toestemmingsbeleid en
   in de bronregistratie — niet hier. "Geen algemene onbegrensde
   PDF-crawler bouwen" is daarmee geen belofte maar een eigenschap: deze
   module KAN niet crawlen.

   GEEN OCR. Een PDF zonder tekstlaag levert een lege uitkomst met de
   reden `geen_tekstlaag`. Dat is een meting en geen fout: hij zegt dat
   het document een scan is. OCR zou een beeldinterpretatie zijn, en
   daarmee een bewering over wat er staat in plaats van een weergave
   ervan.

   ------------------------------------------------------------
   DE BRONINHOUD IS NOOIT EEN INSTRUCTIE

   Elke uitkomst gaat door `ontwapen()`. Een PDF uit een vreemde hand
   mag geen tekens dragen die in een latere laag als stuurcode of als
   opdracht kunnen landen. Zie injectie.ts voor de bestaande
   verdenkingslaag; deze module voegt er de PDF-specifieke stap aan toe
   en markeert het resultaat expliciet als ONBETROUWBARE INHOUD.
   ============================================================ */

import { inflateSync, inflateRawSync, unzipSync } from "node:zlib";
import { maakLogger } from "../kern/log.ts";

const log = maakLogger("pdf");

/** Verhoog dit bij elke wijziging die de uitkomst kan veranderen. */
export const PDF_VERSIE = "pdf-tekst-v1";

/* ------------------------------------------------------------------
   DE GRENZEN. Alle vijf expliciet, meetbaar en in één blok.

   Ze staan hier en niet in de aanroeper, zodat er geen aanroeper is die
   ze kan vergeten. Wie ze wil verruimen, verruimt ze zichtbaar.
   ------------------------------------------------------------------ */
export const GRENZEN = {
  /** Een ACM-besluit is 0,1–3 MB. 25 MB is ruim en nog steeds een grens. */
  maxBytes: 25 * 1024 * 1024,
  /** Een besluit van meer dan 300 pagina's is geen besluit maar een bundel. */
  maxPaginas: 300,
  /** Per stream: na dit aantal bytes stoppen we met inflaten. */
  maxStreamBytesUit: 8 * 1024 * 1024,
  /**
   * De verhouding tussen uit en in per stream.
   *
   * DIT IS DE BOMBESCHERMING. Een PDF-bom is een kleine stream die naar
   * gigabytes uitpakt; tekst comprimeert in de praktijk 3 tot 10 keer.
   * 200 is daar ruim boven en ver onder wat een bom nodig heeft.
   */
  maxCompressieFactor: 200,
  /** De hele tekstuitkomst. Boven dit wordt afgekapt, met vermelding. */
  maxTekstTekens: 2 * 1024 * 1024,
  /** Een object of stream dieper dan dit negeren we. */
  maxObjecten: 50_000,
} as const;

/** De bytes waarmee elk PDF-bestand begint. */
const PDF_SIGNATUUR = Buffer.from("%PDF-");

export type PdfWeigering =
  | "geen_bytes"
  | "verkeerd_mime"
  | "verkeerde_signatuur"
  | "te_groot"
  | "te_veel_paginas"
  | "versleuteld"
  | "corrupt"
  | "geen_tekstlaag"
  | "decompressie_verdacht";

export type PdfPagina = {
  /** 1-gebaseerd, zoals een mens een pagina aanwijst. */
  readonly pagina: number;
  readonly tekst: string;
};

export type PdfUitkomst =
  | {
      readonly ok: true;
      /** De tekst van alle pagina's, met paginascheiding. */
      readonly tekst: string;
      readonly paginas: readonly PdfPagina[];
      readonly aantalPaginas: number;
      /** Is de tekst afgekapt op maxTekstTekens? */
      readonly afgekapt: boolean;
      /** Welke tekens zijn onschadelijk gemaakt, en hoeveel. */
      readonly ontwapend: number;
      readonly versie: string;
    }
  | {
      readonly ok: false;
      readonly weigering: PdfWeigering;
      readonly reden: string;
      readonly versie: string;
    };

function weiger(weigering: PdfWeigering, reden: string): PdfUitkomst {
  return { ok: false, weigering, reden, versie: PDF_VERSIE };
}

/* ------------------------------------------------------------------
   1 · MIME-TYPE EN BESTANDSSIGNATUUR

   BEIDE, en niet een van de twee. Een content-type is wat de server
   BEWEERT; de signatuur is wat het bestand IS. Een server die
   'application/pdf' zegt over een HTML-foutpagina is geen zeldzaamheid
   maar het normale gedrag van een misconfiguratie, en dan zou een
   parser op een inlogpagina gaan rekenen.
   ------------------------------------------------------------------ */
const TOEGESTANE_MIMES: readonly string[] = [
  "application/pdf",
  "application/x-pdf",
  "application/octet-stream",
];

export function mimeIsPdf(contentType: string | null): boolean {
  if (!contentType) return false;
  const kaal = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  return TOEGESTANE_MIMES.includes(kaal);
}

export function heeftPdfSignatuur(bytes: Buffer): boolean {
  /* DE SIGNATUUR HOEFT NIET OP BYTE 0 TE STAAN. De PDF-specificatie
     staat voorloopbytes toe en sommige servers voegen een BOM toe.
     Zoeken binnen de eerste 1024 bytes is wat elke lezer doet; verder
     zoeken zou een HTML-pagina met een '%PDF-' in de tekst als PDF
     laten gelden. */
  return bytes.subarray(0, 1024).includes(PDF_SIGNATUUR);
}

/* ------------------------------------------------------------------
   2 · ONTWAPENEN — onbetrouwbare inhoud blijft onbetrouwbaar

   Wat hier weggaat:
     * alle C0-stuurcodes behalve tab, newline en carriage return;
     * de C1-reeks;
     * onzichtbare richtings- en koppeltekens (U+200B–U+200F,
       U+202A–U+202E, U+2060–U+2064, U+FEFF);
     * de vervangingsmarkering U+FFFD blijft staan — die MOET zichtbaar
       zijn, want hij zegt dat er iets niet te lezen was.

   WAAROM DIT HIER STAAT EN NIET ALLEEN IN injectie.ts: die laag
   VERDENKT een tekst en markeert hem. Deze laag maakt de bytes
   onschadelijk vóórdat ze ergens worden opgeslagen. Een onzichtbare
   stuurcode die de database in gaat, komt er bij elke latere lezer weer
   uit — en in dit platform is al eens een null-byte op een
   onverwachte plek opgedoken.
   ------------------------------------------------------------------ */
/* DE PATRONEN STAAN ALS ESCAPES EN NOOIT ALS LETTERLIJK TEKEN.
   Een bestand dat de stuurcodes die het moet weren zelf in zijn bron
   draagt, is onleesbaar in een diff, overleeft geen enkele kopieeractie
   en valt op in de geheimenpoort. Zie het bestaande geval in deze repo
   waarin een onzichtbare stuurcode in opgeslagen tekst opdook. */
const ONGEWENST = new RegExp(
  [
    /* C0 behalve \t (09), \n (0A) en \r (0D). */
    "[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]",
    /* DEL en de C1-reeks. */
    "[\\u007F-\\u009F]",
    /* Onzichtbare breedte-, richtings- en koppeltekens. */
    "[\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2064\\uFEFF]",
  ].join("|"),
  "gu",
);

export function ontwapen(tekst: string): { tekst: string; verwijderd: number } {
  let verwijderd = 0;
  const schoon = tekst.replace(ONGEWENST, () => {
    verwijderd += 1;
    return "";
  });
  return { tekst: schoon, verwijderd };
}

/* ------------------------------------------------------------------
   3 · DE STREAMS INFLATEN, MET EEN PLAFOND

   FlateDecode is het enige filter dat deze module zelf kan. Alle andere
   filters (DCTDecode, JPXDecode, CCITTFaxDecode) zijn BEELD, en beeld
   leest deze module niet — dat zou OCR zijn.

   DE DRIE VARIANTEN. Een PDF-stream is zlib met header, maar
   generatoren leveren ook raw deflate en soms gzip. Alle drie proberen
   is goedkoop; falen op alle drie betekent dat deze stream niet te
   lezen is, en dat is een meting.
   ------------------------------------------------------------------ */
function inflateBegrensd(
  rauw: Buffer,
): { ok: true; uit: Buffer } | { ok: false; reden: PdfWeigering } {
  const plafond = Math.min(
    GRENZEN.maxStreamBytesUit,
    Math.max(4096, rauw.length * GRENZEN.maxCompressieFactor),
  );
  for (const poging of [inflateSync, inflateRawSync, unzipSync]) {
    try {
      /* `maxOutputLength` is de grendel die zlib ZELF handhaaft: hij
         stopt tijdens het inflaten in plaats van erna. Een bom wordt
         dus nooit in geheugen gematerialiseerd. */
      const uit = poging(rauw, { maxOutputLength: plafond });
      return { ok: true, uit };
    } catch (e) {
      /* EEN OVERSCHRIJDING VAN maxOutputLength IS GEEN GEWONE LEESFOUT:
         dat is het bomsignaal, en dat hoort apart gemeld.

         DE CODE EN NIET DE BOODSCHAP. Mijn eerste versie toetste op de
         TEKST van de fout, en de eigen bomtoets zakte daarop: zlib
         meldt "Cannot create a Buffer larger than 8388608 bytes" en
         daar staat geen van mijn zoekwoorden in. De bom kwam daardoor
         uit op `geen_tekstlaag` — een onschuldige meting voor een
         verdacht bestand, en dus precies de verkeerde kant op.

         `code` is het stabiele contract van Node; een foutboodschap is
         dat niet. */
      const code = (e as { code?: unknown }).code;
      const bericht = e instanceof Error ? e.message : "";
      if (
        code === "ERR_BUFFER_TOO_LARGE" ||
        /maxOutputLength|buffer (?:size|larger)/i.test(bericht)
      ) {
        return { ok: false, reden: "decompressie_verdacht" };
      }
    }
  }
  return { ok: false, reden: "corrupt" };
}

/* ------------------------------------------------------------------
   4 · DE TEKSTOPERATOREN

   Binnen een contentstream staat tekst in vier vormen:

     (letterlijk) Tj        één string
     [(a) -20 (b)] TJ       een array met kerningsgetallen ertussen
     (letterlijk) '         string met regelovergang ervoor
     (a) (b) "              string met woord- en tekenafstand

   <hex> Tj bestaat ook. Die wordt gelezen als UTF-16BE wanneer de
   lengte even is en er een BOM staat, en anders byte-voor-byte; dat is
   de benadering die zonder de font-CMap mogelijk is. Zonder CMap is een
   hexstring principieel niet eenduidig te decoderen — daarom blijft
   U+FFFD staan waar het misgaat, in plaats van een gok.
   ------------------------------------------------------------------ */

/* ------------------------------------------------------------------
   DE FONTCODERING — waarom de ruwe bytes niet de tekst zijn

   GEMETEN OP HET ECHTE ACM-BESLUIT, 6 november 2026. De eerste lezing
   gaf 27.569 tekens uit 8 pagina's, en een deel daarvan zag er zo uit:

     ê«ïà¦æÀ
     ACM/UIT/1123013
     Muzenstraat 41

   Het kenmerk, het adres en 'Openbaar' kwamen goed door; de kopregels
   niet. De oorzaak is de SUBSET-FONT. Een PDF mag een font meesturen
   met zijn eigen glyph-nummering, en dan is byte 0xEA niet 'ê' maar
   glyph 234 van dát font. Wie de bytes als latin1 leest, krijgt
   letterlijk de verkeerde letters.

   De oplossing staat in de PDF zelf: een /ToUnicode-CMap bij het font,
   die per code zegt welk Unicode-teken het is. Die wordt hier gelezen
   en toegepast. Er wordt dus niets gegokt — de afbeelding komt uit het
   document.

   ZONDER CMap blijft de lezing latin1. Dat is de beste eenduidige
   benadering voor de standaardcoderingen (WinAnsi, MacRoman voor het
   latijnse bereik) en het is wat de leesbare helft hierboven opleverde.
   ------------------------------------------------------------------ */

type PdfFont = {
  /** code -> Unicode-tekst, uit /ToUnicode. Leeg als er geen CMap is. */
  readonly naarUnicode: Map<number, string>;
  /** Zijn de codes in de string één of twee bytes? */
  readonly codeBytes: 1 | 2;
};

const GEEN_FONT: PdfFont = { naarUnicode: new Map(), codeBytes: 1 };

/**
 * Leest een /ToUnicode-CMap.
 *
 * Twee vormen, beide uit de PDF-specificatie:
 *
 *   beginbfchar  <0041> <0041>            endbfchar
 *   beginbfrange <0041> <005A> <0041>     endbfrange
 *   beginbfrange <0041> <0043> [<0061> <0062> <0063>] endbfrange
 *
 * De doelwaarde is UTF-16BE en kan meer dan één teken zijn (een
 * ligatuur: <FB01> -> 'fi').
 */
export function leesToUnicode(cmap: string): PdfFont {
  const naarUnicode = new Map<number, string>();
  let codeBytes: 1 | 2 = 1;

  const hexNaarTekst = (hex: string): string => {
    const schoon = hex.replace(/[^0-9a-fA-F]/g, "");
    let uit = "";
    for (let i = 0; i + 3 < schoon.length + 1; i += 4) {
      const stuk = schoon.slice(i, i + 4);
      if (stuk.length < 4) break;
      uit += String.fromCharCode(Number.parseInt(stuk, 16));
    }
    return uit;
  };

  for (const blok of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const paar of (blok[1] ?? "").matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g)) {
      const bron = paar[1] ?? "";
      if (bron.length >= 4) codeBytes = 2;
      naarUnicode.set(Number.parseInt(bron, 16), hexNaarTekst(paar[2] ?? ""));
    }
  }

  for (const blok of cmap.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    const body = blok[1] ?? "";
    /* Vorm met een lijst: <lo> <hi> [<d> <d> ...] */
    for (const r of body.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*\[([^\]]*)\]/g)) {
      const lo = Number.parseInt(r[1] ?? "0", 16);
      if ((r[1] ?? "").length >= 4) codeBytes = 2;
      const doelen = [...(r[3] ?? "").matchAll(/<([0-9a-fA-F]*)>/g)].map((x) => x[1] ?? "");
      for (const [i, d] of doelen.entries()) naarUnicode.set(lo + i, hexNaarTekst(d));
    }
    /* Vorm met één begindoel: <lo> <hi> <d> */
    for (const r of body.matchAll(
      /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g,
    )) {
      const lo = Number.parseInt(r[1] ?? "0", 16);
      const hi = Number.parseInt(r[2] ?? "0", 16);
      if ((r[1] ?? "").length >= 4) codeBytes = 2;
      const basis = hexNaarTekst(r[3] ?? "");
      if (basis.length === 0) continue;
      /* EEN BEREIK IS BEGRENSD. Een corrupte of kwaadwillende CMap met
         <0000> <FFFF> zou hier 65.536 rijen zetten; per font is dat nog
         te overzien, maar met honderd fonts niet. 65.536 is precies de
         codespace van twee bytes, dus dit plafond snijdt geen geldig
         bereik af — het weert alleen een onzinnig groot bereik. */
      const eind = Math.min(hi, lo + 65_535);
      const laatste = basis.charCodeAt(basis.length - 1);
      for (let code = lo; code <= eind; code += 1) {
        const staart = String.fromCharCode(laatste + (code - lo));
        naarUnicode.set(code, basis.slice(0, -1) + staart);
      }
    }
  }

  return { naarUnicode, codeBytes };
}

/** Zet ruwe stringcodes om in tekst, via de CMap van het actieve font. */
function decodeer(codes: readonly number[], font: PdfFont): string {
  if (font.naarUnicode.size === 0) {
    return codes.map((c) => String.fromCharCode(c)).join("");
  }
  if (font.codeBytes === 2) {
    let uit = "";
    for (let i = 0; i < codes.length; i += 2) {
      const code = ((codes[i] ?? 0) << 8) | (codes[i + 1] ?? 0);
      /* U+FFFD BLIJFT STAAN waar de CMap niets zegt. Een onbekende code
         stil weglaten zou een gat in de tekst maken dat niemand ziet;
         een vervangingsteken zegt dat er iets niet te lezen was. */
      uit += font.naarUnicode.get(code) ?? "\uFFFD";
    }
    return uit;
  }
  return codes.map((c) => font.naarUnicode.get(c) ?? String.fromCharCode(c)).join("");
}

/* ------------------------------------------------------------------
   DE STRINGLEZERS GEVEN CODES, GEEN TEKST

   Dat onderscheid is de hele reparatie. Een PDF-string is een reeks
   CODES; wat die codes betekenen staat in het font. Wie ze meteen als
   tekst leest, heeft de fontkeuze al gemaakt — en voor een subset-font
   is die keuze verkeerd. Vandaar: lezen levert codes, decodeer() maakt
   er tekst van met de CMap van het font dat op dat moment actief is.
   ------------------------------------------------------------------ */

/** Leest een PDF-literal string: haakjes, escapes, octale codes. */
function leesLiteral(s: string, start: number): { codes: number[]; eind: number } {
  let diepte = 1;
  let i = start;
  const codes: number[] = [];
  const duw = (t: string) => {
    for (const ch of t) codes.push(ch.charCodeAt(0));
  };
  while (i < s.length) {
    const ch = s[i]!;
    if (ch === "\\") {
      const volg = s[i + 1] ?? "";
      const enkel: Record<string, string> = {
        n: "\n",
        r: "\r",
        t: "\t",
        b: "\b",
        f: "\f",
        "(": "(",
        ")": ")",
        "\\": "\\",
      };
      if (enkel[volg] !== undefined) {
        duw(enkel[volg]);
        i += 2;
        continue;
      }
      /* Een backslash voor een regeleinde is een voortzetting: er komt
         geen teken bij. */
      if (volg === "\n" || volg === "\r") {
        i += volg === "\r" && s[i + 2] === "\n" ? 3 : 2;
        continue;
      }
      const oct = /^[0-7]{1,3}/.exec(s.slice(i + 1, i + 4));
      if (oct) {
        codes.push(Number.parseInt(oct[0], 8));
        i += 1 + oct[0].length;
        continue;
      }
      duw(volg);
      i += 2;
      continue;
    }
    if (ch === "(") {
      diepte += 1;
      duw(ch);
      i += 1;
      continue;
    }
    if (ch === ")") {
      diepte -= 1;
      if (diepte === 0) return { codes, eind: i + 1 };
      duw(ch);
      i += 1;
      continue;
    }
    duw(ch);
    i += 1;
  }
  /* Een onafgesloten string: geef terug wat er staat in plaats van
     niets. Een corrupte staart mag de voorafgaande pagina's niet
     wissen. */
  return { codes, eind: s.length };
}

/** Leest een PDF-hex string: `<48656C6C6F>`. */
function leesHex(s: string, start: number): { codes: number[]; eind: number } {
  const eind = s.indexOf(">", start);
  const body = (eind < 0 ? s.slice(start) : s.slice(start, eind)).replace(/[^0-9a-fA-F]/g, "");
  /* Een oneven aantal hexcijfers wordt volgens de specificatie met een
     nul aangevuld. */
  const even = body.length % 2 === 0 ? body : `${body}0`;
  const codes: number[] = [];
  for (let i = 0; i + 1 < even.length; i += 2) {
    codes.push(Number.parseInt(even.slice(i, i + 2), 16));
  }
  return { codes, eind: eind < 0 ? s.length : eind + 1 };
}

/**
 * Haalt de tekst uit één contentstream.
 *
 * GEEN LAYOUT. Woordafstanden en regelposities staan in Td/TD/Tm en in
 * de kerningsgetallen van TJ. Deze lezer gebruikt ze om te beslissen
 * WAAR een witruimte of een regeleinde hoort, en niet om kolommen te
 * reconstrueren. Een besluit is doorlopend proza; een tabel wordt hier
 * dus een reeks regels, en dat is eerlijker dan een gegokte kolomindeling.
 *
 * `fonts` bindt de namen uit `/Fx Tf` aan hun CMap. Een lege map
 * betekent: lees alles als latin1. Dat is de oude lezing, en nog steeds
 * de juiste voor de standaardcoderingen.
 */
/**
 * Een regeleinde of een spatie, afhankelijk van de verticale sprong.
 *
 * DE DREMPEL IS EEN HALVE EENHEID in gebruikersruimte. Een regelafstand
 * is in deze documenten 10 tot 14 eenheden, en woorden op dezelfde
 * regel staan op exact dezelfde y. Een halve eenheid ligt daar ruim
 * tussen en vangt de afrondingsruis van de generator.
 *
 * NaN betekent "nog geen regel gezet": dan is er niets om tegen te
 * vergelijken en komt er geen scheiding.
 */
function regelovergang(y: number, vorigeY: number): string {
  if (!Number.isFinite(vorigeY)) return "";
  return Math.abs(y - vorigeY) > 0.5 ? "\n" : " ";
}

export function leesContentstream(
  inhoud: string,
  fonts: ReadonlyMap<string, PdfFont> = new Map(),
): string {
  const uit: string[] = [];
  let i = 0;
  let font: PdfFont = GEEN_FONT;
  /* ALLEEN TEKST BINNEN BT ... ET.
     ------------------------------------------------------------------
     Een contentstream bevat veel meer dan tekst: paden, clipping,
     kleuren, en de operanden van markeringsoperatoren. Alleen tussen
     BT en ET staat een tekstobject. Zonder deze grens komt elke string
     die ergens als operand voorkomt in de uitkomst terecht. */
  let inTekst = false;
  /** De operanden die vóór de huidige operator zijn gelezen. */
  const getallen: number[] = [];
  /** De verticale positie van de laatst gezette regel. */
  let vorigeY = Number.NaN;
  /** Is de tekstmatrix net op de eenheidsmatrix gezet (door BT)? */
  let verseMatrix = true;

  while (i < inhoud.length) {
    const ch = inhoud[i]!;

    /* EEN WOORDENBOEK IS GEEN TEKST — EN DIT WAS DE HELE RUIS.
       ----------------------------------------------------------------
       GEMETEN OP HET ECHTE ACM-BESLUIT, 6 november 2026. De eerste
       lezing gaf tussen de leesbare regels steeds dit:

         ê«ïà¦æÀ
         ¦æÀ
         Ínl

       Niet een fontprobleem — alle vier fonts in dat document zijn
       WinAnsiEncoding zonder /ToUnicode, dus latin1 is de juiste
       lezing. De oorzaak was dit, zeventien keer in één pagina:

         /Span <</Lang<6E6C>>>BDC

       Mijn hexstringtak keek of het volgende teken géén '<' was. Bij
       de BUITENSTE '<' van '<<' klopte dat en werd hij overgeslagen —
       maar bij de BINNENSTE '<' is het volgende teken '/', dus die
       gold als het begin van een hexstring. De body werd toen gelezen
       tot de eerste '>': '/Lang<6E6C'. Daar bleef na het weghalen van
       niet-hextekens 'a6E6C' over — de 'a' komt uit het woord 'Lang' —
       wat na opvullen de bytes A6 E6 C0 geeft: '¦æÀ'.

       Zo werd een TAALAANDUIDING in een markeringswoordenboek tot
       onleesbare tekst in een energiebesluit. En erger: als die bytes
       toevallig cijfers hadden gevormd, was er een GETAL uit gekomen
       dat in geen enkele bron staat.

       DE JUISTE REGEL: '<<' opent een woordenboek en dat wordt in zijn
       geheel overgeslagen, met nesting meegerekend. Een hexstring is
       een '<' die NIET door '<' wordt gevolgd EN niet binnen een
       woordenboek staat. */
    if (ch === "<" && inhoud[i + 1] === "<") {
      let diepte = 0;
      let j = i;
      while (j < inhoud.length) {
        if (inhoud[j] === "<" && inhoud[j + 1] === "<") {
          diepte += 1;
          j += 2;
          continue;
        }
        if (inhoud[j] === ">" && inhoud[j + 1] === ">") {
          diepte -= 1;
          j += 2;
          if (diepte === 0) break;
          continue;
        }
        j += 1;
      }
      i = j > i ? j : i + 2;
      continue;
    }

    /* HET ACTIEVE FONT. '/F3 11 Tf' zet font F3. Dit moet VOOR de
       stringtakken staan: een string wordt gedecodeerd met het font dat
       op dat moment geldt, en de operator staat ervoor in de stream. */
    if (ch === "/") {
      const m = /^\/([^\s/<>[\]()]+)\s+[\d.]+\s+Tf/.exec(inhoud.slice(i));
      if (m) {
        font = fonts.get(m[1]!) ?? GEEN_FONT;
        i += m[0].length;
        continue;
      }
    }

    if (ch === "B" && inhoud.startsWith("BT", i)) {
      inTekst = true;
      /* DE REGELPOSITIE WORDT HIER NIET TERUGGEZET, en dat is een
         correctie op mijn eerste opzet.

         GEMETEN OP HET ACM-BESLUIT: deze generator zet ELK WOORD in
         zijn eigen tekstobject:

           BT /F0 9.48 Tf 292.418 37.445 Td ( )Tj ET
           BT /F0 9.48 Tf 459.446 37.445 Td [(ACM)-2.4(/UIT)]TJ ET

         Twee woorden op dezelfde regel — gelijke ty — in twee blokken.
         Met een reset naar 0 bij elke BT werd elke ty groter dan een
         halve eenheid, dus kwam er bij elk woord een regeleinde. Dat
         gaf "van 17 / april / 2025" en daarmee geen vindbare datum.

         WEL wordt vastgelegd dat de tekstmatrix vers is: binnen een
         nieuw tekstobject is de matrix de eenheidsmatrix, dus de ty van
         de EERSTE Td is een absolute positie en niet een verschuiving.
         Dat onderscheid is het verschil tussen vergelijken en optellen. */
      getallen.length = 0;
      verseMatrix = true;
      i += 2;
      continue;
    }

    if (ch === "(") {
      const r = leesLiteral(inhoud, i + 1);
      if (inTekst) uit.push(decodeer(r.codes, font));
      i = r.eind;
      continue;
    }
    if (ch === "<") {
      const r = leesHex(inhoud, i + 1);
      if (inTekst) uit.push(decodeer(r.codes, font));
      i = r.eind;
      continue;
    }
    /* TJ-arrays: de getallen tussen de strings zijn kerning. Een grote
       negatieve waarde is een woordafstand; de drempel van -100 is de
       gangbare vuistregel in duizendsten van de tekstgrootte. */
    if (ch === "[") {
      const sluit = inhoud.indexOf("]", i);
      const body = sluit < 0 ? inhoud.slice(i + 1) : inhoud.slice(i + 1, sluit);
      let j = 0;
      while (j < body.length) {
        const c = body[j]!;
        if (c === "(") {
          const r = leesLiteral(body, j + 1);
          if (inTekst) uit.push(decodeer(r.codes, font));
          j = r.eind;
          continue;
        }
        if (c === "<") {
          const r = leesHex(body, j + 1);
          if (inTekst) uit.push(decodeer(r.codes, font));
          j = r.eind;
          continue;
        }
        const num = /^-?\d+(?:\.\d+)?/.exec(body.slice(j));
        if (num) {
          if (inTekst && Number.parseFloat(num[0]) <= -100) uit.push(" ");
          j += num[0].length;
          continue;
        }
        j += 1;
      }
      i = sluit < 0 ? inhoud.length : sluit + 1;
      continue;
    }
    /* De operatoren die een regel afsluiten. */
    if (inhoud.startsWith("ET", i)) {
      /* ET SLUIT HET TEKSTOBJECT, NIET DE REGEL. Een regeleinde hier
         zou bij deze generator — één tekstobject per woord — elk woord
         op zijn eigen regel zetten. Waar een regel eindigt, zeggen
         alleen de positioneringsoperatoren. */
      inTekst = false;
      i += 2;
      continue;
    }
    /* EEN NIEUWE POSITIE IS NIET ALTIJD EEN NIEUWE REGEL.
       ----------------------------------------------------------------
       GEMETEN OP HET ACM-BESLUIT. Met een regeleinde bij elke Td/Tm
       kwam de aanhef er zo uit:

         de inhoud van het door Liander N.V. herziene congestierapport van 17
         april
         2025, in het bijzonder ...

       Een datumextractie die op '17 april 2025' zoekt, vindt daar
       niets. En dat is geen cosmetisch verlies: het geschilbesluit
       draait om de datum van dat congestierapport.

       De oorzaak: een PDF-generator zet elk WOORD apart met zijn eigen
       Tm of Td, ook binnen dezelfde regel. Het verschil tussen 'nieuw
       woord' en 'nieuwe regel' zit in de VERTICALE positie, en die
       staat in de operanden — niet in de operator.

       Daarom: Td en TD met een verticale verschuiving onder een halve
       eenheid geven een SPATIE, en daarboven een regeleinde. Tm wordt
       absoluut vergeleken met de vorige regelpositie. T* is per
       definitie een nieuwe regel.

       DIT IS GEEN LAYOUTRECONSTRUCTIE. Er worden geen kolommen
       geraden en geen leesorde herschikt; er wordt alleen gelezen wat
       de stream zelf over de regelpositie zegt. */
    if (inhoud.startsWith("T*", i)) {
      if (inTekst) uit.push("\n");
      getallen.length = 0;
      i += 2;
      continue;
    }
    if (inhoud.startsWith("Td", i) || inhoud.startsWith("TD", i)) {
      const ty = getallen.at(-1) ?? 0;
      /* Binnen een vers tekstobject is ty absoluut; daarna telt hij
         door op de staande regelpositie. */
      const y = verseMatrix ? ty : vorigeY + ty;
      if (inTekst) uit.push(regelovergang(y, vorigeY));
      vorigeY = y;
      verseMatrix = false;
      getallen.length = 0;
      i += 2;
      continue;
    }
    if (inhoud.startsWith("Tm", i)) {
      /* Tm heeft zes operanden: a b c d e f. De laatste is de
         verticale positie, en hij is ALTIJD absoluut — Tm vervangt de
         tekstmatrix en verschuift hem niet. */
      const f = getallen.at(-1) ?? 0;
      if (inTekst) uit.push(regelovergang(f, vorigeY));
      vorigeY = f;
      verseMatrix = false;
      getallen.length = 0;
      i += 2;
      continue;
    }

    /* DE GETALLENSTAPEL. PostScript-operanden staan VOOR hun operator,
       dus de operator kan er alleen bij als ze onderweg zijn bewaard.
       Hij wordt na elke operator geleegd; zonder dat zou een oude
       operand bij een volgende operator worden gebruikt. */
    if (ch === "-" || ch === "." || (ch >= "0" && ch <= "9")) {
      const num = /^-?\d*\.?\d+/.exec(inhoud.slice(i));
      if (num) {
        getallen.push(Number.parseFloat(num[0]));
        if (getallen.length > 8) getallen.shift();
        i += num[0].length;
        continue;
      }
    }
    if (inhoud.startsWith("'", i) || inhoud.startsWith('"', i)) {
      uit.push("\n");
      i += 1;
      continue;
    }
    i += 1;
  }

  /* DE ORDE VAN DE OPSCHONING TELT. Eerst per regel trimmen, dan lege
     regels samenvouwen: een regel die alleen een spatie bevat — en die
     komt veel voor, want '( )Tj' is een geldige manier om ruimte te
     zetten — is na het trimmen leeg en wordt dan pas als leeg geteld.
     Andersom bleven er blokken van tien witregels staan. */
  return uit
    .join("")
    .replace(/[ \t]{2,}/g, " ")
    .split("\n")
    .map((r) => r.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ------------------------------------------------------------------
   5 · DE OBJECTEN EN DE PAGINA'S

   GEEN XREF-TABEL. Die is in een lineariseerde of incrementeel
   bijgewerkte PDF niet één tabel maar een keten, en een verkeerd
   gelezen keten geeft een onvolledig document zonder dat dat opvalt.
   Deze lezer scant daarom ALLE objecten op hun 'N G obj'-kop. Dat is
   robuuster bij een beschadigd bestand en het is precies wat we hier
   nodig hebben: we zoeken geen structuur maar tekst, in paginaorde.

   DE PAGINAORDE komt uit de /Type /Page-objecten in de orde waarin ze
   in het bestand staan. Voor een besluit van de ACM is dat de
   leesorde; dat is nagemeten op het geschilbesluit. Een PDF waarin de
   paginaboom een andere orde oplegt, zou hier een andere orde geven —
   daarom staat het paginanummer bij elke passage, zodat een mens het
   kan nazien.
   ------------------------------------------------------------------ */

type PdfObject = {
  readonly nummer: number;
  readonly woordenboek: string;
  readonly stream: Buffer | null;
};

function scanObjecten(bytes: Buffer): PdfObject[] {
  const uit: PdfObject[] = [];
  const latin = bytes.toString("latin1");
  const kop = /(\d+)\s+(\d+)\s+obj\b/g;
  let m: RegExpExecArray | null;
  while ((m = kop.exec(latin)) !== null) {
    if (uit.length >= GRENZEN.maxObjecten) break;
    const nummer = Number.parseInt(m[1]!, 10);
    const na = m.index + m[0].length;
    const eindObj = latin.indexOf("endobj", na);
    const grens = eindObj < 0 ? latin.length : eindObj;

    const streamStart = latin.indexOf("stream", na);
    let woordenboek: string;
    let stream: Buffer | null = null;

    if (streamStart >= 0 && streamStart < grens) {
      woordenboek = latin.slice(na, streamStart);
      /* Na 'stream' staat CRLF of LF. */
      let b = streamStart + "stream".length;
      if (latin[b] === "\r") b += 1;
      if (latin[b] === "\n") b += 1;
      const eindStream = latin.indexOf("endstream", b);
      const e = eindStream < 0 ? grens : eindStream;
      stream = bytes.subarray(b, e);
    } else {
      woordenboek = latin.slice(na, grens);
    }
    uit.push({ nummer, woordenboek, stream });
  }
  return uit;
}

/* ------------------------------------------------------------------
   DE FONTS VAN EEN PAGINA

   /Resources staat inline (`<< /Font << /F1 5 0 R >> >>`) of als
   verwijzing (`/Resources 7 0 R`). Beide vormen komen voor in één
   document; het ACM-besluit gebruikt de verwijzing.

   DE CMAP WORDT EEN KEER GELEZEN PER FONTOBJECT en daarna hergebruikt.
   Een besluit van acht pagina's met vier fonts zou anders 32 keer
   dezelfde CMap inflaten, en bij een bereik van 65.536 codes is dat
   geen detail.
   ------------------------------------------------------------------ */
function leesFontsVanPagina(
  pagina: PdfObject,
  perNummer: ReadonlyMap<number, PdfObject>,
  cache: Map<number, PdfFont>,
): Map<string, PdfFont> {
  const uit = new Map<string, PdfFont>();

  /* 1 · het resources-woordenboek, inline of via verwijzing. */
  let resources: string | null = null;
  const verwijzing = /\/Resources\s+(\d+)\s+\d+\s+R/.exec(pagina.woordenboek);
  if (verwijzing) {
    resources = perNummer.get(Number.parseInt(verwijzing[1]!, 10))?.woordenboek ?? null;
  } else {
    const inline = pagina.woordenboek.indexOf("/Resources");
    if (inline >= 0) resources = pagina.woordenboek.slice(inline);
  }
  if (!resources) return uit;

  /* 2 · het /Font-woordenboek daarbinnen. */
  const fontStart = resources.indexOf("/Font");
  if (fontStart < 0) return uit;
  const fontDeel = resources.slice(fontStart, fontStart + 4000);

  /* 3 · de naam-naar-object-paren. */
  for (const m of fontDeel.matchAll(/\/([A-Za-z0-9+._-]+)\s+(\d+)\s+\d+\s+R/g)) {
    const naam = m[1]!;
    if (naam === "Font") continue;
    const nummer = Number.parseInt(m[2]!, 10);

    const gecached = cache.get(nummer);
    if (gecached) {
      uit.set(naam, gecached);
      continue;
    }

    const fontObj = perNummer.get(nummer);
    if (!fontObj) continue;
    const tu = /\/ToUnicode\s+(\d+)\s+\d+\s+R/.exec(fontObj.woordenboek);
    if (!tu) {
      /* GEEN /ToUnicode IS EEN GELDIG ANTWOORD. Dan is het font een
         standaardcodering en is latin1 de juiste lezing. GEEN_FONT
         wordt gecached zodat we het niet opnieuw proberen. */
      cache.set(nummer, GEEN_FONT);
      continue;
    }
    const cmapObj = perNummer.get(Number.parseInt(tu[1]!, 10));
    if (!cmapObj?.stream) {
      cache.set(nummer, GEEN_FONT);
      continue;
    }
    let cmapTekst: string;
    if (/\/Filter\s*(?:\/FlateDecode|\[[^\]]*\/FlateDecode)/.test(cmapObj.woordenboek)) {
      const r = inflateBegrensd(cmapObj.stream);
      if (!r.ok) {
        cache.set(nummer, GEEN_FONT);
        continue;
      }
      cmapTekst = r.uit.toString("latin1");
    } else {
      cmapTekst = cmapObj.stream.toString("latin1");
    }
    const font = leesToUnicode(cmapTekst);
    cache.set(nummer, font);
    uit.set(naam, font);
  }

  return uit;
}

/** Alle objectnummers waar een /Contents-verwijzing naar wijst. */
function contentsVerwijzingen(woordenboek: string): number[] {
  const m = /\/Contents\s*(?:(\d+)\s+\d+\s+R|\[([^\]]*)\])/.exec(woordenboek);
  if (!m) return [];
  if (m[1]) return [Number.parseInt(m[1], 10)];
  const lijst = m[2] ?? "";
  return [...lijst.matchAll(/(\d+)\s+\d+\s+R/g)].map((x) => Number.parseInt(x[1]!, 10));
}

export type PdfHerkomst = {
  /** De oorspronkelijke document-URL. Wordt onveranderd bewaard. */
  readonly url: string;
  readonly contentType: string | null;
  /** De bronsleutel uit intel.bronnen, voor de herleidbaarheid. */
  readonly bronSleutel: string;
};

/**
 * Leest de tekst uit een PDF.
 *
 * DE ORDE VAN DE CONTROLES IS BEWUST: elke controle die een bestand kan
 * afwijzen, staat vóór het eerste duur werk. Een bestand van 400 MB
 * wordt niet eerst in objecten gescand om daarna op zijn grootte te
 * worden geweigerd.
 */
export function leesPdfTekst(bytes: Buffer, herkomst: PdfHerkomst): PdfUitkomst {
  /* 1 · ZIJN ER BYTES? */
  if (bytes.length === 0) return weiger("geen_bytes", "het antwoord bevatte geen bytes");

  /* 2 · HET MIME-TYPE dat de server beweert. */
  if (!mimeIsPdf(herkomst.contentType)) {
    return weiger(
      "verkeerd_mime",
      `content-type '${herkomst.contentType ?? "ontbreekt"}' is geen PDF-type. Toegestaan: ` +
        TOEGESTANE_MIMES.join(", "),
    );
  }

  /* 3 · DE SIGNATUUR die het bestand ZELF draagt. Beide, nooit één. */
  if (!heeftPdfSignatuur(bytes)) {
    return weiger(
      "verkeerde_signatuur",
      "de eerste 1024 bytes bevatten geen '%PDF-'. Het content-type beweert een PDF, maar " +
        "het bestand is er geen — vaak een HTML-foutpagina of een inlogmuur.",
    );
  }

  /* 4 · DE BESTANDSGROOTTE. */
  if (bytes.length > GRENZEN.maxBytes) {
    return weiger(
      "te_groot",
      `${bytes.length} bytes is meer dan de grens van ${GRENZEN.maxBytes} bytes`,
    );
  }

  /* 5 · VERSLEUTELD? Een /Encrypt-woordenboek betekent dat de streams
     niet leesbaar zijn zonder sleutel. Dat is geen fout van ons en geen
     reden om iets te forceren: het is een bronbeperking. */
  const kopLatin = bytes.subarray(0, Math.min(bytes.length, 4096)).toString("latin1");
  const staartLatin = bytes.subarray(Math.max(0, bytes.length - 4096)).toString("latin1");
  if (/\/Encrypt\b/.test(kopLatin) || /\/Encrypt\b/.test(staartLatin)) {
    return weiger(
      "versleuteld",
      "het document draagt een /Encrypt-woordenboek en is zonder sleutel niet te lezen. " +
        "Dit is een bronbeperking; er wordt geen poging gedaan de beveiliging te omzeilen.",
    );
  }

  /* 6 · DE OBJECTEN. */
  const objecten = scanObjecten(bytes);
  if (objecten.length === 0) {
    return weiger("corrupt", "er is geen enkel PDF-object gevonden; het bestand is onleesbaar");
  }
  const perNummer = new Map<number, PdfObject>();
  for (const o of objecten) if (!perNummer.has(o.nummer)) perNummer.set(o.nummer, o);

  /* 7 · DE PAGINA'S, en de paginalimiet VOOR het lezen. */
  const paginaObjecten = objecten.filter((o) => /\/Type\s*\/Page\b(?!s)/.test(o.woordenboek));
  if (paginaObjecten.length === 0) {
    return weiger(
      "corrupt",
      "het document bevat geen /Type /Page-objecten; de paginastructuur is onleesbaar",
    );
  }
  if (paginaObjecten.length > GRENZEN.maxPaginas) {
    return weiger(
      "te_veel_paginas",
      `${paginaObjecten.length} pagina's is meer dan de grens van ${GRENZEN.maxPaginas}`,
    );
  }

  /* 8 · DE TEKST PER PAGINA. */
  const paginas: PdfPagina[] = [];
  let totaal = 0;
  let afgekapt = false;
  let ontwapendTotaal = 0;
  let bomGezien = false;
  /* De CMap per fontobject, over alle pagina's heen hergebruikt. */
  const fontCache = new Map<number, PdfFont>();

  for (const [index, pagina] of paginaObjecten.entries()) {
    const fonts = leesFontsVanPagina(pagina, perNummer, fontCache);
    const delen: string[] = [];
    for (const ref of contentsVerwijzingen(pagina.woordenboek)) {
      const obj = perNummer.get(ref);
      if (!obj?.stream) continue;
      const platGecomprimeerd = /\/Filter\s*(?:\/FlateDecode|\[[^\]]*\/FlateDecode)/.test(
        obj.woordenboek,
      );
      let inhoud: string;
      if (platGecomprimeerd) {
        const r = inflateBegrensd(obj.stream);
        if (!r.ok) {
          if (r.reden === "decompressie_verdacht") bomGezien = true;
          continue;
        }
        inhoud = r.uit.toString("latin1");
      } else if (/\/Filter\b/.test(obj.woordenboek)) {
        /* Een ander filter is beeld of een codering die deze module niet
           leest. Overslaan, en dat is zichtbaar in de uitkomst: een
           pagina zonder tekst. GEEN OCR. */
        continue;
      } else {
        inhoud = obj.stream.toString("latin1");
      }
      delen.push(leesContentstream(inhoud, fonts));
    }

    const ruw = delen.join("\n").trim();
    if (!ruw) {
      paginas.push({ pagina: index + 1, tekst: "" });
      continue;
    }
    const schoon = ontwapen(ruw);
    ontwapendTotaal += schoon.verwijderd;
    let tekst = schoon.tekst;
    if (totaal + tekst.length > GRENZEN.maxTekstTekens) {
      tekst = tekst.slice(0, Math.max(0, GRENZEN.maxTekstTekens - totaal));
      afgekapt = true;
    }
    totaal += tekst.length;
    paginas.push({ pagina: index + 1, tekst });
    if (afgekapt) break;
  }

  /* 9 · EEN BOM IS EEN WEIGERING, OOK ALS ER TEKST UIT KWAM.
     Een bestand dat op één stream het decompressieplafond raakt, is niet
     "deels gelukt" maar verdacht. Fail-closed. */
  if (bomGezien) {
    return weiger(
      "decompressie_verdacht",
      `een stream pakte verder uit dan het plafond (factor ${GRENZEN.maxCompressieFactor} of ` +
        `${GRENZEN.maxStreamBytesUit} bytes). Het document wordt niet gelezen.`,
    );
  }

  /* 10 · GEEN TEKSTLAAG IS EEN MEETUITKOMST EN GEEN FOUT. */
  if (totaal === 0) {
    return weiger(
      "geen_tekstlaag",
      `het document heeft ${paginaObjecten.length} pagina('s) maar geen leesbare tekstlaag. ` +
        "Vermoedelijk een scan. Er wordt GEEN OCR gedaan: dat zou een interpretatie van beeld " +
        "zijn in plaats van een weergave van tekst.",
    );
  }

  /* 11 · DE PAGINAVERWIJZINGEN IN DE TEKST.
     Zonder deze markering is een passage niet terug te vinden in het
     origineel, en dan is 'herleidbaar naar de bron' een bewering. */
  const tekst = paginas
    .filter((p) => p.tekst.length > 0)
    .map((p) => `[pagina ${p.pagina}]\n${p.tekst}`)
    .join("\n\n");

  log.info("pdf gelezen", {
    bron: herkomst.bronSleutel,
    url: herkomst.url,
    bytes: bytes.length,
    paginas: paginaObjecten.length,
    tekens: totaal,
    afgekapt,
    ontwapend: ontwapendTotaal,
  });

  return {
    ok: true,
    tekst,
    paginas,
    aantalPaginas: paginaObjecten.length,
    afgekapt,
    ontwapend: ontwapendTotaal,
    versie: PDF_VERSIE,
  };
}

/**
 * De passage waarin een claim staat, met zijn paginanummer.
 *
 * BESTAAT OM DE EIS "tekstextractie met paginaverwijzingen" WAAR TE
 * MAKEN AAN DE ANDERE KANT. De tekst draagt '[pagina N]'-markeringen,
 * maar een claim die uit die tekst komt, draagt alleen de zin. Deze
 * functie geeft het paginanummer terug waar een zin staat, zodat de
 * vindplaats van een PDF-claim naar een pagina kan verwijzen in plaats
 * van naar een tekenpositie in een samengevoegde tekst.
 */
export function paginaVanPassage(
  paginas: readonly PdfPagina[],
  passage: string,
): number | null {
  const naald = passage.trim().slice(0, 60).toLowerCase();
  if (naald.length < 10) return null;
  for (const p of paginas) {
    if (p.tekst.toLowerCase().includes(naald)) return p.pagina;
  }
  return null;
}
