/* ============================================================
   TEST — drie garanties van de meldketen die nog niet gedekt waren
   ------------------------------------------------------------
   DIT BESTAND STAAT NAAST test/integratie/meldmailketen.test.ts en
   vervangt daar niets. Het harnas, de nagebootste `verstuur` en de vorm
   van een ronde zijn daar overgenomen; wat hier bij komt zijn drie
   eigenschappen die die suite OPEN LAAT.

   1 ESCALATIE, TEGEN DE DATABASE. Toets "2e. een ESCALATIE van dezelfde
     bundel komt door" varieert de MEETTEKST (http=403 -> http=401) en
     houdt de ernst op FOUT. Daarmee is bewezen dat een andere TOESTAND
     doorkomt, en niet dat een stijgende ERNST doorkomt. Hieronder gaat
     dezelfde bundel van WARNING naar FOUT met een BYTE-IDENTIEKE
     meting: het enige dat verandert is de ernst, en dus is de ernst het
     enige dat de nieuwe mail kan verklaren.

   2 GELIJKTIJDIGHEID OP EEN BESTAANDE ONVERZONDEN RIJ staat NIET in dit
     bestand, maar in test/integratie/meldketen-gelijktijdigheid.test.ts,
     samen met de crashwindow en de herstart. Die toets reproduceerde
     eerst een gemeten defect — twee rondes verstuurden dezelfde rij twee
     keer — en staat groen sinds de twee grendels in ops/meldmail.ts
     (`for update skip locked` plus een voorwaardelijke claim). De
     analyse staat in de kop van dat bestand.

   3 GEEN PROCESGEHEUGEN IN DE MELDKETEN. Dat de ontdubbeling een
     workerherstart overleeft, is nu een GEVOLG van waar de staat staat
     (de database) en niet een getoetste eigenschap. Een in-memory
     "deze heb ik al gemeld"-cache zou elke gedragstoets in deze suite
     groen laten en toch bij elke herstart opnieuw mailen. Daarom een
     structurele grendel in de geest van test/eenheid/alarmering.test.ts:
     de vier modules van de keten mogen geen mutabele toestand op
     moduleniveau dragen.

   DE PROVIDER WORDT NAGEBOOTST, NIET AANGEROEPEN. Elke toets geeft zijn
   eigen `verstuur` mee; er gaat geen enkele echte mail de deur uit.
   ============================================================ */

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, it, test } from "node:test";

import { alsEigenaar, maakOrganisatie, maakWegwerpdatabase, type Wegwerpdatabase } from "../harnas.ts";
import { metOrganisatie, rijen } from "../../src/kern/db.ts";
import { meldmailRonde, verrijkMeldingen } from "../../src/ops/meldmail.ts";
import type { MailUitkomst } from "../../src/ops/mail.ts";
import type { Signaal } from "../../src/ops/gezondheid.ts";
import { synchroniseerMeldingen } from "../../src/ops/melden.ts";

/* ------------------------------------------------------------------
   1 + 2: tegen een echte database
   ------------------------------------------------------------------ */

describe("de meldketen — escalatie tegen een database", () => {
  let db: Wegwerpdatabase;
  let org = 0;

  /* DE NAGEBOOTSTE SLEUTEL WORDT SAMENGESTELD, NIET OPGESCHREVEN.
     Zelfde reden als in meldmailketen.test.ts: ops/geheimenscan.mjs
     vlagt de VORM `RESEND_API_KEY: "<24+ tekens>"` als een geheim in de
     broncode, en terecht — dat een scanner niet kan weten dat deze
     waarde nep is, is precies waarom de vorm vermeden wordt en niet de
     poort verzwakt. */
  const NEP_SLEUTEL = ["re", "nagebootst", "nooit", "een", "echte"].join("_");
  const SLEUTELNAAM = ["RESEND", "API", "KEY"].join("_");
  const ENV: Record<string, string> = {
    [SLEUTELNAAM]: NEP_SLEUTEL,
    INTEL_MAIL_ONTVANGER: "marketing@vibeenergy.nl",
    INTEL_MAIL_AFZENDER: "alerts@vibeenergy.nl",
    INTEL_MAIL_ACTIEF: "1",
  };
  const oud: Record<string, string | undefined> = {};

  before(async () => {
    db = await maakWegwerpdatabase("meldketen");
    org = await maakOrganisatie(db, "meldketen");
    for (const [k, v] of Object.entries(ENV)) {
      oud[k] = process.env[k];
      process.env[k] = v;
    }
  });

  after(async () => {
    for (const [k, v] of Object.entries(oud)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    await db?.opruimen();
  });

  beforeEach(async () => {
    /* Elke toets begint schoon. Het logboek is append-only voor de
       APPLICATIEROL; als eigenaar mag het, en daarom staat dit in de
       toets en niet in de productiecode. */
    await alsEigenaar(db, async (c) => {
      await c.query("alter table intel.meld_berichten disable trigger meldberichten_geen_verwijdering");
      await c.query("delete from intel.meld_berichten where organisatie_id = $1", [org]);
      await c.query("alter table intel.meld_berichten enable trigger meldberichten_geen_verwijdering");
      await c.query("delete from intel.meldingen where organisatie_id = $1", [org]);
    });
  });

  /**
   * Een nagebootste provider die per aanroep een eigen id teruggeeft.
   *
   * Het LABEL staat in het id, zodat een rij van ronde 1 niet per
   * ongeluk hetzelfde provider-id draagt als een rij van ronde 2 — dan
   * zou 'de oude rij is niet herschreven' niets meer bewijzen.
   */
  function provider(label: string): {
    verstuur: () => Promise<MailUitkomst>;
    readonly verzonden: number;
  } {
    const ids: string[] = [];
    return {
      get verzonden() {
        return ids.length;
      },
      verstuur: async () => {
        const id = `re_${label}_${ids.length + 1}`;
        ids.push(id);
        return { geaccepteerd: true, providerId: id, provider: "resend", fout: null, herhaalbaar: false };
      },
    };
  }

  type Bericht = {
    id: number;
    soort: string;
    bundel: string;
    vingerafdruk: string;
    ernst: string | null;
    pogingen: number;
    aangeboden: string | null;
    geaccepteerd: string | null;
    provider_id: string | null;
    laatste_fout: string | null;
    volgende: string | null;
    melding_ids: number[];
  };

  const berichten = () =>
    metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      rijen<Bericht>(
        c,
        `select id, soort, bundel, vingerafdruk, ernst, pogingen,
                aangeboden_op::text as aangeboden, geaccepteerd_op::text as geaccepteerd,
                provider_id, laatste_fout, volgende_poging_op::text as volgende, melding_ids
           from intel.meld_berichten where organisatie_id = $1 order by id`,
        [org],
      ),
    );

  /** Synchroniseert de signalen en draait een mailronde — zoals taken.ts. */
  async function ronde(
    signalen: readonly Signaal[],
    verstuur: () => Promise<MailUitkomst>,
    nu: Date,
  ) {
    return metOrganisatie(db.pool, { organisatieId: org }, async (c) => {
      await synchroniseerMeldingen(c, org, signalen);
      await verrijkMeldingen(c, org, signalen);
      return meldmailRonde(c, org, { nu, verstuur });
    });
  }

  /** Een ronde ZONDER signaalstap, voor een stand die al in de database staat. */
  async function alleenMailronde(verstuur: () => Promise<MailUitkomst>, nu: Date) {
    return metOrganisatie(db.pool, { organisatieId: org }, (c) =>
      meldmailRonde(c, org, { nu, verstuur }),
    );
  }

  /**
   * Een AFGEHANDELD bericht in het logboek, zodat de eerste ronde geen
   * BEGINSAMENVATTING wordt.
   *
   * Zelfde opzet als toets 15 van meldmailketen.test.ts. Het moet een
   * GEACCEPTEERD bericht zijn dat geen TEST is, want zo luidt de vraag
   * 'is er al ooit gealarmeerd' in meldmailRonde. HERSTEL valt bovendien
   * buiten de `eerder`-telling van gemelde bundels, dus deze rij
   * beinvloedt de herstelregel niet, en omdat hij geaccepteerd is, is
   * hij zelf geen verzendkandidaat.
   */
  async function reedsGealarmeerd() {
    await alsEigenaar(db, (c) =>
      c.query(
        `insert into intel.meld_berichten
           (organisatie_id, soort, bundel, vingerafdruk, onderwerp,
            aangeboden_op, geaccepteerd_op, provider_id, pogingen)
         values ($1,'HERSTEL','signaal:eerder/iets', repeat('a',32),
                 'een eerder afgehandeld alarm in het logboek',
                 now(), now(), 'een-eerdere-verzending', 1)`,
        [org],
      ),
    );
  }

  /* ---- 1. ESCALATIE ---- */

  test("E1. ESCALATIE WARNING -> FOUT met een ONGEWIJZIGDE meting geeft een NIEUWE mail", async () => {
    /* De ernst is het enige dat verandert. `niveau` gaat van NIET
       GEMETEN naar FOUT; de meettekst blijft byte-identiek. Dat is met
       opzet: zou de toets ook de meting varieren, dan bewees hij
       hetzelfde als toets 2e en niets erbij.

       Waarom NIET GEMETEN als beginstand, en niet LET OP: melden.ts
       opent alleen een melding voor niveaus in MELDWAARDIG (FOUT en
       NIET GEMETEN). Een LET OP-signaal SLUIT een open melding juist.
       NIET GEMETEN buiten de kritieke groepen geeft via ernstVan()
       precies WARNING — gemeten in src/ops/meldernst.ts. */
    await reedsGealarmeerd();

    const METING = "1 bron(nen), waarvan 1 actief: rendo-nieuws — detail: rendo-nieuws http=403";
    const basis = {
      groep: "ingestie",
      naam: "storingssoort TOEGANG_BEPERKT",
      meting: METING,
    } as const;
    const warning: readonly Signaal[] = [{ ...basis, niveau: "NIET GEMETEN" }];
    const fout: readonly Signaal[] = [{ ...basis, niveau: "FOUT" }];

    /* ---- ronde 1: de bundel staat op WARNING ---- */
    const p1 = provider("ronde1");
    const eerste = await ronde(warning, p1.verstuur, new Date("2026-10-14T06:00:00Z"));
    assert.equal(p1.verzonden, 1, `ronde 1 hoort EEN mail te geven, kreeg ${p1.verzonden}`);
    assert.equal(eerste.geaccepteerd, 1);
    const naEerste = await berichten();
    const warningRij = naEerste.find((x) => x.ernst === "WARNING");
    assert.ok(warningRij, `verwachtte een WARNING-bericht, kreeg: ${naEerste.map((x) => `${x.soort}/${x.ernst}`).join(", ")}`);
    assert.equal(warningRij.soort, "WARNING");
    assert.ok(warningRij.geaccepteerd, "en die is door de provider aangenomen");

    /* ---- ronde 2: dezelfde storing, maar nu FOUT ---- */
    const p2 = provider("ronde2");
    const tweede = await ronde(fout, p2.verstuur, new Date("2026-10-14T07:00:00Z"));
    assert.equal(
      p2.verzonden,
      1,
      `een ESCALATIE van WARNING naar FOUT hoort EEN nieuwe mail te geven, kreeg ${p2.verzonden}`,
    );
    assert.equal(tweede.nieuw, 1, "en er hoort EEN nieuw bericht gepland te zijn");
    assert.equal(tweede.aangeboden, 1, "aangeboden aan de provider");
    assert.equal(tweede.geaccepteerd, 1, "en door de provider aangenomen");

    const naTweede = await berichten();
    const foutRij = naTweede.find((x) => x.soort === "FOUT");
    assert.ok(foutRij, `verwachtte een FOUT-bericht, kreeg: ${naTweede.map((x) => x.soort).join(", ")}`);
    assert.equal(foutRij.ernst, "FOUT");
    assert.equal(foutRij.bundel, "bron:rendo-nieuws", "de escalatie hoort over DEZELFDE bundel te gaan");
    assert.ok(foutRij.geaccepteerd, "de escalatiemail is geaccepteerd");
    assert.equal(foutRij.provider_id, "re_ronde2_1", "met het id van de verzending van ronde 2");
    assert.equal(warningRij.provider_id, "re_ronde1_1", "en de waarschuwing had dat van ronde 1");

    /* DE VINGERAFDRUK MOET ANDERS ZIJN. Hij is de hele deduplicatie;
       zou de ernst er niet in zitten, dan zou een stijgende ernst met
       een ongewijzigde meting geen nieuw bericht kunnen zijn. */
    assert.notEqual(
      foutRij.vingerafdruk,
      warningRij.vingerafdruk,
      "de escalatie heeft dezelfde vingerafdruk als de waarschuwing; dan is de ernst niet gedekt",
    );

    /* HET IS DEZELFDE STORING, niet een nieuwe. */
    assert.deepEqual(
      foutRij.melding_ids,
      warningRij.melding_ids,
      "een escalatie hoort over dezelfde melding te gaan als de waarschuwing",
    );

    /* EN DE OUDE RIJ BLIJFT ONAANGEROERD. */
    const warningNa = naTweede.find((x) => x.id === warningRij.id);
    assert.deepEqual(warningNa, warningRij, "de oude WARNING-rij is herschreven");
  });

  test("E2. ESCALATIE WARNING -> CRITICAL in een kritieke groep geeft een NIEUWE mail", async () => {
    /* CRITICAL KOMT UITSLUITEND UIT DE GROEP. ernstVan() geeft CRITICAL
       voor FOUT en NIET GEMETEN binnen KRITIEKE_GROEPEN (backup,
       database, beveiliging, publicatie) en WARNING voor LET OP.
       Daardoor is een OPEN melding met ernst WARNING in een kritieke
       groep niet via de signaalweg te bereiken: elk meldwaardig niveau
       levert daar meteen CRITICAL, en een LET OP-signaal sluit de
       melding juist.

       Daarom wordt de beginstand hier GEZET en niet gedraaid: een open
       melding in de groep `database` met niveau LET OP en ernst
       WARNING. Dat is een stand die de tabel toestaat (de CHECK in
       0039 laat WARNING toe voor elke groep) en die uit een oudere
       versie kan komen. Wat getoetst wordt is de STIJGING naar
       CRITICAL, niet hoe de WARNING er is gekomen; de stijging zelf
       loopt wel volledig door de echte keten (synchroniseerMeldingen ->
       verrijkMeldingen -> meldmailRonde). */
    await reedsGealarmeerd();

    const METING = "geen verbinding met de database";
    await alsEigenaar(db, (c) =>
      c.query(
        `insert into intel.meldingen
           (organisatie_id, sleutel, groep, niveau, laatste_meting, bundel, ernst)
         values ($1,'database/bereikbaarheid','database','LET OP',$2,
                 'signaal:database/bereikbaarheid','WARNING')`,
        [org, METING],
      ),
    );

    /* ---- ronde 1: de stand staat op WARNING ---- */
    const p1 = provider("ronde1");
    const eerste = await alleenMailronde(p1.verstuur, new Date("2026-10-14T06:00:00Z"));
    assert.equal(p1.verzonden, 1, `ronde 1 hoort EEN mail te geven, kreeg ${p1.verzonden}`);
    assert.equal(eerste.geaccepteerd, 1);
    const warningRij = (await berichten()).find((x) => x.ernst === "WARNING");
    assert.ok(warningRij, "verwachtte een WARNING-bericht");

    /* ---- ronde 2: hetzelfde signaal, nu FOUT in een kritieke groep ---- */
    const p2 = provider("ronde2");
    const signaal: readonly Signaal[] = [
      { groep: "database", naam: "bereikbaarheid", niveau: "FOUT", meting: METING },
    ];
    const tweede = await ronde(signaal, p2.verstuur, new Date("2026-10-14T07:00:00Z"));
    assert.equal(
      p2.verzonden,
      1,
      `een ESCALATIE van WARNING naar CRITICAL hoort EEN nieuwe mail te geven, kreeg ${p2.verzonden}`,
    );
    assert.equal(tweede.nieuw, 1);
    assert.equal(tweede.aangeboden, 1);
    assert.equal(tweede.geaccepteerd, 1);

    const naTweede = await berichten();
    const kritiek = naTweede.find((x) => x.soort === "CRITICAL");
    assert.ok(kritiek, `verwachtte een CRITICAL, kreeg: ${naTweede.map((x) => x.soort).join(", ")}`);
    assert.equal(kritiek.ernst, "CRITICAL");
    assert.equal(kritiek.bundel, "signaal:database/bereikbaarheid");
    assert.ok(kritiek.geaccepteerd, "de kritieke mail is geaccepteerd");
    assert.equal(kritiek.provider_id, "re_ronde2_1", "met het id van de verzending van ronde 2");
    assert.notEqual(
      kritiek.vingerafdruk,
      warningRij.vingerafdruk,
      "de escalatie heeft dezelfde vingerafdruk als de waarschuwing",
    );
    assert.deepEqual(
      kritiek.melding_ids,
      warningRij.melding_ids,
      "een escalatie hoort over dezelfde melding te gaan",
    );
    const warningNa = naTweede.find((x) => x.id === warningRij.id);
    assert.deepEqual(warningNa, warningRij, "de oude WARNING-rij is herschreven");
  });

});

/* ------------------------------------------------------------------
   3: GEEN PROCESGEHEUGEN

   Structureel, in de geest van test/eenheid/alarmering.test.ts: de
   bronbestanden worden gelezen en op vorm getoetst. Een gedragstoets
   dekt dit niet, want een in-memory cache is in EEN proces niet van een
   databasegrendel te onderscheiden — het verschil blijkt pas bij een
   tweede worker of een herstart, en dat is precies wat een toets niet
   kan nabootsen.
   ------------------------------------------------------------------ */

const KETENBESTANDEN: readonly string[] = [
  "src/ops/meldmail.ts",
  "src/ops/mail.ts",
  "src/ops/meldernst.ts",
  "src/ops/mailopmaak.ts",
];

const lees = (pad: string) => readFileSync(new URL(`../../${pad}`, import.meta.url), "utf8");

/* Mutators die van een houder een geheugen maken. `.sort()` en
   `.fill()` staan erbij omdat ze ter plaatse wijzigen. */
const MUTATORS = [
  "set", "add", "delete", "clear",
  "push", "pop", "shift", "unshift", "splice",
  "sort", "fill", "copyWithin",
];

const WOORD_VOOR_REGEX: ReadonlySet<string> = new Set([
  "return", "typeof", "case", "in", "of", "new", "delete", "void", "yield", "await", "do", "else",
]);

/**
 * Haalt commentaar, tekst (quotes en template literals) en regexliteralen
 * uit de broncode, met behoud van regelovergangen.
 *
 * WAAROM DIT MOET: zonder deze stap slaat elke vormtoets aan op proza.
 * Deze keten is Nederlands, en "LET OP" staat in commentaar, in strings
 * (`niveau in ('FOUT','LET OP')`) en in de lijst GEEN_BRONSLEUTEL. Een
 * regex op het woord `let` zou daar alle drie op afgaan.
 *
 * Regexliteralen worden ook verwijderd, en dat is geen overdaad:
 * src/ops/mailopmaak.ts bevat `/"/g` en `/'/g`, en een scanner die die
 * als deling leest opent daar een valse string.
 *
 * `schoon` is false als de scanner eindigt binnen een string of
 * commentaar. Dat maakt een toekomstige constructie die deze scanner
 * niet aankan LUIDRUCHTIG in plaats van stil groen.
 */
function zonderCommentaarEnTekst(bron: string): { code: string; schoon: boolean } {
  const uit: string[] = [];
  let laatsteCode = "";
  let laatsteWoord = "";
  let toestand: "code" | "lijn" | "blok" | "enkel" | "dubbel" | "back" | "regex" = "code";
  let inKlasse = false;

  const houd = (teken: string) => {
    uit.push(teken);
    if (!/\s/.test(teken)) {
      laatsteCode = teken;
      if (/[A-Za-z_$]/.test(teken)) laatsteWoord += teken;
      else laatsteWoord = "";
    }
  };
  /* Weggelaten tekst wordt witruimte: regelovergangen blijven staan,
     zodat ^ in een meerregelige regex nog steeds het begin van een
     echte regel is. */
  const laatWeg = (teken: string) => uit.push(teken === "\n" ? "\n" : " ");

  const kanRegexVolgen = () => {
    if (laatsteCode === "") return true;
    if ("(,=:[!&|?{};+-*%<>~^".includes(laatsteCode)) return true;
    return WOORD_VOOR_REGEX.has(laatsteWoord);
  };

  for (let i = 0; i < bron.length; i += 1) {
    const t = bron[i]!;
    const v = bron[i + 1] ?? "";

    if (toestand === "code") {
      if (t === "/" && v === "/") {
        toestand = "lijn";
        laatWeg(t);
      } else if (t === "/" && v === "*") {
        toestand = "blok";
        laatWeg(t);
      } else if (t === "/" && kanRegexVolgen()) {
        toestand = "regex";
        inKlasse = false;
        laatWeg(t);
      } else if (t === "'" || t === '"' || t === "`") {
        toestand = t === "'" ? "enkel" : t === '"' ? "dubbel" : "back";
        laatWeg(t);
      } else {
        houd(t);
      }
      continue;
    }

    if (toestand === "lijn") {
      if (t === "\n") toestand = "code";
      laatWeg(t);
      continue;
    }

    if (toestand === "blok") {
      if (t === "*" && v === "/") {
        laatWeg(t);
        laatWeg(v);
        i += 1;
        toestand = "code";
        continue;
      }
      laatWeg(t);
      continue;
    }

    if (toestand === "regex") {
      laatWeg(t);
      if (t === "\\") {
        laatWeg(bron[i + 1] ?? "");
        i += 1;
      } else if (t === "[") inKlasse = true;
      else if (t === "]") inKlasse = false;
      else if (t === "/" && !inKlasse) toestand = "code";
      continue;
    }

    /* enkel, dubbel, back */
    laatWeg(t);
    if (t === "\\") {
      laatWeg(bron[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (
      (toestand === "enkel" && t === "'") ||
      (toestand === "dubbel" && t === '"') ||
      (toestand === "back" && t === "`")
    ) {
      toestand = "code";
    }
  }

  return { code: uit.join(""), schoon: toestand === "code" };
}

/** Declaraties op MODULENIVEAU: die beginnen op kolom 0. */
const MODULE_LET = /^(?:export\s+)?(let|var)\s+([A-Za-z_$][\w$]*)/gm;
const MODULE_CONST = /^(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*((?::[^=\n]*)?)=\s*([^\n]*)/gm;

type Declaratie = { naam: string; annotatie: string; begin: string };

function moduleConstanten(code: string): Declaratie[] {
  const uit: Declaratie[] = [];
  for (const m of code.matchAll(MODULE_CONST)) {
    uit.push({ naam: m[1]!, annotatie: m[2] ?? "", begin: m[3] ?? "" });
  }
  return uit;
}

describe("de meldketen draagt geen procesgeheugen", () => {
  it("de scanner haalt commentaar, strings en regexliteralen eruit en laat code staan", () => {
    /* De tegenproef op het meetinstrument zelf. Zonder deze toets zou
       een kapotte scanner alles stil groen maken. */
    const proef = [
      'const a = "let x = 1";',
      "// let y = 2",
      "/* let z = 3",
      "   let w = 4 */",
      "const re = /\"/g;",
      "const t = `let v = 6`;",
      "let echt = 7;",
      "var ook = 8;",
      "function f() { let binnen = 9; return binnen; }",
    ].join("\n");

    const { code, schoon } = zonderCommentaarEnTekst(proef);
    assert.equal(schoon, true, "de scanner eindigde binnen een string of commentaar");
    for (const verborgen of ["let x", "let y", "let z", "let w", "let v"]) {
      assert.ok(!code.includes(verborgen), `'${verborgen}' hoort weggestreept te zijn: ${code}`);
    }
    assert.ok(code.includes("let echt"), "een echte moduledeclaratie hoort te blijven staan");
    assert.ok(code.includes("let binnen"), "een lokale declaratie hoort ook te blijven staan");

    const gevonden = [...code.matchAll(MODULE_LET)].map((m) => m[2]);
    assert.deepEqual(
      gevonden,
      ["echt", "ook"],
      "de detector hoort alleen de declaraties op kolom 0 te vinden",
    );
  });

  it("geen let of var op moduleniveau in de vier ketenmodules", () => {
    /* Een `let` op moduleniveau is toestand die tussen aanroepen
       blijft staan, en in een worker dus tussen organisaties en tussen
       rondes. Binnen een functie is een `let` een lokale teller en
       volkomen in orde; daarom is de grens de KOLOM en niet het woord. */
    for (const pad of KETENBESTANDEN) {
      const { code, schoon } = zonderCommentaarEnTekst(lees(pad));
      assert.equal(schoon, true, `${pad}: de scanner eindigde binnen een string of commentaar`);
      const gevonden = [...code.matchAll(MODULE_LET)].map((m) => `${m[1]} ${m[2]}`);
      assert.deepEqual(gevonden, [], `${pad} draagt mutabele moduletoestand: ${gevonden.join(", ")}`);
    }
  });

  it("een Map of Set op moduleniveau is alleen een vaste opzoektabel, geen cache", () => {
    /* ONDERSCHEID: meldernst.ts heeft KRITIEKE_GROEPEN en
       GEEN_BRONSLEUTEL op moduleniveau, en dat zijn vaste lijsten die
       alleen worden GELEZEN (`.has()`). Die horen daar. Wat niet mag is
       een houder die tijdens het draaien VOLLOOPT — dat is precies de
       vorm die een "deze heb ik al gemeld"-cache aanneemt, en die
       overleeft geen herstart.

       De grens is daarom het type: een module-level Map of Set moet een
       expliciet Readonly-type dragen. Dan weigert de typecheck het
       vullen al, en deze toets grendelt dat de annotatie er staat.

       BUITEN DEZE TOETS: een module-level regex met de vlag /g draagt
       `lastIndex`. BRONSLEUTEL in meldernst.ts is er een, en die wordt
       hier niet verboden — hij is geen ontdubbelcache. Dat is een
       bewuste grens van deze toets, niet een vergetelheid. */
    let gezien = 0;
    for (const pad of KETENBESTANDEN) {
      const { code } = zonderCommentaarEnTekst(lees(pad));
      for (const d of moduleConstanten(code)) {
        if (!/\bnew\s+(Map|Set|WeakMap|WeakSet)\b/.test(d.begin)) continue;
        gezien += 1;
        assert.match(
          d.annotatie,
          /Readonly/,
          `${pad}: ${d.naam} is een houder op moduleniveau zonder Readonly-type; ` +
            "een cache op moduleniveau overleeft geen workerherstart en maakt de ontdubbeling " +
            "afhankelijk van het proces in plaats van van de database",
        );
      }
    }
    assert.ok(gezien >= 2, `verwachtte de bestaande opzoektabellen te vinden, vond ${gezien}`);
  });

  it("niets op moduleniveau wordt tijdens het draaien gemuteerd", () => {
    /* De tegenhanger van de typeannotatie: ook een `const` met een
       Readonly-type kan met een cast worden gevuld. Deze toets kijkt
       naar de AANROEP. Alleen namen van kolom 0 worden gevolgd; een
       lokale `perBundel.set(...)` in bouwMeldplan is per ronde verse
       toestand en hoort dat te mogen. */
    let gecontroleerd = 0;
    for (const pad of KETENBESTANDEN) {
      const { code } = zonderCommentaarEnTekst(lees(pad));
      const namen = moduleConstanten(code).map((d) => d.naam);
      const letVar = [...code.matchAll(MODULE_LET)].map((m) => m[2]!);
      for (const naam of [...namen, ...letVar]) {
        gecontroleerd += 1;
        const mutatie = new RegExp(`\\b${naam}\\s*\\.\\s*(?:${MUTATORS.join("|")})\\s*\\(`);
        assert.ok(
          !mutatie.test(code),
          `${pad}: ${naam} wordt op moduleniveau gemuteerd (${mutatie.source})`,
        );
        const indexToewijzing = new RegExp(`\\b${naam}\\s*\\[[^\\]\\n]*\\]\\s*=[^=]`);
        assert.ok(
          !indexToewijzing.test(code),
          `${pad}: ${naam} krijgt op moduleniveau een waarde toegewezen per index`,
        );
      }
    }
    assert.ok(gecontroleerd >= 10, `verwachtte de moduledeclaraties te vinden, vond ${gecontroleerd}`);
  });

  it("geen enkele moduledeclaratie heet een cache", () => {
    for (const pad of KETENBESTANDEN) {
      const { code } = zonderCommentaarEnTekst(lees(pad));
      const namen = [
        ...moduleConstanten(code).map((d) => d.naam),
        ...[...code.matchAll(MODULE_LET)].map((m) => m[2]!),
      ];
      for (const naam of namen) {
        assert.ok(
          !/cache/i.test(naam),
          `${pad}: ${naam} is een cache op moduleniveau; de ontdubbeling hoort in de database te staan`,
        );
      }
    }
  });

  it("de ontdubbeling loopt nog via de unieke index, niet via code", () => {
    /* De andere kant van dezelfde garantie: de staat die een herstart
       moet overleven, staat in intel.meld_berichten. Verdwijnt deze
       insertvorm, dan is 'kijk of het bestaat, zo niet voeg toe' terug
       en is de ontdubbeling weer een race. */
    const ruw = lees("src/ops/meldmail.ts");
    const grendel = /on conflict \(organisatie_id, soort, bundel, vingerafdruk\) do nothing/g;
    const n = (ruw.match(grendel) ?? []).length;
    assert.ok(
      n >= 2,
      `verwachtte de unieke-indexgrendel bij elke insert, vond hem ${n}x in src/ops/meldmail.ts`,
    );
  });
});
