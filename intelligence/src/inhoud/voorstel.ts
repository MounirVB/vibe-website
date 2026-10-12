/* ============================================================
   WIJZIGINGSVOORSTEL — bestaande pagina, voorgestelde wijziging,
   onderbouwing, CTA, en vier controles die het kunnen afkeuren
   ------------------------------------------------------------
   WAAROM DEZE LAAG BOVEN `concept.ts` ZIT

   `concept.ts` schrijft een ARTIKEL: titel, body, bronnen, CTA. Dat is
   het juiste product voor een nieuwe URL. Maar een UPDATE_EXISTING is
   geen artikel — het is een voorstel om een BESTAANDE pagina te
   wijzigen, en dan is de vraag niet 'is deze tekst goed' maar:

     hoort dit feit op DEZE pagina, en is het nog waar?

   Die vraag stelde niemand. Gemeten op 12 oktober 2026 stonden er vijf
   kandidaten in de wachtrij, alle vijf met doelpagina
   /kennis/transportvermogen-versus-aansluitwaarde, alle vijf over
   nettarieven:

     [ 1] 2026-09-14  nettarieven 2027      20%, 20%, EUR 12, 4,5%, EUR 235, EUR 33
     [14] 2026-03-16  nieuwe nettarieven    5%, 10%
     [16] 2026-06-03  variabele nettarieven 60%, 60%
     [17] 2025-11-27  nettarieven 2026      10%, 12%
     [29] 2026-05-04  voorstel nieuw stelsel GEEN waarde

   Vijf patches op een pagina, over een onderwerp dat die pagina
   0 (nul) keer noemt en in zijn eigen bron expliciet wegwijst:
   "Welke posten uw netbeheerder in rekening brengt en wat ze kosten,
   staat op het tarievenblad van die netbeheerder."

   DE VIER CONTROLES

   bronverwijzing  is elke bewering herleidbaar tot een bevestigde
                   uitspraak met een bron-URL, en is er uberhaupt een
                   harde bewering?
   actualiteit     is dit nog de stand van zaken, of staat er een
                   nieuwere publicatie over hetzelfde onderwerp?
   duplicatie      zegt de pagina dit al, of zegt een andere kandidaat
                   hetzelfde?
   seo             bezit deze pagina de zoekintentie, noemt hij het
                   onderwerp, en spreekt hij het voorstel niet tegen?

   Een voorstel dat een van deze vier niet haalt, gaat NIET naar review.
   Het krijgt HERROUTEREN, UITSTELLEN of AFWIJZEN met de reden erbij.
   Dat is het product: een besluit met grondslag, geen tekst.

   WAT DEZE LAAG NOOIT DOET

   Publiceren. De uitkomst is een voorstel dat op een mens wacht. Het
   platform mag bovendien alleen `data/inhoud/nieuws/<slug>.json`
   auteuren (TOEGESTAAN_AUTEURSPAD in publicatie/pr.ts); een kennispagina
   wijzigen is per definitie een patch die een mens doorvoert.
   ============================================================ */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type pg from "pg";
import { eenRij, rijen } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import { herkenOnderwerpen } from "../pijplijn/onderwerpen.ts";

const log = maakLogger("voorstel");

export type Oordeel = "PASS" | "VOORBEHOUD" | "FAIL";

export type Controle = {
  readonly naam: "bronverwijzing" | "actualiteit" | "duplicatie" | "seo";
  readonly oordeel: Oordeel;
  readonly reden: string;
  readonly bewijs: readonly string[];
};

export type Eindoordeel = "KLAAR_VOOR_REVIEW" | "HERROUTEREN" | "UITSTELLEN" | "AFWIJZEN";

export const EINDOORDEEL_LABEL: Record<Eindoordeel, string> = {
  KLAAR_VOOR_REVIEW: "Klaar voor beoordeling",
  HERROUTEREN: "Hoort op een andere pagina",
  UITSTELLEN: "Uitstellen",
  AFWIJZEN: "Afwijzen",
};

export type Uitspraak = {
  readonly soort: string;
  readonly waarde: string | null;
  readonly eenheid: string | null;
  readonly status: string;
};

export type Voorstel = {
  readonly kandidaatId: number;
  readonly gebeurtenisId: number;
  readonly titel: string;
  readonly brondatum: string | null;
  readonly bedrijfsrelevantie: number | null;
  readonly doelPad: string | null;
  readonly bestaandePagina: {
    readonly pad: string | null;
    readonly h1: string | null;
    readonly lead: string | null;
    readonly gepubliceerdVoorbehoud: string | null;
    readonly secties: readonly string[];
    readonly noemtOnderwerp: number;
    readonly bestaatAlsBron: boolean;
  };
  readonly wijziging: {
    readonly soort: "alinea_toevoegen" | "sectie_toevoegen" | "geen";
    readonly doelSectie: string | null;
    readonly nieuweTekst: string;
    readonly diff: readonly string[];
  };
  readonly onderbouwing: {
    readonly uitspraken: readonly Uitspraak[];
    readonly bronnen: readonly { readonly uitgever: string; readonly url: string; readonly op: string | null }[];
  };
  readonly cta: { readonly tekst: string; readonly doel: string; readonly grondslag: string };
  readonly controles: readonly Controle[];
  readonly eindoordeel: Eindoordeel;
  readonly oordeelReden: string;
};

/* ------------------------------------------------------------------
   De bestaande pagina lezen uit de GEGENEREERDE BRON, niet uit de HTML
   ------------------------------------------------------------------ */

type PaginaBron = {
  h1?: string;
  lead?: string;
  titel?: string;
  direct_antwoord?: { voorbehoud?: string };
  secties?: { kop?: string; lead?: string; alineas?: string[] }[];
};

/**
 * Leest de JSON-bron achter een gegenereerde pagina.
 *
 * De HTML is uitvoer; een voorstel dat op de HTML mikt zou bij de
 * volgende generatie verdwijnen. Daarom altijd de bron.
 */
export function leesPaginaBron(repoWortel: string, pad: string): PaginaBron | null {
  /* /kennis/foo -> data/inhoud/kennis/foo.json */
  const m = /^\/([a-z0-9-]+)\/([a-z0-9-]+)$/.exec(pad);
  const enkel = /^\/([a-z0-9-]+)$/.exec(pad);
  const kandidaten = m
    ? [join(repoWortel, "data", "inhoud", m[1]!, `${m[2]!}.json`)]
    : enkel
      ? [
          join(repoWortel, "data", "inhoud", "hub", `${enkel[1]!}.json`),
          join(repoWortel, "data", "inhoud", "pagina", `${enkel[1]!}.json`),
        ]
      : [];
  for (const p of kandidaten) {
    try {
      return JSON.parse(readFileSync(p, "utf8")) as PaginaBron;
    } catch {
      /* volgende kandidaat */
    }
  }
  return null;
}

/** Hoe vaak noemt de pagina dit onderwerp? Nul is een signaal. */
function noemtHoeVaak(bron: PaginaBron | null, termen: readonly string[]): number {
  if (!bron || termen.length === 0) return 0;
  const alles = JSON.stringify(bron).toLowerCase();
  let n = 0;
  for (const t of termen) {
    const schoon = t.toLowerCase().trim();
    if (schoon.length < 4) continue;
    n += alles.split(schoon).length - 1;
  }
  return n;
}

/* ------------------------------------------------------------------
   Het voorstel bouwen
   ------------------------------------------------------------------ */

type KandidaatRij = {
  kandidaat_id: number;
  gebeurtenis_id: number;
  titel: string;
  gebeurd_op: string | null;
  bedrijfsrelevantie: number | null;
  relevantie_categorie: string | null;
  doel_pad: string | null;
  cluster_sleutel: string | null;
  cluster_canoniek: string | null;
  risico_klasse: string;
};

export async function bouwVoorstel(
  c: pg.PoolClient,
  repoWortel: string,
  kandidaatId: number,
  /** Peildatum. Expliciet, zodat een toets niet aan de klok hangt. */
  vandaag = new Date().toISOString().slice(0, 10),
): Promise<Voorstel | null> {
  const k = await eenRij<KandidaatRij>(
    c,
    `select k.id            as kandidaat_id,
            g.id            as gebeurtenis_id,
            g.titel,
            g.gebeurd_op::text as gebeurd_op,
            g.bedrijfsrelevantie,
            g.relevantie_categorie,
            pr.pad          as doel_pad,
            oc.sleutel      as cluster_sleutel,
            oc.canonieke_pagina as cluster_canoniek,
            k.risico_klasse
       from intel.inhoud_kandidaten k
       join intel.markt_gebeurtenissen g on g.id = k.gebeurtenis_id
       left join intel.pagina_register pr on pr.id = k.doel_pagina_id
       left join intel.onderwerp_clusters oc on oc.id = k.onderwerp_cluster_id
      where k.id = $1`,
    [kandidaatId],
  );
  if (!k) return null;

  const uitspraken = await rijen<{
    soort: string;
    waarde_numeriek: string | null;
    eenheid: string | null;
    verificatie_status: string;
    tekst: string | null;
  }>(
    c,
    `select soort, waarde_numeriek, eenheid, verificatie_status, tekst
       from intel.uitspraken where gebeurtenis_id = $1 order by id`,
    [k.gebeurtenis_id],
  );

  const bronnen = await rijen<{ uitgever: string; canonieke_url: string; gepubliceerd_op: string | null }>(
    c,
    `select d.uitgever, d.canonieke_url, d.gepubliceerd_op::text as gepubliceerd_op
       from intel.gebeurtenis_documenten gd
       join intel.brondocumenten d on d.id = gd.brondocument_id
      where gd.gebeurtenis_id = $1`,
    [k.gebeurtenis_id],
  );

  /* herkenOnderwerpen() geeft de termen MET hun herkomst terug:
     'titel:netcongestie', 'body:batterij'. Dat is bruikbaar om te zien
     WAAR een term matchte, maar niet als zoekstring. De eerste versie
     van deze module zocht de pagina af op de letterlijke tekst
     'titel:netcongestie' en concludeerde dat /kennis/netcongestie-uitgelegd
     het onderwerp nul keer noemt. Die prefix gaat er dus af. */
  const onderwerpen = herkenOnderwerpen(k.titel, "");
  const termen = [
    ...new Set(onderwerpen.flatMap((t) => t.termen.map((x) => x.replace(/^(titel|body):/, "")))),
  ].slice(0, 8);
  const onderwerpSleutels = onderwerpen.map((t) => t.onderwerp);

  const bron = k.doel_pad ? leesPaginaBron(repoWortel, k.doel_pad) : null;
  const noemt = noemtHoeVaak(bron, termen);

  const harde = uitspraken.filter((u) => u.waarde_numeriek !== null);
  const bevestigd = uitspraken.filter((u) => u.verificatie_status === "bevestigd");

  /* IS DE WAARDE TE RIJMEN MET DE BRONTEKST?
     ------------------------------------------------------------------
     Deze toets bestaat omdat hij een echte fout ving. De extractie liet
     schaalwoorden vallen: 'EUR 200 miljard' werd waarde 200 met eenheid
     EUR, bevestigd en met bewijs_kwaliteit 5. Een voorstel zou daarmee
     '200 euro' op een pagina hebben gezet.

     De extractie is gerepareerd, maar deze poort blijft staan en is
     onafhankelijk van die reparatie: hij vergelijkt de BEWAARDE waarde
     met de BRONTEKST en weigert wat niet klopt. Zo wordt een volgende
     extractiefout tegengehouden in plaats van gepubliceerd. */
  const onrijmbaar: string[] = [];
  for (const u of uitspraken) {
    if (u.waarde_numeriek === null || !u.tekst) continue;
    const bewaard = Number(u.waarde_numeriek);
    const schaalInBron = /\b(duizend|miljoen|miljard|mln\.?|mld\.?)\b/i.exec(u.tekst);
    if (!schaalInBron) continue;
    const woord = schaalInBron[1]!.toLowerCase().replace(/\.$/, "");
    const factor = woord === "duizend" ? 1e3 : woord.startsWith("mln") || woord === "miljoen" ? 1e6 : 1e9;
    /* De bewaarde waarde hoort de schaal al te bevatten. Is hij kleiner
       dan de factor, dan is het schaalwoord onderweg verdwenen. */
    if (bewaard < factor) {
      onrijmbaar.push(
        `bewaard ${bewaard}${u.eenheid ?? ""} terwijl de brontekst '${woord}' zegt: ` +
          `"${u.tekst.slice(0, 110)}"`,
      );
    }
  }

  /* ---------- CONTROLE 1: bronverwijzing ---------- */
  const bronControle: Controle = (() => {
    const bewijs: string[] = [];
    bewijs.push(`${uitspraken.length} uitspraak(en), waarvan ${bevestigd.length} bevestigd`);
    bewijs.push(`${harde.length} met een harde waarde`);
    for (const b of bronnen) bewijs.push(`${b.uitgever}: ${b.canonieke_url}`);
    if (bronnen.length === 0) {
      return { naam: "bronverwijzing", oordeel: "FAIL", reden: "er hangt geen brondocument aan deze gebeurtenis", bewijs };
    }
    if (harde.length === 0) {
      return {
        naam: "bronverwijzing",
        oordeel: "FAIL",
        reden:
          "er is geen enkele harde waarde vastgelegd; een voorstel zonder getal of datum voegt " +
          "aan een bestaande pagina niets toe dat te verifieren is",
        bewijs,
      };
    }
    if (onrijmbaar.length > 0) {
      return {
        naam: "bronverwijzing",
        oordeel: "FAIL",
        reden:
          `${onrijmbaar.length} waarde(n) zijn niet te rijmen met hun eigen brontekst: het ` +
          `schaalwoord (miljoen/miljard) staat in de bron maar niet in de bewaarde waarde. ` +
          `Zo'n waarde mag nooit op een pagina komen`,
        bewijs: [...bewijs, ...onrijmbaar],
      };
    }
    if (bevestigd.length < harde.length) {
      return {
        naam: "bronverwijzing",
        oordeel: "VOORBEHOUD",
        reden: `${harde.length - bevestigd.length} van de ${harde.length} harde waarden is niet bevestigd`,
        bewijs,
      };
    }
    return {
      naam: "bronverwijzing",
      oordeel: "PASS",
      reden: `${harde.length} harde waarde(n), alle bevestigd, met ${bronnen.length} bron-URL(s)`,
      bewijs,
    };
  })();

  /* ---------- CONTROLE 2: actualiteit ----------
     ACHTERHAALD BETEKENT: ER IS IETS NIEUWER OVER HETZELFDE ONDERWERP.
     Niet 'er is iets nieuwer op dezelfde pagina'. Die eerste versie van
     deze controle keurde 15 van de 19 kandidaten af, omdat 19 kandidaten
     op 4 pagina's mikken en er dus bijna altijd iets nieuwers op de
     pagina staat. Dat meet drukte, geen veroudering.

     Het onderwerp wordt bepaald door de onderwerptermen uit de titel.
     Twee gedeelde termen is de drempel: één gedeelde term is bij deze
     bronnen bijna altijd 'energie' of 'net'. */
  const anderen = await rijen<{ id: number; titel: string; gebeurd_op: string | null }>(
    c,
    `select k2.id, g2.titel, g2.gebeurd_op::text as gebeurd_op
       from intel.inhoud_kandidaten k2
       join intel.markt_gebeurtenissen g2 on g2.id = k2.gebeurtenis_id
       left join intel.pagina_register pr2 on pr2.id = k2.doel_pagina_id
      where k2.id <> $1
        and coalesce(pr2.pad, '') = coalesce($2, '')
      order by g2.gebeurd_op desc nulls last`,
    [kandidaatId, k.doel_pad],
  );

  const mijnTermen = new Set(termen.map((t) => t.toLowerCase()));
  const overlapt = (titel: string): string[] => {
    const hunTermen = new Set(
      herkenOnderwerpen(titel, "").flatMap((t) =>
        t.termen.map((x) => x.replace(/^(titel|body):/, "").toLowerCase()),
      ),
    );
    return [...mijnTermen].filter((t) => hunTermen.has(t));
  };

  const nieuwereOverHetzelfde = anderen
    .filter((a) => a.gebeurd_op && k.gebeurd_op && a.gebeurd_op > k.gebeurd_op)
    .map((a) => ({ ...a, gedeeld: overlapt(a.titel) }))
    .filter((a) => a.gedeeld.length >= 2);

  const actualiteit: Controle = (() => {
    const bewijs = [
      `${anderen.length} andere kandidaat(en) op dezelfde doelpagina`,
      `onderwerptermen van deze kandidaat: ${termen.slice(0, 6).join(", ") || "(geen)"}`,
      ...nieuwereOverHetzelfde.map(
        (n) =>
          `nieuwer EN zelfde onderwerp (${n.gedeeld.slice(0, 3).join(", ")}): ` +
          `${n.gebeurd_op?.slice(0, 10)} ${n.titel.slice(0, 54)}`,
      ),
    ];
    if (!k.gebeurd_op) {
      return { naam: "actualiteit", oordeel: "VOORBEHOUD", reden: "de bron heeft geen publicatiedatum", bewijs };
    }
    const dagen = Math.round((Date.parse(vandaag) - Date.parse(k.gebeurd_op)) / 86_400_000);
    if (nieuwereOverHetzelfde.length > 0) {
      const n = nieuwereOverHetzelfde[0]!;
      return {
        naam: "actualiteit",
        oordeel: "FAIL",
        reden:
          `achterhaald: '${n.titel.slice(0, 50)}' van ${n.gebeurd_op?.slice(0, 10)} gaat over hetzelfde ` +
          `onderwerp (gedeelde termen: ${n.gedeeld.slice(0, 3).join(", ")}) en is nieuwer. ` +
          `Deze bron is ${dagen} dagen oud`,
        bewijs,
      };
    }
    if (dagen > 365) {
      return {
        naam: "actualiteit",
        oordeel: "VOORBEHOUD",
        reden: `de bron is ${dagen} dagen oud, meer dan een jaar; bij tarieven is dat meer dan een jaarcyclus`,
        bewijs,
      };
    }
    return {
      naam: "actualiteit",
      oordeel: "PASS",
      reden: `de bron is ${dagen} dagen oud en er is niets nieuwers over hetzelfde onderwerp`,
      bewijs,
    };
  })();

  /* ---------- CONTROLE 3: duplicatie ---------- */
  const duplicatie: Controle = (() => {
    /* Duplicatie telt alleen kandidaten over HETZELFDE onderwerp; twee
       losse onderwerpen op een pagina is geen duplicatie. */
    const zelfdeOnderwerp = anderen.filter((a) => overlapt(a.titel).length >= 2);
    const aantal = zelfdeOnderwerp.length;
    const bewijs = [
      `${anderen.length} andere kandidaat(en) mikken op dezelfde pagina, ` +
        `waarvan ${aantal} over hetzelfde onderwerp`,
      `de pagina noemt de onderwerptermen (${termen.slice(0, 4).join(", ")}) ${noemt} keer`,
    ];
    if (aantal >= 3) {
      return {
        naam: "duplicatie",
        oordeel: "FAIL",
        reden:
          `${aantal + 1} kandidaten willen dezelfde pagina wijzigen over hetzelfde onderwerp. ` +
          `Dat hoort een voorstel te zijn, niet ${aantal + 1}; los doorvoeren levert een pagina ` +
          `met ${aantal + 1} losse alinea's over hetzelfde op`,
        bewijs,
      };
    }
    if (aantal > 0) {
      return {
        naam: "duplicatie",
        oordeel: "VOORBEHOUD",
        reden: `er zijn ${aantal} andere kandidaten over hetzelfde onderwerp; samenvoegen is waarschijnlijk beter`,
        bewijs,
      };
    }
    return { naam: "duplicatie", oordeel: "PASS", reden: "geen andere kandidaat voor deze pagina", bewijs };
  })();

  /* ---------- CONTROLE 4: SEO ---------- */
  const voorbehoud = bron?.direct_antwoord?.voorbehoud ?? null;
  const seo: Controle = (() => {
    const bewijs: string[] = [];
    if (!k.doel_pad) {
      return { naam: "seo", oordeel: "FAIL", reden: "er is geen doelpagina vastgesteld", bewijs };
    }
    bewijs.push(`doelpagina ${k.doel_pad}`);
    bewijs.push(
      k.cluster_canoniek === k.doel_pad
        ? `dit is de canonieke pagina van cluster '${k.cluster_sleutel}'`
        : `de canonieke pagina van cluster '${k.cluster_sleutel}' is ${k.cluster_canoniek ?? "(geen)"}`,
    );
    bewijs.push(`de pagina noemt het onderwerp ${noemt} keer`);
    if (!bron) {
      return {
        naam: "seo",
        oordeel: "VOORBEHOUD",
        reden: "de JSON-bron van deze pagina is niet gevonden; de pagina bestaat mogelijk alleen live",
        bewijs,
      };
    }
    /* DE SCHERPSTE TOETS: spreekt de pagina dit voorstel zelf tegen?

       EN ALLEEN DAN. De eerste versie liet elk voorbehoud met de
       strekking 'dat staat elders' elk voorstel afkeuren, en vrijwel
       elke Release 1-pagina heeft zo'n voorbehoud — dat is juist de
       kwaliteit van die pagina's. Daarmee keurde de controle 14 van de
       19 kandidaten af zonder naar de inhoud te kijken.

       Nu moet het SOORT feit dat het voorstel aandraagt overeenkomen met
       het soort feit dat de pagina wegwijst. Een tariefbedrag op een
       pagina die tarieven wegwijst: tegenspraak. Een congestiepercentage
       op diezelfde pagina: geen tegenspraak. */
    const draagtGeld = harde.some((u) => (u.eenheid ?? "").toUpperCase() === "EUR");
    const draagtRegeling = /subsidie|regeling|sde|mia|vamil|eia|isde/i.test(k.titel);
    const draagtTarief = /tarief|nettarieven|tariefstelsel/i.test(k.titel);

    const wijstGeldWeg = /tarievenblad|wat ze kosten|in rekening brengt/i.test(voorbehoud ?? "");
    const wijstRegelingWeg = /niet de stand van een regeling|stand van de regelingen/i.test(voorbehoud ?? "");

    const tegenspraak =
      (wijstGeldWeg && (draagtGeld || draagtTarief)) || (wijstRegelingWeg && draagtRegeling);

    if (voorbehoud && tegenspraak) {
      bewijs.push(`gepubliceerd voorbehoud: "${voorbehoud.slice(0, 180)}"`);
      bewijs.push(
        `dit voorstel draagt ${[draagtGeld && "bedragen", draagtTarief && "tariefinformatie", draagtRegeling && "regelingsstand"]
          .filter(Boolean)
          .join(" en ")}`,
      );
      return {
        naam: "seo",
        oordeel: "FAIL",
        reden:
          "de pagina wijst precies dit soort feiten in zijn eigen gepubliceerde voorbehoud weg. " +
          "Een wijziging die ze er toch op zet, vecht met de scope die de pagina aan de lezer belooft",
        bewijs,
      };
    }
    if (voorbehoud && /staat elders|staat hier niet|zegt niet/i.test(voorbehoud)) {
      bewijs.push(
        `de pagina heeft een scope-voorbehoud, maar het gaat niet over dit soort feit: ` +
          `"${voorbehoud.slice(0, 120)}"`,
      );
    }
    if (noemt === 0) {
      return {
        naam: "seo",
        oordeel: "FAIL",
        reden:
          "de pagina noemt het onderwerp nul keer. Een alinea erop zetten bouwt geen relevantie op " +
          "maar verwatert de bestaande zoekintentie van de pagina",
        bewijs,
      };
    }
    return { naam: "seo", oordeel: "PASS", reden: `de pagina bezit de intentie en noemt het onderwerp ${noemt} keer`, bewijs };
  })();

  const controles = [bronControle, actualiteit, duplicatie, seo];

  /* ---------- Het eindoordeel ---------- */
  const { eindoordeel, oordeelReden } = weegAf(controles, k);

  /* ---------- De voorgestelde wijziging ---------- */
  const waarden = harde
    .map((u) => `${Number(u.waarde_numeriek)}${u.eenheid === "EUR" ? " euro" : (u.eenheid ?? "")}`)
    .filter((v, i, a) => a.indexOf(v) === i);
  const sectieKop = bron?.secties?.find((s) => /kost|tarief|geld/i.test(s.kop ?? ""))?.kop ?? null;
  const nieuweTekst =
    harde.length === 0
      ? ""
      : `Per ${k.gebeurd_op?.slice(0, 10) ?? "onbekende datum"} meldt ${
          bronnen[0]?.uitgever ?? "de bron"
        }: ${waarden.join(", ")}. ` +
        `Wat dit voor uw aansluiting betekent hangt af van uw gecontracteerde vermogen; ` +
        `de posten zelf staan op het tarievenblad van uw netbeheerder.`;

  const diff: string[] = [];
  if (eindoordeel === "KLAAR_VOOR_REVIEW" && nieuweTekst) {
    diff.push(`--- ${k.doel_pad} (bron: data/inhoud/...)`);
    diff.push(`+++ voorstel kandidaat ${k.kandidaat_id}`);
    diff.push(`@@ sectie: ${sectieKop ?? "(nieuwe sectie)"} @@`);
    diff.push(`+ ${nieuweTekst}`);
  } else {
    diff.push(`(geen diff: eindoordeel ${eindoordeel} — ${oordeelReden})`);
  }

  return {
    kandidaatId: k.kandidaat_id,
    gebeurtenisId: k.gebeurtenis_id,
    titel: k.titel,
    brondatum: k.gebeurd_op,
    bedrijfsrelevantie: k.bedrijfsrelevantie,
    doelPad: k.doel_pad,
    bestaandePagina: {
      pad: k.doel_pad,
      h1: bron?.h1 ?? bron?.titel ?? null,
      lead: bron?.lead ?? null,
      gepubliceerdVoorbehoud: voorbehoud,
      secties: (bron?.secties ?? []).map((s) => s.kop ?? "(geen kop)"),
      noemtOnderwerp: noemt,
      bestaatAlsBron: bron !== null,
    },
    wijziging: {
      soort: eindoordeel === "KLAAR_VOOR_REVIEW" ? (sectieKop ? "alinea_toevoegen" : "sectie_toevoegen") : "geen",
      doelSectie: sectieKop,
      nieuweTekst,
      diff,
    },
    onderbouwing: {
      uitspraken: uitspraken.map((u) => ({
        soort: u.soort,
        waarde: u.waarde_numeriek,
        eenheid: u.eenheid,
        status: u.verificatie_status,
      })),
      bronnen: bronnen.map((b) => ({ uitgever: b.uitgever, url: b.canonieke_url, op: b.gepubliceerd_op })),
    },
    cta: {
      /* De CTA volgt het ONDERWERP. Een congestievoorstel met een CTA
         over tariefposities leest als een standaardregel en ondermijnt
         de geloofwaardigheid van het voorstel. */
      tekst: onderwerpSleutels.includes("netcongestie")
        ? "Laat uw netbeperking en congestiepositie in kaart brengen"
        : onderwerpSleutels.includes("bess") || onderwerpSleutels.includes("flexibiliteit")
          ? "Laat de businesscase voor opslag en flexibiliteit doorrekenen"
          : onderwerpSleutels.includes("subsidie")
            ? "Laat toetsen welke regelingen op uw investering van toepassing zijn"
            : onderwerpSleutels.includes("laadinfrastructuur")
              ? "Laat uw laadbehoefte tegen de beschikbare aansluiting doorrekenen"
              : "Laat uw transportvermogen en tariefpositie doorrekenen",
      doel: "/contact",
      grondslag:
        "De CTA verwijst naar een eigen pagina en belooft een doorrekening, geen uitkomst. " +
        "Er wordt niemand benaderd: de bezoeker neemt zelf het initiatief.",
    },
    controles,
    eindoordeel,
    oordeelReden,
  };
}

/**
 * Van vier controles naar een besluit.
 *
 * DE VOLGORDE IS BEWUST. Een voorstel dat op de verkeerde pagina staat
 * moet HERROUTEREN heten en niet AFWIJZEN: het feit kan prima kloppen.
 * Een verouderd feit moet UITSTELLEN of AFWIJZEN heten, want herrouteren
 * helpt niet. Zo zegt het oordeel zelf wat de volgende stap is.
 */
function weegAf(
  controles: readonly Controle[],
  k: { risico_klasse: string; bedrijfsrelevantie: number | null },
): { eindoordeel: Eindoordeel; oordeelReden: string } {
  const faal = (naam: Controle["naam"]) => controles.find((x) => x.naam === naam && x.oordeel === "FAIL");

  const bron = faal("bronverwijzing");
  if (bron) return { eindoordeel: "AFWIJZEN", oordeelReden: bron.reden };

  const act = faal("actualiteit");
  if (act) return { eindoordeel: "AFWIJZEN", oordeelReden: act.reden };

  const seoFaal = faal("seo");
  if (seoFaal) return { eindoordeel: "HERROUTEREN", oordeelReden: seoFaal.reden };

  const dup = faal("duplicatie");
  if (dup) return { eindoordeel: "UITSTELLEN", oordeelReden: dup.reden };

  const voorbehouden = controles.filter((x) => x.oordeel === "VOORBEHOUD");
  if (voorbehouden.length >= 2) {
    return {
      eindoordeel: "UITSTELLEN",
      oordeelReden: `twee of meer controles met voorbehoud: ${voorbehouden.map((v) => v.naam).join(", ")}`,
    };
  }
  if ((k.bedrijfsrelevantie ?? 0) < 25) {
    return {
      eindoordeel: "UITSTELLEN",
      oordeelReden:
        `bedrijfsrelevantie ${k.bedrijfsrelevantie ?? 0} is te laag om redactietijd te vragen; ` +
        `de controles zijn wel gehaald`,
    };
  }
  return {
    eindoordeel: "KLAAR_VOOR_REVIEW",
    oordeelReden:
      `alle vier de controles gehaald${voorbehouden.length ? ` (1 voorbehoud: ${voorbehouden[0]!.naam})` : ""}. ` +
      `Risicoklasse ${k.risico_klasse}: een mens voert de wijziging door, het platform schrijft niets.`,
  };
}

/** Bouwt voorstellen voor alle kandidaten met een doelpagina. */
export async function bouwVoorstellen(
  c: pg.PoolClient,
  repoWortel: string,
  kandidaatIds: readonly number[],
): Promise<Voorstel[]> {
  const uit: Voorstel[] = [];
  for (const id of kandidaatIds) {
    try {
      const v = await bouwVoorstel(c, repoWortel, id);
      if (v) uit.push(v);
    } catch (e) {
      log.fout("voorstel bouwen mislukt", { kandidaat: id, fout: e });
    }
  }
  return uit;
}

/* ------------------------------------------------------------------
   Vastleggen zodat een mens het kan beoordelen
   ------------------------------------------------------------------ */

/**
 * Schrijft een voorstel weg, inclusief de vier controles.
 *
 * Raakt een bestaande MENSELIJKE beoordeling nooit aan: zodra iemand
 * heeft gekeken, blijft dat staan en worden alleen de meetwaarden
 * bijgewerkt. Een pijplijn die het oordeel van een reviewer overschrijft
 * maakt het dashboard onbetrouwbaar.
 */
export async function bewaarVoorstel(
  c: pg.PoolClient,
  organisatieId: number,
  v: Voorstel,
): Promise<{ id: string; wat: "nieuw" | "bijgewerkt" }> {
  const r = await eenRij<{ id: string; was_nieuw: boolean }>(
    c,
    `insert into intel.inhoud_voorstellen
       (organisatie_id, kandidaat_id, gebeurtenis_id, doel_pad, doel_h1, doel_voorbehoud,
        doel_noemt_onderwerp, wijziging_soort, doel_sectie, nieuwe_tekst, diff,
        cta_tekst, cta_doel, cta_grondslag, eindoordeel, oordeel_reden)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     on conflict (organisatie_id, kandidaat_id) do update set
       doel_pad             = excluded.doel_pad,
       doel_h1              = excluded.doel_h1,
       doel_voorbehoud      = excluded.doel_voorbehoud,
       doel_noemt_onderwerp = excluded.doel_noemt_onderwerp,
       wijziging_soort      = excluded.wijziging_soort,
       doel_sectie          = excluded.doel_sectie,
       nieuwe_tekst         = excluded.nieuwe_tekst,
       diff                 = excluded.diff,
       cta_tekst            = excluded.cta_tekst,
       cta_doel             = excluded.cta_doel,
       cta_grondslag        = excluded.cta_grondslag,
       eindoordeel          = excluded.eindoordeel,
       oordeel_reden        = excluded.oordeel_reden
     returning id::text, (xmax = 0) as was_nieuw`,
    [
      organisatieId,
      v.kandidaatId,
      v.gebeurtenisId,
      v.doelPad,
      v.bestaandePagina.h1,
      v.bestaandePagina.gepubliceerdVoorbehoud,
      v.bestaandePagina.noemtOnderwerp,
      v.wijziging.soort,
      v.wijziging.doelSectie,
      v.wijziging.nieuweTekst || null,
      v.wijziging.diff,
      v.cta.tekst,
      v.cta.doel,
      v.cta.grondslag,
      v.eindoordeel,
      v.oordeelReden,
    ],
  );
  if (!r) throw new Error("voorstel kon niet worden weggeschreven");

  for (const ct of v.controles) {
    await c.query(
      `insert into intel.inhoud_voorstel_controles
         (voorstel_id, organisatie_id, naam, oordeel, reden, bewijs)
       values ($1,$2,$3,$4,$5,$6)
       on conflict (voorstel_id, naam) do update set
         oordeel = excluded.oordeel, reden = excluded.reden, bewijs = excluded.bewijs`,
      [r.id, organisatieId, ct.naam, ct.oordeel, ct.reden, ct.bewijs],
    );
  }
  return { id: r.id, wat: r.was_nieuw ? "nieuw" : "bijgewerkt" };
}
