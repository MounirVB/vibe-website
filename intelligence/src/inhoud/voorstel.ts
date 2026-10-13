/* ============================================================
   WIJZIGINGSVOORSTEL — bestaande pagina, voorgestelde wijziging,
   onderbouwing, CTA, en vijf controles die het kunnen afkeuren
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

   DE VIJF CONTROLES

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

import { createHash } from "node:crypto";
import { join } from "node:path";
import type pg from "pg";
import { eenRij, metOrganisatie, rijen, type Pool } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import { herkenOnderwerpen } from "../pijplijn/onderwerpen.ts";
import { vindSchaalverlies } from "../pijplijn/schaalcorrectie.ts";
import { paginaVan, type KennisPagina, type SitekennisBestand } from "../site/sitekennis.ts";
import { FENOMEEN_ZINSVORM } from "../pijplijn/verwoord.ts";
import { bouwNieuwePaginaVoorstel, type NieuwePaginaVoorstel } from "./nieuwepagina.ts";

const log = maakLogger("voorstel");

export type Oordeel = "PASS" | "VOORBEHOUD" | "FAIL";

export type Controle = {
  readonly naam: "bronverwijzing" | "actualiteit" | "duplicatie" | "seo" | "verwoordbaarheid";
  readonly oordeel: Oordeel;
  readonly reden: string;
  readonly bewijs: readonly string[];
};

export type Eindoordeel =
  | "KLAAR_VOOR_REVIEW"
  /* NIEUW IN 3.0.4. Een linkvoorstel is GEEN feitelijke paginarevisie en
     hoort dus niet in dezelfde staat te wachten. Tot 3.0.4 kreeg een
     voorstel waarvan het feit NIET te verwoorden was alsnog
     KLAAR_VOOR_REVIEW zodra er een interne-linkkans was, en kwam het
     daarmee in de studio naast een echte revisie te staan — onder een
     kop die beloofde dat alle vijf de controles waren gehaald. */
  | "KLAAR_VOOR_LINKREVIEW"
  /* NIEUW IN 3.0.6. Geen bestaande pagina dekt dit onderwerp, en er IS
     iets te schrijven. HERROUTEREN zou hier "hoort op een andere
     pagina" zeggen zonder te kunnen zeggen welke — een doodlopend
     antwoord. Dit is een VOORSTEL voor een nieuwe pagina; zie
     inhoud/nieuwepagina.ts en migratie 0035. */
  | "NIEUWE_PAGINA"
  | "NEEDS_RESEARCH"
  | "HERROUTEREN"
  | "UITSTELLEN"
  | "AFWIJZEN";

export const EINDOORDEEL_LABEL: Record<Eindoordeel, string> = {
  KLAAR_VOOR_REVIEW: "Klaar voor beoordeling",
  KLAAR_VOOR_LINKREVIEW: "Linkvoorstel, klaar voor beoordeling",
  NIEUWE_PAGINA: "Voorstel voor een NIEUWE pagina, klaar voor beoordeling",
  NEEDS_RESEARCH: "Feit moet eerst worden uitgezocht",
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
    readonly soort: "alinea_toevoegen" | "sectie_toevoegen" | "interne_link" | "geen";
    readonly doelSectie: string | null;
    /** De huidige tekst van de doelsectie, als 'voor'. */
    readonly huidigeTekst: string;
    readonly nieuweTekst: string;
    readonly diff: readonly string[];
  };
  /**
   * Interne links die dit voorstel zou toevoegen.
   *
   * Komen uit het sitekennis-artefact: pagina's die een onderwerp met
   * deze gebeurtenis delen en waar de doelpagina nog NIET naar linkt.
   * Zo is de aanbeveling navraagbaar in plaats van een losse mening.
   */
  readonly aanbevolenInterneLinks: readonly {
    readonly route: string;
    readonly titel: string | null;
    readonly reden: string;
  }[];
  readonly onderbouwing: {
    readonly uitspraken: readonly Uitspraak[];
    readonly bronnen: readonly { readonly uitgever: string; readonly url: string; readonly op: string | null }[];
  };
  readonly cta: { readonly tekst: string; readonly doel: string; readonly grondslag: string };
  /**
   * De feiten die in de voorgestelde tekst staan, elk met zijn bron.
   * Par. 11 eist een claim-to-source mapping; zonder die koppeling is
   * een alinea niet na te rekenen.
   */
  readonly feiten: readonly {
    readonly zin: string;
    readonly uitdrukking: string | null;
    readonly fenomeen: string | null;
    readonly tijdgrens: string | null;
    readonly exactheid: string | null;
    readonly uitgever: string | null;
    readonly brondatum: string | null;
    readonly bronUrl: string | null;
  }[];
  /** Waarom dit een Nederlandse ondernemer aangaat. */
  readonly zakelijkeRelevantie: string;
  /** Waarom deze pagina hier beter van wordt. */
  readonly seoRelevantie: string;
  /** Wat de reviewer moet weten voordat hij beslist. */
  readonly reviewerNotities: readonly string[];
  /** Hoe zeker is dit voorstel? */
  readonly risicoklasse: "laag" | "midden" | "hoog";
  /** sha256 over de inhoud waaraan een goedkeuring zich bindt. */
  readonly inhoudsHash: string;
  /**
   * Als het voorstel naar een ANDERE pagina is verplaatst dan de
   * besluitmotor koos: welke, en waarom.
   *
   * Par. 7 vraagt dat relevante feiten aan bestaande pagina's worden
   * gekoppeld. 'Hoort op een andere pagina' zonder te zeggen welke is
   * een doodlopend antwoord; de reviewer moet dan zelf zoeken.
   */
  readonly herrouteerdVan: { readonly pad: string; readonly reden: string } | null;
  /**
   * Het voorstel voor een NIEUWE pagina, als geen bestaande pagina het
   * onderwerp dekt. Null in alle andere gevallen.
   */
  readonly nieuwePagina: NieuwePaginaVoorstel | null;
  readonly controles: readonly Controle[];
  readonly eindoordeel: Eindoordeel;
  readonly oordeelReden: string;
};

/* ------------------------------------------------------------------
   De bestaande pagina lezen uit de GEGENEREERDE BRON, niet uit de HTML
   ------------------------------------------------------------------ */

/**
 * De bestaande pagina, zoals de intelligencelaag hem kent.
 *
 * DIT KWAM EERST UIT data/inhoud/<type>/<slug>.json, en dat was precies
 * de reden dat deze laag in productie niet werkte: die map zit niet in
 * de container (rootDirectory=intelligence). De voorstellen vielen
 * daardoor terug op "JSON-bron niet gevonden" en kregen een voorbehoud
 * dat niets zei.
 *
 * Nu komt het uit het sitekennis-artefact, dat wel meereist. Het
 * artefact draagt precies de velden die deze laag gebruikt: titel, h1,
 * tekst, voorbehoud, sectiekoppen, onderwerpen en interne links.
 */
export type PaginaBron = {
  readonly h1: string | null;
  readonly titel: string | null;
  readonly tekst: string;
  readonly voorbehoud: string | null;
  readonly sectiekoppen: readonly string[];
  readonly secties: readonly { readonly kop: string; readonly tekst: string }[];
  readonly interneLinks: readonly string[];
  readonly onderwerpen: readonly string[];
  readonly oplossingen: readonly string[];
  readonly woorden: number;
  readonly vingerafdruk: string;
  readonly termfrequenties: Readonly<Record<string, number>>;
};

function alsPaginaBron(p: KennisPagina): PaginaBron {
  return {
    h1: p.h1,
    titel: p.titel,
    tekst: p.tekst,
    voorbehoud: p.voorbehoud,
    sectiekoppen: p.sectiekoppen,
    secties: p.secties,
    interneLinks: p.interneLinks,
    onderwerpen: p.onderwerpen,
    oplossingen: p.oplossingen,
    termfrequenties: p.termfrequenties,
    woorden: p.woorden,
    vingerafdruk: p.vingerafdruk,
  };
}

/** Hoe vaak noemt de pagina dit onderwerp? Nul is een signaal. */
/**
 * Een getal leesbaar maken.
 *
 * `200000000000 euro` is geen tekst die een mens leest, en al helemaal
 * geen tekst die op een pagina hoort. Dit is voor het BEWIJS dat de
 * reviewer ziet; de voorgestelde paginatekst draagt geen kale getallen
 * (zie de controle `verwoordbaarheid`).
 */
export function leesbaarBedrag(waarde: number, eenheid: string | null): string {
  const e = (eenheid ?? "").toUpperCase();
  /* '\u20ac200 miljard', zonder spatie: dezelfde vorm als de verwoorder
     gebruikt en als par. 8 voorschrijft. */
  const teken = e === "EUR" ? "\u20ac" : "";
  const staart = e === "EUR" ? "" : eenheid ? ` ${eenheid}` : "";
  if (Math.abs(waarde) >= 1_000_000_000) return `${teken}${waarde / 1_000_000_000} miljard${staart}`;
  if (Math.abs(waarde) >= 1_000_000) return `${teken}${waarde / 1_000_000} miljoen${staart}`;
  if (Math.abs(waarde) >= 1_000) return `${teken}${waarde.toLocaleString("nl-NL")}${staart}`;
  return `${teken}${waarde}${staart}`;
}

/**
 * Hoe vaak noemt de pagina dit onderwerp? Nul is een signaal.
 *
 * Eerst de termfrequentie-index van de sitekennis, want die is geteld
 * over de VOLLEDIGE pagina. De opgeslagen `tekst` is afgekapt op 1500
 * tekens en `secties[].tekst` op 500: tellen in die tekst gaf nul voor
 * pagina's die het woord verderop vijf keer noemen, en daarop werden
 * feiten afgewezen. Staat een term niet in het vocabulaire — en dus
 * niet in de index — dan valt deze functie terug op de opgeslagen
 * tekst; dat is dan een ondergrens en geen volledige telling.
 */
/**
 * De termen waarmee wordt gemeten of een pagina een onderwerp dekt.
 *
 * HET DEFECT DAT DIT OPLOST — gemeten op 13 oktober 2026.
 *
 * Er waren TWEE plekken die deze vraag stelden, met twee verschillende
 * termensets. De SEO-poort mat met de termen uit de gebeurtenisTITEL;
 * de herroutering gebruikte sinds 3.0.3 een bredere set met het
 * fenomeen erbij. Dat verschil is in 3.0.3 bewust ingevoerd voor de
 * herroutering, maar de poort zelf is nooit meegegaan.
 *
 * Het gevolg, met harde getallen:
 *
 *   gebeurtenis "Nettarieven 2027 stijgen ..."
 *     termen uit de titel  ["nettarieven"]        -> 0 vermeldingen
 *     clustersleutel       netbeheer (tf = 24)    -> 24 vermeldingen
 *
 *   gebeurtenis "Zo werkt het: de wachtlijst voor netcapaciteit"
 *     termen uit de titel  ["netcapaciteit", ...] -> 0 vermeldingen
 *     clustersleutel       netcongestie (tf = 14) -> 14 vermeldingen
 *
 * /kennis/netcongestie-uitgelegd heet "Netcongestie technisch
 * uitgelegd", draagt netcongestie in zijn eigen onderwerpenlijst en
 * noemt de term 14 keer — en de poort concludeerde dat de pagina het
 * onderwerp NUL keer noemt, omdat de titel van het nieuwsbericht
 * "netcapaciteit" zei. Dat is geen redactioneel oordeel maar een
 * meetfout.
 *
 * EN DE CLUSTERSLEUTEL ALLEEN ALS DE PAGINA HEM ZELF DRAAGT.
 *
 * Dat is geen voorzichtigheid maar een gemeten noodzaak. Een eerste
 * versie nam de clustersleutel onvoorwaardelijk mee, en de A/B-meting
 * (npm run dekkingsmeting) liet zien wat dat doet:
 *
 *   hersteld        4   netcongestie -> /kennis/netcongestie-uitgelegd (3x)
 *                       subsidie     -> /subsidies
 *   VALS POSITIEF   9   netbeheer    -> /kennis/transportvermogen-versus-aansluitwaarde
 *
 * Die negen gaan over NETTARIEVEN. Ze zijn geclusterd onder het grove
 * `netbeheer`, en de doelpagina noemt dat woord 24 keer — maar gaat over
 * transportvermogen tegen aansluitwaarde en behandelt geen enkel
 * tariefstelsel. De clustersleutel is daar een slechte proxy voor het
 * werkelijke onderwerp, en een hoge telling mag tegenstrijdig
 * onderwerpbewijs niet overstemmen.
 *
 * Daarom moeten TWEE onafhankelijke signalen het eens zijn: de
 * termfrequentie-index van de pagina EN de onderwerpenlijst die
 * site/sitekennis.ts uit de paginatekst afleidt. Draagt de pagina het
 * cluster niet, dan telt de sleutel niet mee en blijft het voorstel
 * geblokkeerd — waar het als NEW_PAGE_CANDIDATE thuishoort, want voor
 * nettarieven bestaat geen pagina.
 *
 * Een pagina met een LEGE onderwerpenlijst krijgt dus geen krediet. Dat
 * is de veilige kant: 371 van de 430 pagina's hebben die lijst leeg, en
 * een leeg veld betekent "niets herkend", niet "dekt alles".
 *
 * ÉÉN functie, twee gebruikers, zodat ze niet opnieuw uiteen kunnen
 * lopen. Dat is de les van de pg_restore-regressie in 3.0.5.
 */
export function dekkingstermen(opties: {
  /** Termen uit de gebeurtenistitel, zonder herkomstprefix. */
  readonly titeltermen: readonly string[];
  /** De onderwerpclusters die de gebeurtenis draagt. */
  readonly onderwerpSleutels: readonly string[];
  /** Het fenomeen van de uitspraak, als dat bekend is. */
  readonly fenomeen?: string | null;
  /**
   * De onderwerpen die de DOELPAGINA zelf draagt, uit het artefact.
   *
   * Een clustersleutel telt alleen als dekkingsterm wanneer hij hierin
   * staat. Ontbreekt de lijst of is hij leeg, dan telt geen enkele
   * clustersleutel mee.
   */
  readonly paginaOnderwerpen?: readonly string[];
}): string[] {
  const fenomeenTermen = opties.fenomeen
    ? [
        opties.fenomeen,
        ...(FENOMEEN_ZINSVORM[opties.fenomeen] ?? "").split(/\s+/).filter((w) => w.length >= 5),
      ]
    : [];
  const draagt = new Set(opties.paginaOnderwerpen ?? []);
  const toegestaneClusters = opties.onderwerpSleutels.filter((c) => draagt.has(c));
  return [
    ...new Set([...opties.titeltermen, ...toegestaneClusters, ...fenomeenTermen]),
  ].filter((t) => t.length >= 4);
}

function noemtHoeVaak(bron: PaginaBron | null, termen: readonly string[]): number {
  if (!bron || termen.length === 0) return 0;
  const alles = `${bron.titel ?? ""} ${bron.h1 ?? ""} ${bron.sectiekoppen.join(" ")} ${bron.tekst} ${bron.secties
    .map((x) => x.tekst)
    .join(" ")}`.toLowerCase();
  let n = 0;
  for (const t of termen) {
    const schoon = t.toLowerCase().trim();
    if (schoon.length < 4) continue;
    const uitIndex = bron.termfrequenties[schoon];
    n += uitIndex !== undefined ? uitIndex : alles.split(schoon).length - 1;
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
  kennis: SitekennisBestand,
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
    onderwerp: string | null;
    verwoordbaar: string | null;
    verwoorde_zin: string | null;
    verwoordbaar_reden: string | null;
    fenomeen: string | null;
    subject: string | null;
    richting: string | null;
    grondtal: string | null;
    periode: string | null;
    horizon: string | null;
    exactheid: string | null;
    uitdrukking: string | null;
    schaalwoord: string | null;
    semantiek_herkomst: string | null;
    scope_waarschuwing: string | null;
  }>(
    c,
    /* DE SEMANTISCHE VELDEN HOREN HIER THUIS.
       ----------------------------------------------------------------
       Dit was de kern van het probleem. Release 3.0.2 bouwde een
       semantische laag die van een uitspraak een getrouwe Nederlandse
       zin maakt, en legde die zin op in `verwoorde_zin` met een oordeel
       in `verwoordbaar`. Deze query las die kolommen niet, en controle 5
       hieronder leidde zijn eigen oordeel af uit `soort` alleen — wat
       nooit kon slagen.

       Gevolg, gemeten in productie: twee uitspraken met een complete,
       geverifieerde Nederlandse zin in de database, en nul feitelijke
       paginavoorstellen. De zin lag er en niemand kwam hem halen. */
    `select soort, waarde_numeriek, eenheid, verificatie_status, tekst, onderwerp,
            verwoordbaar, verwoorde_zin, verwoordbaar_reden,
            fenomeen, subject, richting, grondtal, periode, horizon,
            exactheid, uitdrukking, schaalwoord, semantiek_herkomst, scope_waarschuwing
       from intel.uitspraken u
      where u.gebeurtenis_id = $1
        /* GERECTIFICEERDE UITSPRAKEN ZIJN GESCHIEDENIS.
           De correctieketen is append-only: de oude waarde blijft
           staan. Zou het voorstel die ook lezen, dan blijft de
           gecorrigeerde gebeurtenis afgewezen op de fout die net
           gerepareerd is. De oude rij blijft bestaan en navraagbaar;
           hij draagt alleen geen voorstel meer. */
        and not exists (
          select 1 from intel.uitspraak_correcties k
           where k.vervangen_id = u.id and k.soort = 'rectificatie')
      order by u.id`,
    [k.gebeurtenis_id],
  );

  const bronnen = await rijen<{
    uitgever: string;
    canonieke_url: string;
    gepubliceerd_op: string | null;
    mag_citeren: boolean;
  }>(
    c,
    `select d.uitgever, d.canonieke_url, d.gepubliceerd_op::text as gepubliceerd_op,
            b.mag_citeren
       from intel.gebeurtenis_documenten gd
       join intel.brondocumenten d on d.id = gd.brondocument_id
       join intel.bronnen b on b.id = d.bron_id
      where gd.gebeurtenis_id = $1`,
    [k.gebeurtenis_id],
  );
  /* Mag ELKE bron van deze gebeurtenis geciteerd worden? Eén die het
     verbiedt is genoeg om niet te citeren. */
  const bronMagCiteren = bronnen.length > 0 && bronnen.every((b) => b.mag_citeren);

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

  const kennisPagina = k.doel_pad ? paginaVan(kennis, k.doel_pad) : null;
  const bron = kennisPagina ? alsPaginaBron(kennisPagina) : null;
  /* DEZELFDE termenset als de herroutering; zie dekkingstermen(). Het
     fenomeen is hier nog niet bekend — dat komt uit de uitspraken die
     hieronder worden gewogen — dus de poort meet met de titeltermen EN
     de clustersleutels. Dat laatste is de reparatie. */
  const dekking = dekkingstermen({
    titeltermen: termen,
    onderwerpSleutels: onderwerpSleutels,
    paginaOnderwerpen: kennisPagina?.onderwerpen,
  });
  const noemt = noemtHoeVaak(bron, dekking);

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
    /* HET SCHAALWOORD NAAST HET GETAL, NIET ERGENS IN DE ZIN.
       De eerste versie zocht 'miljard' overal in de brontekst. Dat
       vlagt ook een percentage in een zin die verder over miljarden
       gaat — 'de netbeheerders investeren €200 miljard; het nettarief
       stijgt 8%' zou de 8 afkeuren. vindSchaalverlies() eist dat het
       schaalwoord direct naast DIT getal staat, en leest daarvoor
       alleen tekst en waarde: niet de velden die de ontleder zelf
       heeft geschreven. */
    const verlies = vindSchaalverlies(u.tekst, bewaard);
    if (verlies) {
      onrijmbaar.push(
        `bewaard ${bewaard}${u.eenheid ?? ""} terwijl de brontekst '${verlies.schaalwoord}' ` +
          `direct naast dat getal zet: "${verlies.vindplaats}"`,
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
        /* "GETAL OF DATUM" BELOOFDE MEER DAN DE CONTROLE EIST.
           `harde` filtert op `waarde_numeriek !== null` en kijkt niet naar
           een datumveld. Een uitspraak met alleen een geldigheidsdatum en
           geen getal viel dus af met de mededeling dat een getal OF een
           datum had volstaan. Wie daarop afgaat, zoekt een datum die al
           aanwezig was. De reden noemt nu waar de controle werkelijk op
           kijkt. */
        reden:
          "er is geen enkele numerieke waarde vastgelegd; een voorstel zonder getal voegt " +
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
  const voorbehoud = bron?.voorbehoud ?? null;
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

  /* ---------- CONTROLE 5: verwoordbaarheid ----------
     LEEST HET GEZAGHEBBENDE OORDEEL, leidt er geen tweede af.

     De vorige versie bepaalde hier zelf of een feit te verwoorden was,
     op grond van `soort` ('cijfer', 'prijs'). Dat kon per definitie niet
     slagen, en het negeerde de semantische laag die daar nu juist voor
     is. Twee oordelen over dezelfde vraag lopen altijd uiteen; er hoort
     er één te zijn, en dat is `intel.uitspraken.verwoordbaar`.

     Een uitspraak telt hier mee als hij VERWOORDBAAR is EN een
     opgeslagen zin heeft. Die twee samen zijn door migratie 0025 aan
     elkaar vastgelegd, dus het een zonder het ander kan niet bestaan —
     de controle vraagt het toch, want een poort die op een constraint
     vertrouwt zonder hem te toetsen is een aanname. */
  const verwoordbareUitspraken = uitspraken.filter(
    (u) => u.verwoordbaar === "VERWOORDBAAR" && (u.verwoorde_zin ?? "").trim().length > 0,
  );
  const verwoordbaarheid: Controle = (() => {
    const bewijs = uitspraken.map(
      (u) =>
        /* Zonder opgeslagen uitdrukking het getal LEESBAAR tonen, niet
           kaal. '3000000000' is voor een reviewer geen bedrag, en het
           is precies de vorm waarin de schaal eerder is zoekgeraakt. */
        `${u.uitdrukking ?? (u.waarde_numeriek === null ? "?" : leesbaarBedrag(Number(u.waarde_numeriek), u.eenheid))} — ` +
        `${u.verwoordbaar ?? "nog niet beoordeeld"}` +
        `${u.fenomeen ? ` (fenomeen '${u.fenomeen}')` : ""}`,
    );
    if (uitspraken.length === 0) {
      return { naam: "verwoordbaarheid", oordeel: "FAIL", reden: "er is geen uitspraak om te verwoorden", bewijs };
    }
    const nogNietBeoordeeld = uitspraken.filter((u) => u.verwoordbaar === null).length;
    if (verwoordbareUitspraken.length === 0) {
      /* De redenen van de semantische poort overnemen in plaats van een
         eigen formulering: die poort heeft gemeten waarom het niet kan. */
      const redenen = [
        ...new Set(
          uitspraken
            .filter((u) => u.verwoordbaar !== null && u.verwoordbaar !== "VERWOORDBAAR")
            .map((u) => `${u.verwoordbaar}: ${(u.verwoordbaar_reden ?? "").slice(0, 150)}`),
        ),
      ];
      return {
        naam: "verwoordbaarheid",
        oordeel: "FAIL",
        reden:
          nogNietBeoordeeld === uitspraken.length
            ? /* GEEN ONUITVOERBAAR ADVIES.
                 Hier stond "draai 'npm run semantiek'". Dat klopte niet:
                 de backfill WAS gedraaid, en deze uitspraken kregen
                 geen oordeel omdat er geen leesbare uitdrukking in zit —
                 alle 19 zijn datumuitspraken zonder getal. Een reviewer
                 die dat commando draait ziet niets veranderen en weet
                 nog steeds niet waarom. Het echte onderscheid staat
                 hieronder. */
              `geen van de ${uitspraken.length} uitspraak(en) heeft een semantisch oordeel. ` +
              (uitspraken.every((u) => u.waarde_numeriek === null)
                ? `Geen ervan draagt een getal, dus de semantische laag — die numerieke ` +
                  `uitdrukkingen leest — kan er geen grootheid uit halen. Dit vraagt onderzoek ` +
                  `(NEEDS_RESEARCH), geen herberekening.`
                : `Draai de semantiekbackfill; is die al gedraaid, dan kon er uit de brontekst ` +
                  `geen uitdrukking gelezen worden.`)
            : `geen van de ${uitspraken.length} uitspraak(en) is te verwoorden. ` +
              redenen.slice(0, 2).join(" | "),
        bewijs,
      };
    }
    return {
      naam: "verwoordbaarheid",
      oordeel: "PASS",
      reden:
        `${verwoordbareUitspraken.length} van ${uitspraken.length} uitspraak(en) is verwoordbaar, ` +
        `met een opgeslagen zin uit de semantische laag`,
      bewijs,
    };
  })();

  /* ---------- HERROUTEREN IN PLAATS VAN AFWIJZEN ----------
     Een verwoordbaar feit op de verkeerde pagina is geen afgekeurd
     feit; het is een feit dat ergens anders hoort. Vond de SEO-controle
     een tegenspraak met het voorbehoud van de pagina, dan zoeken we een
     pagina die dit feit WEL mag dragen — en bouwen het voorstel daar.

     De controle op de oorspronkelijke pagina blijft FAIL en zichtbaar:
     de reviewer hoort te zien dat de besluitmotor eerst elders mikte en
     waarom dat niet kon. */
  let herrouteerdVan: { pad: string; reden: string } | null = null;
  let effectieveBron = bron;
  let effectiefPad = k.doel_pad;
  let effectieveSeo = seo;
  let effectieveNoemt = noemt;

  if (seo.oordeel === "FAIL" && verwoordbareUitspraken.length > 0 && k.doel_pad) {
    const fenomeen = verwoordbareUitspraken[0]!.fenomeen;
    /* ZOEK OP HET FENOMEEN, NIET OP DE CLUSTERTERM.
       `termen` komt uit herkenOnderwerpen() op de gebeurtenistitel en
       levert de term zoals die in de TITEL stond: 'nettarieven'. Een
       pagina die vijf keer 'nettarief' schrijft, telt daarop nul. Het
       fenomeen van de uitspraak is wat het feit identificeert en staat
       in het enkelvoud, dus dat zijn de zoekwoorden: de sleutel zelf
       plus de woorden uit zijn zinsvorm. */
    /* Voor de ZOEKstap nemen we de clusters niet mee: welke pagina hem
       draagt is juist wat we zoeken. beterePagina() filtert per
       kandidaatpagina met haar eigen onderwerpenlijst. */
    const zoektermen = dekkingstermen({
      titeltermen: termen,
      onderwerpSleutels: [],
      fenomeen,
    });
    const alternatief = beterePagina(kennis, k.doel_pad, fenomeen, zoektermen, onderwerpSleutels);
    if (alternatief) {
      const altBron = alsPaginaBron(alternatief);
      const altNoemt = noemtHoeVaak(altBron, zoektermen);
      if (altNoemt > 0 && !wijstFeitWeg(altBron.voorbehoud, fenomeen)) {
        herrouteerdVan = {
          pad: k.doel_pad,
          reden:
            `de besluitmotor koos ${k.doel_pad} op grond van het onderwerpcluster, maar die pagina ` +
            `wijst dit soort feit weg in zijn eigen voorbehoud. ${alternatief.route} noemt het ` +
            `onderwerp ${altNoemt} keer en wijst niets weg, dus daar hoort dit feit.`,
        };
        effectieveBron = altBron;
        effectiefPad = alternatief.route;
        effectieveNoemt = altNoemt;
        effectieveSeo = {
          naam: "seo",
          oordeel: "PASS",
          reden:
            `herrouteerd naar ${alternatief.route}: die pagina noemt het onderwerp ${altNoemt} keer ` +
            `en wijst dit soort feit niet weg`,
          bewijs: [
            `oorspronkelijke doelpagina ${k.doel_pad}: ${seo.reden}`,
            `nieuwe doelpagina ${alternatief.route}: ${altNoemt} vermeldingen, geen tegenstrijdig voorbehoud`,
          ],
        };
      }
    }
  }

  const controles = [bronControle, actualiteit, duplicatie, effectieveSeo, verwoordbaarheid];


  /* ---------- Het eindoordeel ----------
     De linkkansen worden hier al bepaald, want ze kunnen het oordeel
     veranderen: een onverwoordbaar feit met linkkansen levert nog steeds
     een beoordeelbaar voorstel op. */
  const alGelinkt = new Set(effectieveBron?.interneLinks ?? []);
  const mijnOnderwerpen = new Set<string>(onderwerpSleutels);
  const aanbevolenInterneLinks = kennis.paginas
    .filter(
      (kp) =>
        kp.route !== effectiefPad &&
        !alGelinkt.has(kp.route) &&
        kp.onderwerpen.some((o) => mijnOnderwerpen.has(o)),
    )
    .slice(0, 5)
    .map((kp) => ({
      route: kp.route,
      titel: kp.titel,
      reden: `deelt onderwerp ${kp.onderwerpen.filter((o) => mijnOnderwerpen.has(o)).join(", ")}`,
    }));

  /* ---------- Geen passende pagina? Dan een VOORSTEL voor een nieuwe ----------
     Alleen wanneer alle drie waar zijn:
       · de seo-dekking faalt nog steeds, OOK na de herroutering
       · er is minstens één verwoordbaar feit, dus er is iets te schrijven
       · er is geen bestaande route met deze slug
     Anders blijft het HERROUTEREN of een ander oordeel. Een voorstel
     voor een pagina zonder feit zou een lege pagina voorstellen. */
  const bestaandeRoutes = new Set(kennis.paginas.map((kp) => kp.route));
  const nieuwePagina =
    effectieveSeo.oordeel === "FAIL" && verwoordbareUitspraken.length > 0
      ? bouwNieuwePaginaVoorstel({
          onderwerpSleutel: k.cluster_sleutel ?? onderwerpSleutels[0] ?? null,
          fenomeen: verwoordbareUitspraken[0]!.fenomeen,
          feitZinnen: verwoordbareUitspraken.map((u) => u.verwoorde_zin ?? "").filter(Boolean),
          naastgelegen: effectiefPad
            ? [{ route: effectiefPad, vermeldingen: effectieveNoemt }]
            : [],
          bestaandeRoutes,
        })
      : null;
  /* Bestaat de voorgestelde route al, dan is dit geen nieuwe pagina maar
     een wijziging, en hoort het oordeel HERROUTEREN te blijven. */
  const paginaVoorstel =
    nieuwePagina && !bestaandeRoutes.has(`/${nieuwePagina.slug}`) ? nieuwePagina : null;

  const { eindoordeel, oordeelReden } = weegAf(
    controles,
    k,
    aanbevolenInterneLinks.length,
    paginaVoorstel,
  );

  /* ---------- De voorgestelde wijziging ---------- */
  const waarden = harde
    .map((u) => leesbaarBedrag(Number(u.waarde_numeriek), u.eenheid))
    .filter((v, i, a) => a.indexOf(v) === i);
  /* De doelsectie komt van de EFFECTIEVE pagina; na een herroutering is
     dat een andere pagina met andere secties. */
  const sectieKop =
    effectieveBron?.sectiekoppen.find((kop) => /kost|tarief|geld|prijs|rendement|businesscase/i.test(kop)) ??
    effectieveBron?.sectiekoppen[0] ??
    null;
  const feitVerwoordbaar =
    controles.find((x) => x.naam === "verwoordbaarheid")?.oordeel === "PASS";

  /* DE WIJZIGINGSSOORT EN DE CTA ALS WAARDEN, NIET INLINE.
     Ze stonden als expressie in het geretourneerde object. Dat werkte,
     tot de inhoudshash ze ook moest dekken: dan heb je ze twee keer
     nodig, en een tweede exemplaar is een plek waar ze uiteen kunnen
     lopen. Dan keurt iemand een CTA goed en publiceert het platform een
     andere. Eén waarde, twee gebruikers. */
  const wijzigingSoort =
    eindoordeel === "KLAAR_VOOR_REVIEW"
      ? sectieKop
        ? "alinea_toevoegen"
        : "sectie_toevoegen"
      : eindoordeel === "KLAAR_VOOR_LINKREVIEW"
        ? "interne_link"
        : "geen";
  /* feitVerwoordbaar bepaalde hier eerder de soort. Sinds 3.0.4 bepaalt
     het EINDOORDEEL hem, en dat oordeel volgt al uit dezelfde controle:
     KLAAR_VOOR_REVIEW kan niet bestaan met een gefaalde verwoordbaarheid.
     De variabele blijft als assertie dat die twee niet uiteenlopen. */
  if (eindoordeel === "KLAAR_VOOR_REVIEW" && !feitVerwoordbaar) {
    throw new Error(
      "interne inconsistentie: KLAAR_VOOR_REVIEW met een gefaalde verwoordbaarheid; " +
        "weegAf en de wijzigingssoort lopen uiteen",
    );
  }

  const CTA_DOEL = "/contact";
  /* De CTA volgt het ONDERWERP. Een congestievoorstel met een CTA over
     tariefposities leest als een standaardregel en ondermijnt de
     geloofwaardigheid van het voorstel. */
  const ctaTekst = onderwerpSleutels.includes("netcongestie")
    ? "Laat uw netbeperking en congestiepositie in kaart brengen"
    : onderwerpSleutels.includes("bess") || onderwerpSleutels.includes("flexibiliteit")
      ? "Laat de businesscase voor opslag en flexibiliteit doorrekenen"
      : onderwerpSleutels.includes("subsidie")
        ? "Laat toetsen welke regelingen op uw investering van toepassing zijn"
        : onderwerpSleutels.includes("laadinfrastructuur")
          ? "Laat uw laadbehoefte tegen de beschikbare aansluiting doorrekenen"
          : "Laat uw transportvermogen en tariefpositie doorrekenen";

  /* DE VOORGESTELDE TEKST.
     Alleen een feitelijke alinea als het feit ECHT te verwoorden is uit
     eigen velden. Anders een linkvoorstel, dat niets beweert. */
  /* ---------- DE VOORGESTELDE TEKST ----------
     Uit de OPGESLAGEN zinnen van de semantische laag, niet uit een
     eigen formulering. Die zinnen zijn door tien controles gegaan, zijn
     opgebouwd uit ons eigen vocabulaire en dragen hun tijdgrens.

     De vorige versie plakte hier zelf iets in elkaar ("Per <datum> is
     vastgelegd: <waarden>"), en dat was precies het soort zin waar deze
     hele release over gaat. */
  const feiten = verwoordbareUitspraken.map((u) => ({
    zin: (u.verwoorde_zin ?? "").trim(),
    uitdrukking: u.uitdrukking,
    fenomeen: u.fenomeen,
    tijdgrens: u.horizon ?? u.periode,
    exactheid: u.exactheid,
    uitgever: bronnen[0]?.uitgever ?? null,
    brondatum: bronnen[0]?.gepubliceerd_op?.slice(0, 10) ?? null,
    bronUrl: bronnen[0]?.canonieke_url ?? null,
  }));

  const nieuweTekst = feitVerwoordbaar
    ? feiten.map((f) => f.zin).join(" ")
    : aanbevolenInterneLinks.length > 0
      ? `Verwijs vanuit deze sectie naar ${aanbevolenInterneLinks
          .slice(0, 2)
          .map((l) => l.route)
          .join(" en ")}; die pagina('s) behandelen hetzelfde onderwerp en worden hier nog niet genoemd.`
      : "";

  /* DE 'VOOR'-TEKST: wat er nu in de doelsectie staat. Zonder dit kan
     een reviewer niet zien wat er verandert, en par. 8 eist juist dat
     hij dat ziet. */
  const huidigeTekst = (() => {
    const bron = effectieveBron;
    if (!bron) return "";
    /* De tekst van de GEKOZEN sectie, uit het artefact. Niet de opening
       van de pagina: dat zou de reviewer de verkeerde vergelijking
       voorschotelen. */
    const sectie = sectieKop ? bron.secties.find((x) => x.kop === sectieKop) : null;
    if (sectie) return sectie.tekst;
    return bron.secties[0]?.tekst ?? bron.tekst.slice(0, 600);
  })();

  const diff: string[] = [];
  if (eindoordeel === "KLAAR_VOOR_REVIEW" && nieuweTekst) {
    diff.push(`--- ${effectiefPad} (huidige tekst uit sitekennis ${kennis.websiteVersie.slice(0, 8)})`);
    diff.push(`+++ voorstel kandidaat ${k.kandidaat_id}`);
    diff.push(`@@ sectie: ${sectieKop ?? "(nieuwe sectie)"} @@`);
    for (const r of huidigeTekst.slice(0, 400).split(/(?<=\.)\s+/).filter(Boolean).slice(0, 3)) {
      diff.push(`  ${r}`);
    }
    diff.push(`+ ${nieuweTekst}`);
    for (const l of aanbevolenInterneLinks.slice(0, 2)) {
      diff.push(`+ (interne link) ${l.route} — ${l.reden}`);
    }
  } else {
    diff.push(`(geen diff: eindoordeel ${eindoordeel} — ${oordeelReden})`);
  }

  return {
    kandidaatId: k.kandidaat_id,
    gebeurtenisId: k.gebeurtenis_id,
    titel: k.titel,
    brondatum: k.gebeurd_op,
    bedrijfsrelevantie: k.bedrijfsrelevantie,
    doelPad: effectiefPad,
    bestaandePagina: {
      pad: effectiefPad,
      h1: effectieveBron?.h1 ?? effectieveBron?.titel ?? null,
      lead: null,
      gepubliceerdVoorbehoud: effectieveBron?.voorbehoud ?? null,
      secties: effectieveBron?.sectiekoppen ?? [],
      noemtOnderwerp: effectieveNoemt,
      bestaatAlsBron: effectieveBron !== null,
    },
    wijziging: {
      soort: wijzigingSoort,
      doelSectie: sectieKop,
      huidigeTekst,
      nieuweTekst,
      diff,
    },
    aanbevolenInterneLinks,
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
      tekst: ctaTekst,
      doel: CTA_DOEL,
      grondslag:
        "De CTA verwijst naar een eigen pagina en belooft een doorrekening, geen uitkomst. " +
        "Er wordt niemand benaderd: de bezoeker neemt zelf het initiatief.",
    },
    controles,
    eindoordeel,
    oordeelReden,
    feiten,
    zakelijkeRelevantie: zakelijkeRelevantieVan(
      onderwerpSleutels,
      oplossingenVan(onderwerpSleutels),
      feiten,
    ),
    seoRelevantie:
      effectieveNoemt > 0
        ? `De pagina bezit deze zoekintentie al: hij noemt het onderwerp ${effectieveNoemt} keer en is de ` +
          `canonieke pagina van cluster '${k.cluster_sleutel}'. Een feit toevoegen versterkt een ` +
          `bestaande pagina in plaats van een concurrerende URL te maken.`
        : `De pagina noemt het onderwerp niet; een toevoeging zou de bestaande zoekintentie ` +
          `verwateren in plaats van versterken.`,
    reviewerNotities: reviewerNotitiesVan(k, feiten, effectieveBron, aanbevolenInterneLinks.length),
    risicoklasse:
      k.risico_klasse === "hoog" ? "hoog" : feiten.length === 0 ? "midden" : (k.risico_klasse as "laag" | "midden"),
    herrouteerdVan,
    /* Alleen meesturen als het oordeel er ook om vraagt; de
       databaseconstraint uit 0035 eist dat die twee kloppen. */
    nieuwePagina: eindoordeel === "NIEUWE_PAGINA" ? paginaVoorstel : null,
    inhoudsHash: inhoudsHashVan({
      doelPad: effectiefPad,
      doelSectie: sectieKop,
      nieuweTekst,
      feiten: feiten.map((f) => f.zin),
      links: aanbevolenInterneLinks.map((l) => l.route),
      ctaTekst,
      ctaDoel: CTA_DOEL,
      wijzigingSoort,
    }),
  };
}

/**
 * Zoekt een pagina die dit feit WEL mag dragen.
 *
 * Voorwaarden, in deze orde:
 *   1. de pagina noemt de termen van het fenomeen echt (niet nul);
 *   2. de pagina wijst dit soort feit niet weg in zijn eigen voorbehoud;
 *   3. de pagina is gepubliceerd — dat is in het artefact al afgedwongen.
 *
 * Gemeten voorbeeld: een nettariefdaling werd toegewezen aan
 * /kennis/transportvermogen-versus-aansluitwaarde, een pagina die in zijn
 * voorbehoud zegt dat tarieven op het tarievenblad van de netbeheerder
 * staan. /kennis/businesscase-batterij noemt 'nettarief' vijf keer en
 * wijst niets weg — daar hoort het feit, en daar is het ook commercieel
 * relevant omdat een batterijbusinesscase op tarieven draait.
 */
function beterePagina(
  kennis: SitekennisBestand,
  huidigPad: string | null,
  fenomeen: string | null,
  termen: readonly string[],
  onderwerpSleutels: readonly string[],
): KennisPagina | null {
  if (termen.length === 0) return null;
  const zoek = termen.filter((t) => t.length >= 4).map((t) => t.toLowerCase());
  if (zoek.length === 0) return null;

  const gewogen = kennis.paginas
    .filter((p) => p.route !== huidigPad)
    .map((p) => {
      /* Dezelfde teller als de SEO-meting. Liepen die uiteen, dan koos
         de zoeker een pagina die de meter daarna op nul zette en werd
         er niets geherrouteerd — precies wat er gebeurde. */
      return { p, n: noemtHoeVaak(alsPaginaBron(p), zoek) };
    })
    .filter((x) => x.n > 0)
    /* Een pagina die dit soort feit wegwijst is geen alternatief. */
    .filter((x) => !wijstFeitWeg(x.p.voorbehoud, fenomeen))
    .sort((a, b) => {
      /* Vermeldingen eerst: een pagina die het woord vaker gebruikt gaat
         er inhoudelijk vaker over.

         Daarna de CLUSTEROVERLAP, en dat is geen cosmetica. Gemeten op
         kandidaat 17: drie pagina's noemden 'nettarief' of
         'nettarieven' precies één keer. Zonder deze afweging won
         /kennis/batterij-dimensioneren op alfabet — een pagina over
         MAATVOERING, die het woord één keer langs de zijlijn noemt.
         /kennis/peak-shaving en /kennis/businesscase-batterij staan
         beide in cluster 'netbeheer' en gaan er wel over. Gelijke
         vermeldingen zeggen dus niets; het cluster wel.

         Route als laatste, zodat de uitkomst reproduceerbaar is en niet
         van de scanvolgorde afhangt. */
      if (b.n !== a.n) return b.n - a.n;
      const overlap = (x: { p: KennisPagina }) =>
        x.p.onderwerpen.filter((o) => onderwerpSleutels.includes(o)).length;
      const d = overlap(b) - overlap(a);
      if (d !== 0) return d;
      return a.p.route.localeCompare(b.p.route);
    });

  return gewogen[0]?.p ?? null;
}

/** Wijst het voorbehoud van een pagina dit soort feit weg? */
function wijstFeitWeg(voorbehoud: string | null, fenomeen: string | null): boolean {
  if (!voorbehoud) return false;
  const geld = /tarievenblad|wat ze kosten|in rekening brengt/i.test(voorbehoud);
  const regeling = /niet de stand van een regeling|stand van de regelingen/i.test(voorbehoud);
  const tariefachtig = fenomeen === "nettarief" || fenomeen === "elektriciteitsprijs";
  const regelingachtig = fenomeen === "subsidiebudget" || fenomeen === "subsidiebedrag";
  return (geld && tariefachtig) || (regeling && regelingachtig);
}

/** Welke Vibe-oplossingsfamilies een onderwerp raakt. Interpretatie. */
function oplossingenVan(onderwerpen: readonly string[]): string[] {
  const kaart: Record<string, readonly string[]> = {
    bess: ["batterijopslag", "energiemanagement"],
    ems: ["energiemanagement"],
    netcongestie: ["batterijopslag", "netaansluiting", "energiemanagement"],
    flexibiliteit: ["batterijopslag", "energiemanagement"],
    laadinfrastructuur: ["laadinfrastructuur"],
    "zonne-energie": ["zonnestroom"],
    netbeheer: ["netaansluiting"],
    vastgoedverduurzaming: ["energielabel", "zonnestroom"],
    rendement: ["batterijopslag"],
  };
  return [...new Set(onderwerpen.flatMap((o) => kaart[o] ?? []))];
}

/**
 * Waarom dit een Nederlandse ondernemer aangaat.
 *
 * Par. 11 en 12 vragen een zakelijke uitleg, en par. 12 verbiedt
 * tegelijk het forceren van een oplossing in een onderwerp dat er niet
 * om vraagt. Daarom: de uitleg komt uit het FENOMEEN en de herkende
 * oplossingsfamilies, en als die er niet zijn blijft hij leeg in plaats
 * van een verkooppraatje te worden.
 */
function zakelijkeRelevantieVan(
  onderwerpen: readonly string[],
  oplossingen: readonly string[],
  feiten: readonly { fenomeen: string | null; tijdgrens: string | null }[],
): string {
  const fenomenen = [...new Set(feiten.map((f) => f.fenomeen).filter(Boolean))] as string[];
  const WAAROM: Record<string, string> = {
    nettarief:
      "Een tariefwijziging raakt de vaste kosten van elke grootverbruikaansluiting. Wie zijn " +
      "profiel kan verschuiven, kan die stijging deels opvangen.",
    netinvestering:
      "De omvang van het investeringsprogramma bepaalt hoe lang netverzwaring duurt. Zolang die " +
      "rij niet korter wordt, is een eigen oplossing achter de meter de snellere route.",
    netcapaciteit:
      "Beschikbare transportcapaciteit bepaalt of uitbreiden kan zonder te wachten op de netbeheerder.",
    subsidiebudget:
      "Een budget met een termijn bepaalt of een investering dit jaar nog in aanmerking komt.",
    subsidiebedrag: "Het bedrag per aanvraag bepaalt of een businesscase rond komt.",
    batterijcapaciteit:
      "De energie-inhoud bepaalt hoeveel uur een piek te dekken is; dat is een andere maat dan vermogen.",
    opgesteldvermogen: "Het opgestelde vermogen bepaalt de piek die een aansluiting moet kunnen verwerken.",
    aansluitvermogen: "Het aansluitvermogen is de harde grens waarbinnen elk plan moet passen.",
    transportvermogen:
      "Gecontracteerd transportvermogen kost jaarlijks geld, ook ongebruikt; de juiste maat kiezen scheelt direct.",
    wachttijd: "Een wachttijd op een aansluiting bepaalt of een uitbreiding dit jaar haalbaar is.",
    doorlooptijd: "De doorlooptijd bepaalt of netverzwaring een reëel alternatief is of een papieren optie.",
    elektriciteitsprijs: "De prijsontwikkeling bepaalt de waarde van verschuiven en opslaan.",
  };
  const delen = fenomenen.map((f) => WAAROM[f]).filter(Boolean) as string[];
  if (delen.length === 0) {
    return "Geen zakelijke uitleg vastgesteld: het fenomeen achter dit feit staat niet in de lijst met onderwerpen waarvoor wij een gevolg kunnen benoemen.";
  }
  const tijd = feiten.map((f) => f.tijdgrens).filter(Boolean)[0];
  return (
    delen.join(" ") +
    (oplossingen.length > 0
      ? ` Raakt onze oplossingen: ${oplossingen.join(", ")}.`
      : "") +
    (tijd ? ` Let op de termijn: ${tijd}.` : "")
  );
}

/** Wat de reviewer moet weten voordat hij beslist. */
function reviewerNotitiesVan(
  k: { risico_klasse: string; doel_pad: string | null; cluster_sleutel: string | null },
  feiten: readonly { exactheid: string | null; tijdgrens: string | null; bronUrl: string | null }[],
  bron: PaginaBron | null,
  linkKansen: number,
): string[] {
  const n: string[] = [];
  if (k.risico_klasse === "hoog") {
    n.push(
      "Risicoklasse HOOG: dit onderwerp raakt juridische, subsidie-, rendements- of " +
        "netcapaciteitsuitspraken. Een mens moet dit altijd doorvoeren; het platform schrijft niets.",
    );
  }
  for (const f of feiten) {
    if (f.exactheid && f.exactheid !== "exact") {
      n.push(
        `De waarde is '${f.exactheid}', niet exact. De onzekerheid staat in de voorgestelde zin ` +
          `('circa', 'meer dan', 'tussen'); houd die formulering intact bij het doorvoeren.`,
      );
    }
    if (!f.tijdgrens) {
      n.push("Dit feit draagt geen termijn; controleer of de pagina elders een periode noemt.");
    }
  }
  if (bron?.voorbehoud) {
    n.push(
      `De doelpagina publiceert zelf een voorbehoud over zijn scope. Lees dat na: ` +
        `"${bron.voorbehoud.slice(0, 160)}"`,
    );
  }
  if (linkKansen > 0) {
    n.push(`Er zijn ook ${linkKansen} interne link(s) voorgesteld; die staan los van het feit.`);
  }
  n.push("Goedkeuren publiceert niets: het levert een patch op die een mens doorvoert.");
  return n;
}

/**
 * De inhoudshash waaraan een goedkeuring zich bindt.
 *
 * Par. 15: een goedkeuring hoort aan EXACT deze inhoud vast te zitten.
 * Verandert de tekst, de doelsectie, een feit of een voorgestelde link,
 * dan verandert de hash en is de goedkeuring niet meer geldig. Zonder
 * die binding zou een herziene tekst meeliften op een oude goedkeuring.
 */
export function inhoudsHashVan(inhoud: {
  doelPad: string | null;
  doelSectie: string | null;
  nieuweTekst: string;
  feiten: readonly string[];
  links: readonly string[];
  /** De CTA hoort erbij: ook die komt op de pagina te staan. */
  ctaTekst: string | null;
  ctaDoel: string | null;
  /** De soort wijziging: alinea toevoegen is iets anders dan vervangen. */
  wijzigingSoort: string;
}): string {
  /* WAT ER IN DE HASH ZIT, EN WAAROM PRECIES DIT.
     Alles wat bepaalt wat er op de pagina terechtkomt, en niets anders.
     De onderbouwing, de controles en de tijdstempels zitten er NIET in:
     die veranderen bij elke ronde zonder dat de wijziging anders wordt,
     en dan zou elke goedkeuring binnen een dag vervallen — waarmee de
     binding onbruikbaar en dus genegeerd wordt.

     De CTA zit er WEL in. Die stond er eerst niet, en dat was fout: de
     CTA is gepubliceerde tekst met een belofte erin. Een voorstel
     goedkeuren en dan de CTA veranderen zou een andere belofte
     publiceren dan de beoordelaar heeft gezien. */
  const canoniek = JSON.stringify({
    doelPad: inhoud.doelPad ?? "",
    doelSectie: inhoud.doelSectie ?? "",
    wijzigingSoort: inhoud.wijzigingSoort,
    nieuweTekst: inhoud.nieuweTekst.trim(),
    ctaTekst: (inhoud.ctaTekst ?? "").trim(),
    ctaDoel: (inhoud.ctaDoel ?? "").trim(),
    feiten: [...inhoud.feiten].map((f) => f.trim()).sort(),
    links: [...inhoud.links].sort(),
  });
  return createHash("sha256").update(canoniek, "utf8").digest("hex");
}

/**
 * Van vijf controles naar een besluit.
 *
 * DE VOLGORDE IS BEWUST. Een voorstel dat op de verkeerde pagina staat
 * moet HERROUTEREN heten en niet AFWIJZEN: het feit kan prima kloppen.
 * Een verouderd feit moet UITSTELLEN of AFWIJZEN heten, want herrouteren
 * helpt niet. Zo zegt het oordeel zelf wat de volgende stap is.
 */
/* Geëxporteerd om adversarieel te kunnen toetsen: dit is de routering
   die beslist of een ontdekking naar een bestaande pagina gaat, naar een
   nieuwe, of naar niemand. Par. 32 eist dat zo'n besluit aantoonbaar
   faalt op de juiste grond, niet dat de grendel 'bestaat'. */
export function weegAf(
  controles: readonly Controle[],
  k: { risico_klasse: string; bedrijfsrelevantie: number | null },
  linkKansen: number,
  /** Gevuld als er geen bestaande pagina is en er iets te schrijven is. */
  paginaVoorstel: NieuwePaginaVoorstel | null = null,
): { eindoordeel: Eindoordeel; oordeelReden: string } {
  const faal = (naam: Controle["naam"]) => controles.find((x) => x.naam === naam && x.oordeel === "FAIL");

  const bron = faal("bronverwijzing");
  if (bron) return { eindoordeel: "AFWIJZEN", oordeelReden: bron.reden };

  const act = faal("actualiteit");
  if (act) return { eindoordeel: "AFWIJZEN", oordeelReden: act.reden };

  /* GEEN PASSENDE PAGINA IS GEEN HERROUTERING.
     HERROUTEREN betekent "hoort op een andere pagina". Bestaat die
     andere pagina niet, dan is dat een doodlopend antwoord: de reviewer
     hoort dat het ergens anders hoort zonder te horen waar. Gemeten:
     12 van 19 kandidaten kwamen daar terecht, waarvan negen over
     nettarieven — een onderwerp zonder pagina.

     `paginaVoorstel` is alleen gevuld als de aanroeper heeft
     vastgesteld dat er geen alternatief bestaat EN er iets te schrijven
     is. Dan is het antwoord een voorstel voor een nieuwe pagina. */
  const seoFaal = faal("seo");
  if (seoFaal) {
    if (paginaVoorstel) {
      return {
        eindoordeel: "NIEUWE_PAGINA",
        oordeelReden:
          `geen bestaande pagina dekt dit onderwerp: ${seoFaal.reden} ` +
          `Daarom een voorstel voor een nieuwe pagina (${paginaVoorstel.slug}). ` +
          `${paginaVoorstel.waaromGeenBestaandePagina}. Dit is een VOORSTEL: er wordt geen ` +
          `pagina gemaakt zonder dat een mens erover besluit.`,
      };
    }
    return { eindoordeel: "HERROUTEREN", oordeelReden: seoFaal.reden };
  }

  const dup = faal("duplicatie");
  if (dup) return { eindoordeel: "UITSTELLEN", oordeelReden: dup.reden };

  /* HET FEIT IS NIET TE VERWOORDEN — maar dat is niet het einde.
     Een voorstel hoeft geen nieuwe alinea te zijn. Als de doelpagina nog
     niet linkt naar pagina's die hetzelfde onderwerp dekken, is DAT een
     volledig onderbouwd voorstel: het leunt alleen op het sitekennis-
     artefact, hoeft niets te citeren en beweert geen enkel getal.

     De gebeurtenis blijft de aanleiding ("dit onderwerp speelt nu"), en
     het feit gaat als bewijs mee zodat de reviewer het kan nalezen en
     eventueel zelf een zin schrijft. */
  /* DE TWEE ALGEMENE REGELS STAAN BOVEN DE VERWOORDBAARHEID.
     Ze stonden eronder, en daardoor golden ze NIET voor een
     linkvoorstel: een kandidaat met twee voorbehouden of met een
     bedrijfsrelevantie van 3 ging als linkvoorstel alsnog naar review.
     Een linkvoorstel kost net zo goed redactietijd. */
  const voorbehouden = controles.filter((x) => x.oordeel === "VOORBEHOUD");
  if (voorbehouden.length >= 2) {
    return {
      eindoordeel: "UITSTELLEN",
      oordeelReden: `twee of meer controles met voorbehoud: ${voorbehouden.map((v) => v.naam).join(", ")}`,
    };
  }
  if ((k.bedrijfsrelevantie ?? 0) < 25) {
    /* "DE CONTROLES ZIJN WEL GEHAALD" WAS NIET ALTIJD WAAR.
       Hier stond die zin onvoorwaardelijk. Maar op dit punt zijn er vier
       van de vijf controles getoetst — bronverwijzing, actualiteit, seo
       en duplicatie — en `verwoordbaarheid` nog NIET: die tak begint pas
       hieronder. Een kandidaat met verwoordbaarheid FAIL en een
       bedrijfsrelevantie onder 25 kreeg dus UITSTELLEN met de mededeling
       dat de controles gehaald waren, terwijl er één faalde.

       De reden wordt nu uit de WERKELIJKE controlestanden afgeleid. Dat
       verandert geen enkel eindoordeel en geen enkele drempel; het
       verandert wat er over de kandidaat wordt beweerd. In een repo
       waarvan een release "van verwoord feit naar getrouwe bewering"
       heet, is dat geen cosmetiek. */
    const gefaald = controles.filter((x) => x.oordeel === "FAIL").map((x) => x.naam);
    const stand =
      gefaald.length === 0
        ? voorbehouden.length === 0
          ? "de vijf controles zijn gehaald"
          : `de controles zijn gehaald, met voorbehoud op ${voorbehouden.map((v) => v.naam).join(", ")}`
        : `let op: ${gefaald.join(" en ")} faalt nog`;
    return {
      eindoordeel: "UITSTELLEN",
      oordeelReden:
        `bedrijfsrelevantie ${k.bedrijfsrelevantie ?? 0} is te laag om redactietijd te vragen; ${stand}`,
    };
  }

  /* HET FEIT IS NIET TE VERWOORDEN — maar dat is niet het einde, en het
     is ook GEEN feitelijke revisie.

     Tot 3.0.4 gaf deze tak KLAAR_VOOR_REVIEW, waardoor een linkvoorstel
     in dezelfde staat belandde als een gecontroleerde feitelijke
     paginarevisie. De studio zette er een kop boven die beloofde dat
     alle vijf de controles waren gehaald, terwijl de verwoordbaarheid
     juist was GEFAALD. Gemeten: voorstel 10 (kandidaat 19) stond zo op
     READY_FOR_REVIEW met als eigen reden "het feit zelf is niet te
     verwoorden".

     Het voorstel blijft bestaan en blijft de moeite waard — het leunt
     alleen op het sitekennisartefact, citeert niets en beweert geen
     getal — maar het krijgt een EIGEN gereedheidsklasse, zodat
     READY_FOR_REVIEW weer betekent wat het belooft. */
  const verwoord = controles.find((x) => x.naam === "verwoordbaarheid" && x.oordeel === "FAIL");
  if (verwoord) {
    if (linkKansen > 0) {
      return {
        eindoordeel: "KLAAR_VOOR_LINKREVIEW",
        oordeelReden:
          `het feit zelf is niet te verwoorden zonder te citeren (${verwoord.reden.slice(0, 90)}…), ` +
          `maar er is wel een onderbouwd voorstel: ${linkKansen} interne link(s) naar pagina's met ` +
          `hetzelfde onderwerp waar deze pagina nog niet naar wijst. Dat voorstel leunt alleen op ` +
          `de sitekennis en beweert geen enkel getal. Het feit gaat als bewijs mee. Dit is GEEN ` +
          `feitelijke paginarevisie.`,
      };
    }
    return { eindoordeel: "NEEDS_RESEARCH", oordeelReden: verwoord.reden };
  }
  return {
    eindoordeel: "KLAAR_VOOR_REVIEW",
    oordeelReden:
      `alle vijf de controles gehaald${voorbehouden.length ? ` (1 voorbehoud: ${voorbehouden[0]!.naam})` : ""}. ` +
      `Risicoklasse ${k.risico_klasse}: een mens voert de wijziging door, het platform schrijft niets.`,
  };
}

export type VoorstelrondeRapport = {
  readonly kandidaten: number;
  readonly gebouwd: number;
  readonly nieuw: number;
  readonly bijgewerkt: number;
  readonly zonderVoorstel: number;
  readonly perEindoordeel: Readonly<Record<string, number>>;
};

/**
 * Eén volledige voorstelronde: kandidaten kiezen, voorstel bouwen,
 * voorstel bewaren.
 *
 * WAAROM DIT BESTAAT. Deze lus stond alleen in cli/voorstel.ts, en dus
 * kon de stap alleen met de hand draaien. De planner plande hem niet en
 * de worker kende de soort niet, met als gevolg dat het dashboard
 * dagenlang op dezelfde (of nul) READY_FOR_REVIEW-rijen bleef staan
 * terwijl er wél nieuwe kandidaten binnenkwamen. Sinds 3.0.4 roept de
 * taaksoort `voorstel` deze functie aan; de CLI gebruikt hem ook, zodat
 * er één waarheid is over wat een ronde doet.
 *
 * BESTAANDE MENSELIJKE BESLUITEN BLIJVEN STAAN. Dat zit niet hier maar
 * in bewaarVoorstel: die laat de beoordeling ongemoeid zolang de
 * inhoudshash gelijk blijft, en laat hem als geheel vervallen zodra de
 * inhoud wijzigt. Een herhaalde ronde over ongewijzigde kandidaten is
 * daarmee een no-op op de besluitkolommen.
 */
export async function voorstelronde(
  pool: Pool,
  organisatieId: number,
  kennis: SitekennisBestand,
  opties: { vandaag?: string; kandidaatIds?: readonly number[] } = {},
): Promise<VoorstelrondeRapport> {
  const vandaag = opties.vandaag ?? new Date().toISOString().slice(0, 10);

  const ids =
    opties.kandidaatIds ??
    (
      await metOrganisatie(pool, { organisatieId }, (c) =>
        rijen<{ id: number }>(
          c,
          `select k.id
             from intel.inhoud_kandidaten k
            where k.besluit = 'UPDATE_EXISTING'
              and k.doel_pagina_id is not null
              and k.status <> 'afgehandeld'
            order by k.id`,
        ),
      )
    ).map((r) => r.id);

  let gebouwd = 0;
  let nieuw = 0;
  let bijgewerkt = 0;
  let zonderVoorstel = 0;
  const perEindoordeel: Record<string, number> = {};

  for (const id of ids) {
    const v = await metOrganisatie(pool, { organisatieId }, (c) =>
      bouwVoorstel(c, kennis, id, vandaag),
    );
    if (!v) {
      zonderVoorstel += 1;
      continue;
    }
    gebouwd += 1;
    perEindoordeel[v.eindoordeel] = (perEindoordeel[v.eindoordeel] ?? 0) + 1;
    const r = await metOrganisatie(pool, { organisatieId }, (c) =>
      bewaarVoorstel(c, organisatieId, v),
    );
    if (r.wat === "nieuw") nieuw += 1;
    else bijgewerkt += 1;
  }

  return { kandidaten: ids.length, gebouwd, nieuw, bijgewerkt, zonderVoorstel, perEindoordeel };
}

/** Bouwt voorstellen voor alle kandidaten met een doelpagina. */
export async function bouwVoorstellen(
  c: pg.PoolClient,
  kennis: SitekennisBestand,
  kandidaatIds: readonly number[],
): Promise<Voorstel[]> {
  const uit: Voorstel[] = [];
  for (const id of kandidaatIds) {
    try {
      const v = await bouwVoorstel(c, kennis, id);
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
 * Schrijft een voorstel weg, inclusief de vijf controles.
 *
 * Een bestaande MENSELIJKE beoordeling blijft staan zolang de inhoud
 * gelijk blijft: dan worden alleen de meetwaarden bijgewerkt. Een pijplijn
 * die het oordeel van een reviewer over dezelfde tekst overschrijft maakt
 * het dashboard onbetrouwbaar.
 *
 * Verandert de inhoudshash wél, dan vervalt het besluit als geheel —
 * beoordeling, notitie, wie en wanneer samen. Het ging over een tekst die
 * niet meer bestaat. De geschiedenis blijft append-only bewaard in
 * intel.voorstel_beoordelingen; zie de toelichting bij de on-conflict-set.
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
        cta_tekst, cta_doel, cta_grondslag, eindoordeel, oordeel_reden,
        huidige_tekst, interne_links, inhouds_hash, nieuwe_pagina, publicatie_status)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
             case $15
               when 'KLAAR_VOOR_REVIEW' then 'READY_FOR_REVIEW'
               -- Een linkvoorstel wacht op een mens, maar in zijn EIGEN
               -- staat: het is geen feitelijke paginarevisie.
               when 'KLAAR_VOOR_LINKREVIEW' then 'READY_FOR_LINK_REVIEW'
               -- En een paginavoorstel ook, in de zijne. Het is geen
               -- pagina: het is een besluit dat een mens moet nemen.
               when 'NIEUWE_PAGINA' then 'NEW_PAGE_CANDIDATE'
               else 'DRAFT'
             end)
     on conflict (organisatie_id, kandidaat_id) do update set
       doel_pad             = excluded.doel_pad,
       doel_h1              = excluded.doel_h1,
       doel_voorbehoud      = excluded.doel_voorbehoud,
       doel_noemt_onderwerp = excluded.doel_noemt_onderwerp,
       wijziging_soort      = excluded.wijziging_soort,
       doel_sectie          = excluded.doel_sectie,
       nieuwe_tekst         = excluded.nieuwe_tekst,
       huidige_tekst        = excluded.huidige_tekst,
       interne_links        = excluded.interne_links,
       diff                 = excluded.diff,
       cta_tekst            = excluded.cta_tekst,
       cta_doel             = excluded.cta_doel,
       cta_grondslag        = excluded.cta_grondslag,
       eindoordeel          = excluded.eindoordeel,
       oordeel_reden        = excluded.oordeel_reden,
       inhouds_hash         = excluded.inhouds_hash,
       nieuwe_pagina        = excluded.nieuwe_pagina,
       /* DE PUBLICATIESTATUS VOLGT DE INHOUD (par. 15).
          Dit is de kern van de goedkeuringsbinding. De voorstelmotor
          draait elke ronde opnieuw over dezelfde kandidaat en werkt deze
          rij bij. Verandert de inhoudshash, dan is dit een ANDER
          voorstel dan wat er is goedgekeurd, en valt het terug naar
          beoordeling. De oude goedkeuring blijft als geschiedenis in
          intel.voorstel_beoordelingen staan; alleen zijn geldigheid
          vervalt.

          Verandert de hash NIET, dan blijft de status staan: een
          ongewijzigd voorstel hoeft niet opnieuw langs een mens, ook
          niet als de ronde opnieuw draait. */
       publicatie_status =
         case
           when intel.inhoud_voorstellen.inhouds_hash is distinct from excluded.inhouds_hash
             then case excluded.eindoordeel
                       when 'KLAAR_VOOR_REVIEW' then 'READY_FOR_REVIEW'
                       when 'KLAAR_VOOR_LINKREVIEW' then 'READY_FOR_LINK_REVIEW'
                       when 'NIEUWE_PAGINA' then 'NEW_PAGE_CANDIDATE'
                       else 'DRAFT'
                     end
           else intel.inhoud_voorstellen.publicatie_status
         end,
       /* Vervalt de binding, dan vervalt ook de gebonden hash — anders
          zou de constraint een goedkeuring laten bestaan die niemand
          meer kan navertellen. */
       goedgekeurd_hash =
         case
           when intel.inhoud_voorstellen.inhouds_hash is distinct from excluded.inhouds_hash
             then null
           else intel.inhoud_voorstellen.goedgekeurd_hash
         end,
       /* ÉÉN BESLUIT VERVALT ALS GEHEEL, NIET VOOR TWEE DERDE.

          Dit nulde eerder alleen beoordeeld_door en beoordeeld_op en liet
          beoordeling staan, met als bedoeling de menselijke beoordeling te
          bewaren. Dat kan de database niet aan. Constraint
          voorstel_beoordeling_compleet uit 0021 eist dat beoordeling null
          is, of dat beoordeeld_op EN beoordeeld_door beide gevuld zijn.
          Twee van de drie nullen schendt dat, dus liep juist het scenario
          waarvoor deze goedkeuringsbinding is gebouwd — inhoud wijzigt ná
          goedkeuring — op een harde databasefout:

            ERROR: new row for relation "inhoud_voorstellen" violates
                   check constraint "voorstel_beoordeling_compleet"

          Een tweede botsing zat er latent naast: voorstel_alleen_review
          _goedkeuren eist dat beoordeling niet GOEDGEKEURD is zolang het
          eindoordeel niet KLAAR_VOOR_REVIEW is. Een blijvende GOEDGEKEURD
          naast een nieuw eindoordeel AFWIJZEN brak dus ook.

          Het besluit vervalt daarom als geheel. De geschiedenis gaat niet
          verloren: elk besluit staat append-only in
          intel.voorstel_beoordelingen, met de hash waarover is besloten en
          de beoordelaar als momentopname. Dat is de plek om na te vertellen
          wie wat vond; deze drie kolommen dragen alleen het LEVENDE besluit
          over de huidige inhoud. */
       beoordeling =
         case
           when intel.inhoud_voorstellen.inhouds_hash is distinct from excluded.inhouds_hash
             then null
           else intel.inhoud_voorstellen.beoordeling
         end,
       beoordeling_notitie =
         case
           when intel.inhoud_voorstellen.inhouds_hash is distinct from excluded.inhouds_hash
             then null
           else intel.inhoud_voorstellen.beoordeling_notitie
         end,
       beoordeeld_door =
         case
           when intel.inhoud_voorstellen.inhouds_hash is distinct from excluded.inhouds_hash
             then null
           else intel.inhoud_voorstellen.beoordeeld_door
         end,
       beoordeeld_op =
         case
           when intel.inhoud_voorstellen.inhouds_hash is distinct from excluded.inhouds_hash
             then null
           else intel.inhoud_voorstellen.beoordeeld_op
         end,
       /* OOK DE PRECHECKSPOREN VERVALLEN. Een precheck is gemeten tegen
          een specifieke inhoud en een specifieke websiteversie. Blijft
          hij staan nadat de inhoud is veranderd, dan draagt de rij een
          PASS die over andere tekst ging. Zie migratie 0033. */
       goedgekeurde_website_versie =
         case
           when intel.inhoud_voorstellen.inhouds_hash is distinct from excluded.inhouds_hash
             then null
           else intel.inhoud_voorstellen.goedgekeurde_website_versie
         end,
       precheck_op =
         case
           when intel.inhoud_voorstellen.inhouds_hash is distinct from excluded.inhouds_hash
             then null
           else intel.inhoud_voorstellen.precheck_op
         end,
       precheck_uitslag =
         case
           when intel.inhoud_voorstellen.inhouds_hash is distinct from excluded.inhouds_hash
             then null
           else intel.inhoud_voorstellen.precheck_uitslag
         end
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
      v.wijziging.huidigeTekst || null,
      v.aanbevolenInterneLinks.map((l) => `${l.route} — ${l.reden}`),
      v.inhoudsHash,
      v.nieuwePagina === null ? null : JSON.stringify(v.nieuwePagina),
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
