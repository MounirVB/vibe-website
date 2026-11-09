/* ============================================================
   UITGIFTE — van een goedgekeurd artikel naar een publieke URL
   ------------------------------------------------------------
   WAAROM DEZE LAAG BESTAAT, EN WAAROM HIJ GESPLITST IS.

   De publicatieketen heeft DRIE dingen tegelijk nodig: de intel-
   database, een git-werkboom van vibe-website met de generator, en een
   geautoriseerde weg naar GitHub. Gemeten in de productiecontainer van
   vibe-intel-api en vibe-intel-worker op 9 november 2026:

     git                 ONTBREEKT
     /app/.git           bestaat niet
     gh                  ONTBREEKT
     /app/scripts        bestaat niet (de generator staat in de repowortel)
     /data/inhoud        bestaat niet
     INTEL_SITE_WORTEL   leeg, dus siteWortel valt terug op "/"
     de container draait als root en "/" is schrijfbaar

   De plek waar de database vanzelf bereikbaar is, kan de git-helft dus
   niet draaien. En de plek waar de hele repo wél staat — een
   GitHub-werkstroom — kan de database niet bereiken, want die hangt in
   een privénetwerk zonder publieke poort en dat moet zo blijven.

   Daarom twee uitvoeringsplekken en ÉÉN beslisser:

     DE SERVER (deze laag, in de container bij de database)
       beslist wat er uitgegeven mag worden, bouwt het registerrecord
       met alle poorten eraan, geeft een OPDRACHT af, controleert elke
       terugmelding, meet de publieke URL zelf, en schrijft het hele
       auditspoor.

     DE UITVOERDER (.github/workflows/uitgifte.yml)
       schrijft de bytes die hij krijgt, draait de echte generator en de
       bestaande kwaliteitspoort, opent een pull request, merget die pas
       als GitHub zelf zegt dat alle vereiste checks groen zijn, wacht
       op de deploy en meldt elke stap terug. Hij bedenkt niets.

   DE HASH IS DE GRENS TUSSEN DIE TWEE. De opdracht draagt de volledige
   bytes van het registerrecord plus hun sha256. Bij de terugmelding
   bouwt publiceer() het record OPNIEUW uit de database en vergelijkt
   zijn eigen hash met die van de uitvoerder. Komen ze niet overeen, dan
   is er iets anders geschreven dan de poorten hebben gezien en wordt er
   niets vastgelegd. Een uitvoerder die de inhoud zou kunnen kiezen, is
   geen uitvoerder maar een tweede redactie.

   ------------------------------------------------------------
   DE VIJF FASEN, EN WIE ZE MEET

     GOEDGEKEURD        de server       (beleidsgoedkeuring, autopublicatie.ts)
     RECORD_GESCHREVEN  de server       na hashvergelijking van de melding
     PR_AANGEMAAKT      de uitvoerder   branch, commit, PR-nummer
     PR_GEMERGED        de uitvoerder   de mergecommit
     LIVE_GEVERIFIEERD  de SERVER       HTTP 200, canonical, kop, sitemap

   De laatste fase is met opzet de enige die de server zelf MEET in
   plaats van aanneemt. Zou de uitvoerder mogen melden "hij staat live",
   dan zou een fout in zijn eigen stappen zich als succes kunnen
   voordoen. De server haalt de publieke URL op en kijkt. Dat is ook de
   reden dat een gelogen mergemelding niets oplevert: zonder echte merge
   is er geen pagina om op te halen.

   ------------------------------------------------------------
   WAT DEZE LAAG NOOIT DOET

   · Hij raakt geen hoogrisico-artikel aan. Dat is op vier niveaus
     dicht: het beleid mag niet (0004), de versierij mag niet (0052),
     autopublicatie.ts weigert het, en de wachtrij hieronder eist
     goedkeuring_soort 'beleid' — wat bij hoog risico niet kan bestaan.
   · Hij keurt niets goed. De goedkeuring is een ANDER besluit, met een
     eigen schakelaar (auto_publiceren_aan) en een eigen fase.
   · Hij draait niet zonder dat twee schakelaars AAN staan, en beide
     staan standaard uit: auto_publiceren_aan en auto_uitgifte_aan
     (migratie 0058).
   ============================================================ */

import type { Pool } from "pg";
import { eenRij, metOrganisatie, rijen } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import { IntelFout } from "../kern/fouten.ts";
import { APP_WORTEL, configLezen } from "../kern/config.ts";
import {
  legPublicatieAuditVast,
  legPublicatiebesluitVast,
  systeemActor,
  type Fase,
} from "../inhoud/actor.ts";
import { publiceer } from "../inhoud/publiceer.ts";
import { branchVoor } from "../publicatie/pr.ts";
import { siteKennisUitArtefact } from "../site/routeregister.ts";
import { slugVanPad } from "../site/nieuwsregister.ts";

const log = maakLogger("uitgifte");

/**
 * Hoeveel artikelen mag dit platform op één dag zelf publiceren?
 *
 * DRIE, EN DAT IS EEN REDACTIONELE KEUZE, GEEN TECHNISCHE GRENS. Een
 * nieuwskanaal dat op een drukke dag twintig berichten uitgeeft is geen
 * redactie maar een sluis, en op een publieke site met 431 pagina's is
 * zo'n uitbarsting ook een signaal aan Google dat er iets is omgevallen.
 *
 * Het plafond staat HIER en niet in het beleid in de database, omdat de
 * database geen plek heeft om het te verantwoorden. Wie hem verruimt,
 * ziet in dezelfde beweging waarom hij op drie stond.
 */
export const MAX_AUTONOME_PUBLICATIES_PER_DAG = 3;

/**
 * Na hoeveel mislukte uitgiftes zet dit platform zichzelf stil?
 *
 * DRIE OPEENVOLGENDE, en dan is de stroomonderbreker uit tot een mens
 * hem terugzet. Niet omdat drie een magisch getal is, maar omdat een
 * derde fout op rij betekent dat de oorzaak STRUCTUREEL is: de
 * generator weigert, de poort blijft rood, GitHub geeft 403. Doorgaan
 * levert dan alleen meer rode PR's op, en elke PR die blijft staan is
 * ruis in de repository van een publieke website.
 */
export const MAX_OPEENVOLGENDE_FOUTEN = 3;

/** De gronden waarop de uitgifte zichzelf stilzet. */
export type Stopreden = {
  readonly sleutel:
    | "beleid_uit"
    | "geen_beleid"
    | "stroomonderbreker"
    | "dagplafond"
    | "artefact_onbruikbaar";
  /* GEEN SLEUTEL DIE NIETS PRODUCEERT. Hier stond ook
     'websiteversie_verschoven', en stopredenen() duwde hem nergens:
     een stopconditie die alleen als typesleutel bestaat, leest als een
     bescherming die er niet is — hetzelfde patroon als het dode recht
     `inhoud.publiceren` dat #79 moest repareren. De verwante
     bescherming BESTAAT wel, maar op een andere plek: de uitvoerder
     vergelijkt de productie-SHA uit /machine/stand met de SHA die hij
     verwacht, en stopt zelf als die afwijkt. Dat kan de server niet
     meten, want hij weet niet wat de uitvoerder verwacht. */
  readonly reden: string;
};

export type Uitgiftebeleid = {
  readonly versie: string;
  readonly autoAan: boolean;
  readonly uitgifteAan: boolean;
  readonly maxRisico: string;
};

/** Eén opdracht: alles wat de uitvoerder nodig heeft, en niets meer. */
export type UitgifteOpdracht = {
  readonly inhoudVersieId: number;
  readonly pad: string;
  readonly slug: string;
  readonly canoniekeUrl: string;
  /** Waar het bestand moet komen, relatief aan de repowortel. */
  readonly bestandspad: string;
  /** De bytes die de uitvoerder moet schrijven. Letterlijk deze. */
  readonly recordInhoud: string;
  readonly recordHash: string;
  readonly branch: string;
  readonly commitBericht: string;
  readonly beleidVersie: string;
  readonly risicoKlasse: string;
  /** De websiteversie waarop deze opdracht is gebouwd. */
  readonly websiteVersie: string | null;
  /** De fase waarin deze versie nu staat; de uitvoerder gaat verder. */
  readonly fase: Fase | null;
};

export type Geweigerd = {
  readonly inhoudVersieId: number;
  readonly pad: string;
  readonly reden: string;
};

export type WachtrijUitslag = {
  readonly beleid: Uitgiftebeleid | null;
  readonly stop: readonly Stopreden[];
  readonly opdrachten: readonly UitgifteOpdracht[];
  readonly geweigerd: readonly Geweigerd[];
  readonly vandaagGepubliceerd: number;
};

/* ------------------------------------------------------------------
   Lezen
   ------------------------------------------------------------------ */

/** Het actieve beleid met BEIDE schakelaars. */
export async function leesUitgiftebeleid(
  c: Parameters<typeof rijen>[0],
  organisatieId: number,
): Promise<Uitgiftebeleid | null> {
  const r = await rijen<{
    versie: string;
    auto_publiceren_aan: boolean;
    auto_uitgifte_aan: boolean;
    auto_max_risico: string;
  }>(
    c,
    `select versie, auto_publiceren_aan, auto_uitgifte_aan, auto_max_risico
       from intel.publicatiebeleid
      where organisatie_id = $1 and actief
      order by vastgesteld_op desc
      limit 1`,
    [organisatieId],
  );
  const b = r[0];
  if (b === undefined) return null;
  return {
    versie: b.versie,
    autoAan: b.auto_publiceren_aan,
    uitgifteAan: b.auto_uitgifte_aan,
    maxRisico: b.auto_max_risico,
  };
}

/**
 * In welke fase staat deze versie?
 *
 * DE FASE IS DE LAATSTE REGEL IN HET LOGBOEK, niet een kolom. Dat is
 * geen omslachtigheid maar het ontwerp van #79: `publicatiebesluiten` is
 * append-only, dus de geschiedenis is volledig en de huidige stand is
 * altijd af te leiden. Een eigen statuskolom zou een tweede waarheid
 * zijn die kan afwijken van het bewijs.
 */
export async function huidigeFase(
  c: Parameters<typeof rijen>[0],
  organisatieId: number,
  inhoudVersieId: number,
): Promise<{
  fase: Fase | null;
  meting: Record<string, unknown> | null;
  /** De laatste mislukking, als die ná de laatste voortgang kwam. */
  blokkade: Record<string, unknown> | null;
}> {
  const r = await rijen<{ poortresultaten: { fase?: string } | null }>(
    c,
    `select poortresultaten
       from intel.publicatiebesluiten
      where organisatie_id = $1 and inhoud_versie_id = $2
      order by id desc`,
    [organisatieId, inhoudVersieId],
  );

  /* EEN MISLUKKING IS EEN GEBEURTENIS, GEEN FASE.
     GEBLOKKEERD staat in dezelfde kolom als de vijf voortgangsfasen,
     en mijn eerste versie nam gewoon de laatste regel. Daarmee was de
     'huidige fase' na één mislukte PR-poging voorgoed GEBLOKKEERD, en
     weigerde de toestandsmachine elke volgende stap: "fase
     PR_AANGEMAAKT kan niet volgen op GEBLOKKEERD". Gemeten — en het
     maakte herstel onmogelijk, wat precies het tegenovergestelde is
     van wat een foutmelding hoort te doen.

     De VOORTGANG is dus de laatste regel die GEEN blokkade is; de
     blokkade komt er apart bij, zodat een lezer ziet dat er iets fout
     ging zonder dat de keten vastloopt. */
  let blokkade: Record<string, unknown> | null = null;
  for (const rij of r) {
    const fase = rij.poortresultaten?.fase;
    if (typeof fase !== "string" || fase.length === 0) continue;
    if (fase === "GEBLOKKEERD") {
      blokkade ??= rij.poortresultaten as Record<string, unknown>;
      continue;
    }
    return {
      fase: fase as Fase,
      meting: rij.poortresultaten as Record<string, unknown>,
      blokkade,
    };
  }
  return { fase: null, meting: null, blokkade };
}

/**
 * De stopcondities, alle vijf tegelijk gemeten.
 *
 * FAIL-CLOSED: elke onzekerheid is een stop. Geen beleidsrij is een
 * stop, een onbruikbaar artefact is een stop, en een websiteversie die
 * is verschoven sinds de laatste opdracht is een stop — want dan is de
 * site onder de uitgifte vandaan herbouwd en zeggen de interne links en
 * de eigenaarsroute in het record misschien niets meer.
 */
export async function stopredenen(
  pool: Pool,
  organisatieId: number,
  opties: { readonly intelligenceWortel?: string } = {},
): Promise<{ stop: Stopreden[]; beleid: Uitgiftebeleid | null; vandaag: number }> {
  const wortel = opties.intelligenceWortel ?? APP_WORTEL;
  const stop: Stopreden[] = [];

  const { beleid, vandaag, fouten } = await metOrganisatie(
    pool,
    { organisatieId },
    async (c) => {
      const beleid = await leesUitgiftebeleid(c, organisatieId);

      /* HET DAGPLAFOND WORDT GETELD OP WAT ER ECHT IS GEPUBLICEERD, en
         niet op wat er is goedgekeurd: een goedkeuring die later
         strandt hoort het plafond niet op te eten. `intel.publicaties`
         is de rij die bij een registerrecord hoort. */
      const dag = await eenRij<{ n: number }>(
        c,
        `select count(*)::int as n
           from intel.publicaties p
           join intel.inhoud_versies v on v.id = p.inhoud_versie_id
          where p.organisatie_id = $1
            and p.status = 'geschreven'
            and v.goedkeuring_soort = 'beleid'
            and p.op >= date_trunc('day', now())`,
        [organisatieId],
      );

      /* DE STROOMONDERBREKER. Hoeveel GEBLOKKEERD-regels met een
         uitgiftegrond staan er ná de laatste geslaagde uitgiftefase?
         Niet "hoeveel fouten ooit": een platform dat drie maanden
         geleden drie keer faalde en daarna vijftig keer publiceerde,
         staat niet stil. */
      const f = await eenRij<{ n: number }>(
        c,
        `with laatste_succes as (
           select coalesce(max(id), 0) as id
             from intel.publicatiebesluiten
            where organisatie_id = $1
              and poortresultaten->>'fase' in ('LIVE_GEVERIFIEERD', 'PR_GEMERGED')
         )
         select count(*)::int as n
           from intel.publicatiebesluiten b, laatste_succes s
          where b.organisatie_id = $1
            and b.id > s.id
            and b.poortresultaten->>'fase' = 'GEBLOKKEERD'
            and b.poortresultaten->>'grond' like 'uitgifte:%'`,
        [organisatieId],
      );

      return { beleid, vandaag: dag?.n ?? 0, fouten: f?.n ?? 0 };
    },
  );

  if (beleid === null) {
    stop.push({
      sleutel: "geen_beleid",
      reden: "er is geen ACTIEVE beleidsrij; zonder beleid geeft dit platform niets uit",
    });
  } else if (!beleid.autoAan || !beleid.uitgifteAan) {
    stop.push({
      sleutel: "beleid_uit",
      reden:
        `beleid '${beleid.versie}': auto_publiceren_aan=${String(beleid.autoAan)}, ` +
        `auto_uitgifte_aan=${String(beleid.uitgifteAan)}. Beide moeten AAN staan, en beide ` +
        `staan standaard uit (migratie 0058)`,
    });
  }

  if (vandaag >= MAX_AUTONOME_PUBLICATIES_PER_DAG) {
    stop.push({
      sleutel: "dagplafond",
      reden:
        `vandaag zijn er al ${vandaag} artikelen autonoom gepubliceerd; het plafond is ` +
        `${MAX_AUTONOME_PUBLICATIES_PER_DAG} per dag`,
    });
  }

  if (fouten >= MAX_OPEENVOLGENDE_FOUTEN) {
    stop.push({
      sleutel: "stroomonderbreker",
      reden:
        `${fouten} mislukte uitgiftes sinds de laatste geslaagde; vanaf ` +
        `${MAX_OPEENVOLGENDE_FOUTEN} zet de uitgifte zichzelf stil tot een mens kijkt. ` +
        `Een vierde poging levert alleen een vierde rode pull request op`,
    });
  }

  const kennis = await siteKennisUitArtefact(wortel);
  if (!kennis.register.aanwezig) {
    stop.push({
      sleutel: "artefact_onbruikbaar",
      reden:
        `het sitekennis-artefact levert geen routes: ${kennis.register.reden}. Zonder dat ` +
        `artefact kan de server de onderwerp-eigenaar en de interne links niet vaststellen`,
    });
  }

  return { stop, beleid, vandaag };
}

/* ------------------------------------------------------------------
   De wachtrij
   ------------------------------------------------------------------ */

/**
 * Welke artikelen mogen nu uitgegeven worden, en met welke opdracht?
 *
 * SCHRIJFT NIETS. Deze functie leest, bouwt records en geeft ze terug.
 * Pas als de uitvoerder meldt dat hij iets heeft gedaan, legt deze laag
 * iets vast. Dat is met opzet: een opdracht die onderweg verloren gaat
 * mag geen spoor achterlaten dat zegt dat er iets gebeurd is.
 */
export async function maakUitgifteWachtrij(
  pool: Pool,
  organisatieId: number,
  opties: {
    readonly max?: number;
    readonly intelligenceWortel?: string;
    /** Negeert de beleidsschakelaars; ALLEEN voor `--droog` op de CLI. */
    readonly ookAlsBeleidUit?: boolean;
  } = {},
): Promise<WachtrijUitslag> {
  const max = opties.max ?? MAX_AUTONOME_PUBLICATIES_PER_DAG;
  const wortel = opties.intelligenceWortel ?? APP_WORTEL;

  const { stop, beleid, vandaag } = await stopredenen(pool, organisatieId, {
    intelligenceWortel: wortel,
  });

  /* EEN HARDE STOP IS EEN LEGE WACHTRIJ. Alleen de twee
     beleidsschakelaars mogen voor een DROGE ronde worden overgeslagen,
     want "wat zou er gebeuren als ik hem aanzet" is precies de vraag
     die je wilt kunnen stellen zonder hem aan te zetten. De
     stroomonderbreker, het dagplafond en een onbruikbaar artefact
     gelden ook droog: die zeggen dat de meting zelf niet te
     vertrouwen is. */
  const blokkerend = stop.filter(
    (s) => !(opties.ookAlsBeleidUit === true && (s.sleutel === "beleid_uit" || s.sleutel === "geen_beleid")),
  );
  if (blokkerend.length > 0) {
    return { beleid, stop, opdrachten: [], geweigerd: [], vandaagGepubliceerd: vandaag };
  }

  const kennis = await siteKennisUitArtefact(wortel);
  const beleidVersie = beleid?.versie ?? "GEEN BELEID (droge ronde)";

  const kandidaten = await metOrganisatie(pool, { organisatieId }, (c) =>
    rijen<{
      id: number;
      pad: string;
      canonieke_url: string;
      titel: string;
      risico_klasse: string;
      status: string;
      goedkeuring_soort: string | null;
      goedkeurend_beleid: string | null;
      inhoud_afdruk: string | null;
      goedgekeurde_afdruk: string | null;
    }>(
      c,
      /* DE WERKVOORRAAD IS SMAL, EN ELKE VOORWAARDE STAAT ER OM EEN
         REDEN:
           status 'goedgekeurd'        nog niet gepubliceerd, al vrijgegeven
           goedkeuring_soort 'beleid'  de MENSELIJKE weg loopt via de CLI,
                                       met een mens die de PR opent; die
                                       hoort niet door een machine te
                                       worden overgenomen
           risico <> 'hoog'           vierde slot bovenop de drie in de
                                       database en in autopublicatie.ts
           poorten_geslaagd + 0 blokkades
           de afdrukbinding            goedgekeurde_afdruk = inhoud_afdruk,
                                       want anders is de tekst na de
                                       goedkeuring veranderd */
      `select v.id, v.pad, v.canonieke_url, v.titel, v.risico_klasse, v.status,
              v.goedkeuring_soort, v.goedkeurend_beleid, v.inhoud_afdruk, v.goedgekeurde_afdruk
         from intel.inhoud_versies v
        where v.organisatie_id = $1
          /* 'gepubliceerd' HOORT ERBIJ, EN DAT IS HERSTEL.
             publiceer() zet de status op 'gepubliceerd' zodra het
             registerrecord bestaat — fase 2 van de vijf. Strandde de
             uitgifte daarna op de PR of op de merge, dan staat de versie
             dus op 'gepubliceerd' terwijl er publiek nog niets is. Met
             alleen 'goedgekeurd' viel hij uit de wachtrij en kon de
             keten NOOIT worden hervat; de lus hieronder laat alleen
             versies door die werkelijk midden in deze keten staan. */
          and v.status in ('goedgekeurd', 'gepubliceerd')
          and v.goedkeuring_soort = 'beleid'
          and v.risico_klasse <> 'hoog'
          and v.poorten_geslaagd
          and cardinality(v.blokkades) = 0
          and v.goedgekeurde_afdruk is not null
          and v.goedgekeurde_afdruk = v.inhoud_afdruk
        order by v.goedgekeurd_op nulls last, v.id
        limit $2`,
      [organisatieId, max],
    ),
  );

  const opdrachten: UitgifteOpdracht[] = [];
  const geweigerd: Geweigerd[] = [];

  for (const v of kandidaten) {
    const slug = slugVanPad(v.pad);
    if (slug === null) {
      geweigerd.push({
        inhoudVersieId: v.id,
        pad: v.pad,
        reden: `pad '${v.pad}' valt buiten data/inhoud/nieuws/; dit platform auteurt daarbuiten niet`,
      });
      continue;
    }

    /* ---------- IS DE TEKST REDACTIONEEL AF? ----------
       §2 van de opdracht vraagt een feitelijke, DUIDELIJKE titel en een
       artikel dat betekenis geeft. Twee dingen in de conceptbouw staan
       daar bij een publicatie zonder mens in de weg, en beide zijn
       gemeten in inhoud/concept.ts:

       1 HET PLAATSHOUDERTEKEN. Heeft een bevestigde uitspraak geen
         numerieke waarde, dan schrijft bouwConcept() letterlijk
         "**TE VERWOORDEN DOOR DE REDACTIE.**" in de body (regel 462).
         Dat is een opdracht aan een mens, geen tekst voor een lezer.
         Geen enkele poort houdt hem tegen: de lengtepoorten kijken naar
         aantallen tekens en de claimpoorten naar bewijs.

       2 DE TITEL IS DE BRONDOCUMENTTITEL. `volledigeKop =
         invoer.gebeurtenisTitel` (regel 379). Voor een ACM-besluit is
         dat een kenmerk als 'ACM/UIT/1123013' — een geldige titel voor
         een dossier, geen kop voor een nieuwsbericht. De titelpoort
         toetst alleen de lengte, dus zo'n kop komt er langs.

       Deze twee weigeringen staan HIER en niet als nieuwe poort, omdat
       ze alleen gelden voor de weg zonder mens. Een redacteur die het
       concept in de Studio opent ziet de plaatshouder en de kop staan
       en kan ze herschrijven; dat is precies waarvoor die plaatshouder
       bedoeld is. */
    const PLAATSHOUDER = "TE VERWOORDEN DOOR DE REDACTIE";
    const tekststand = await metOrganisatie(pool, { organisatieId }, (c) =>
      eenRij<{ titel: string; body_markdown: string }>(
        c,
        "select titel, body_markdown from intel.inhoud_versies where organisatie_id = $1 and id = $2",
        [organisatieId, v.id],
      ),
    );
    if (tekststand === null) {
      geweigerd.push({ inhoudVersieId: v.id, pad: v.pad, reden: "de versie is verdwenen" });
      continue;
    }
    if (tekststand.body_markdown.includes(PLAATSHOUDER)) {
      geweigerd.push({
        inhoudVersieId: v.id,
        pad: v.pad,
        reden:
          `de body draagt de plaatshouder '${PLAATSHOUDER}'. Dat is een opdracht aan een ` +
          `redacteur en geen tekst voor een lezer; dit bericht hoort door een mens te worden ` +
          `verwoord voordat het publiek gaat`,
      });
      continue;
    }
    /* EEN KOP ZONDER ADEM IS EEN KENMERK, GEEN KOP. Drie woorden is de
       ondergrens: 'ACM/UIT/1123013 | Vibe Energy' haalt er twee en elke
       echte nieuwskop haalt er meer. Het achtervoegsel '| Vibe Energy'
       telt niet mee, want dat zet de conceptbouw er zelf achter. */
    const kop = tekststand.titel.split("|")[0]!.trim();
    const woorden = kop.split(/\s+/).filter((w) => /[a-z]{3,}/i.test(w));
    if (woorden.length < 3) {
      geweigerd.push({
        inhoudVersieId: v.id,
        pad: v.pad,
        reden:
          `de kop '${kop}' bestaat uit ${woorden.length} woord(en) en leest als een ` +
          `documentkenmerk in plaats van als een nieuwskop. De conceptbouw neemt de titel van het ` +
          `brondocument over; voor een publicatie zonder mens is dat niet genoeg`,
      });
      continue;
    }

    /* ---------- IS DE BRON ONDER DIT BERICHT NU GEZOND? ----------
       §1 van de opdracht: publiceer geen artikel wanneer de
       onderliggende bron onvoldoende betrouwbaar of actueel is.
       Gemeten op 9 november 2026: de nieuwsselectie leest de
       brongezondheid NERGENS — `gezondheid`, `storingssoort` en
       `opeenvolgende_fouten` komen in pijplijn/nieuwsselectie.ts niet
       voor. Een gebeurtenis uit een bron die op dit moment kapot is
       weegt daar dus even zwaar als een gezonde.

       Voor een concept dat een mens nog beoordeelt is dat te
       verantwoorden: die ziet de bron. Voor een publicatie ZONDER mens
       niet. Een bron die nu een storing draagt kan een ingetrokken
       besluit niet meer melden, en dan publiceert dit platform een
       stand van zaken die misschien al is achterhaald.

       DE TOETS GELDT OP DE PRIMAIRE BINDINGEN van de gebonden claims —
       dezelfde join als voorwaarde 4 van de autopublicatie, met
       `rol = 'primair'`, want zonder die voorwaarde wordt een claim met
       twee bindingen dubbel geteld. */
    const bronstand = await metOrganisatie(pool, { organisatieId }, (c) =>
      rijen<{ sleutel: string; gezondheid: string; storingssoort: string | null; sinds: string | null }>(
        c,
        `select distinct b.sleutel, b.gezondheid, b.storingssoort,
                b.storing_sinds::date::text as sinds
           from intel.inhoud_uitspraken iu
           join intel.uitspraken u on u.id = iu.uitspraak_id
           join intel.uitspraak_bronnen ub
                  on ub.uitspraak_id = u.id and ub.rol = 'primair'
           join intel.brondocument_versies bv on bv.id = ub.versie_id
           join intel.brondocumenten bd on bd.id = bv.brondocument_id
           join intel.bronnen b on b.id = bd.bron_id
          where iu.organisatie_id = $1 and iu.inhoud_versie_id = $2
            and (b.storingssoort is not null or b.gezondheid in ('DEGRADED', 'BROKEN', 'DISABLED'))`,
        [organisatieId, v.id],
      ),
    );
    if (bronstand.length > 0) {
      geweigerd.push({
        inhoudVersieId: v.id,
        pad: v.pad,
        reden:
          `de bron onder dit bericht draagt een storing: ` +
          bronstand
            .map(
              (b) =>
                `${b.sleutel} (${b.gezondheid}${b.storingssoort === null ? "" : `, ${b.storingssoort}`}` +
                `${b.sinds === null ? "" : ` sinds ${b.sinds}`})`,
            )
            .join("; ") +
          `. Een publicatie zonder mens hoort niet op een bron te rusten die nu niet te ` +
          `bevragen is`,
      });
      continue;
    }

    /* ---------- IS DE RISICOKLASSE GEMETEN OF GERADEN? ----------
       pijplijn/clusteren.ts doet `cluster?.risico_klasse ?? "laag"`.
       Een gebeurtenis zonder bekend onderwerpcluster komt dus als LAAG
       uit de pijplijn — fail-OPEN, precies de verkeerde kant voor een
       weg die zonder mens publiceert. Voor de menselijke route is dat
       te verdedigen (iemand kijkt), hier niet.

       Deze toets eist daarom dat de risicoklasse uit een BESTAAND,
       gezaaid cluster komt. Geen cluster betekent geen gemeten risico,
       en geen gemeten risico betekent geen autonome publicatie. */
    const clusterstand = await metOrganisatie(pool, { organisatieId }, (c) =>
      eenRij<{ cluster_sleutel: string | null; cluster_risico: string | null }>(
        c,
        `select oc.sleutel as cluster_sleutel, oc.risico_klasse as cluster_risico
           from intel.inhoud_versies v
           left join intel.inhoud_kandidaten k on k.id = v.kandidaat_id
           left join intel.onderwerp_clusters oc on oc.id = k.onderwerp_cluster_id
          where v.organisatie_id = $1 and v.id = $2`,
        [organisatieId, v.id],
      ),
    );
    if (clusterstand?.cluster_sleutel == null || clusterstand.cluster_risico == null) {
      geweigerd.push({
        inhoudVersieId: v.id,
        pad: v.pad,
        reden:
          `de risicoklasse '${v.risico_klasse}' is niet terug te voeren op een gezaaid ` +
          `onderwerpcluster (cluster ${clusterstand?.cluster_sleutel ?? "ONBEKEND"}). De pijplijn ` +
          `valt bij een onbekend cluster terug op 'laag', en zo'n aanname is geen grond voor een ` +
          `publicatie zonder mens`,
      });
      continue;
    }

    const fase = await metOrganisatie(pool, { organisatieId }, (c) =>
      huidigeFase(c, organisatieId, v.id),
    );
    if (fase.fase === "LIVE_GEVERIFIEERD") {
      geweigerd.push({
        inhoudVersieId: v.id,
        pad: v.pad,
        reden: "deze versie staat al als LIVE_GEVERIFIEERD in het logboek",
      });
      continue;
    }
    if (fase.fase === "TERUGGEDRAAID") {
      geweigerd.push({
        inhoudVersieId: v.id,
        pad: v.pad,
        reden:
          "deze versie is teruggedraaid; opnieuw uitgeven is een besluit van een mens en niet " +
          "van een wachtrij",
      });
      continue;
    }

    /* ---------- HERVATTEN MAG, OVERNEMEN NIET ----------
       Een versie op 'gepubliceerd' heeft zijn registerrecord al. Dat
       kan twee dingen betekenen:

         (a) deze keten schreef het en strandde daarna — dan hervatten
             we, want de branch is deterministisch en elke fase is
             idempotent;
         (b) de OUDE weg schreef het, met auto_uitgifte_aan uit, en daar
             opent een MENS de pull request. Die mag een wachtrij niet
             overnemen.

       Het verschil staat in het logboek: alleen (a) heeft een besluit
       met een grond die met 'uitgifte:' begint. */
    const grond = typeof fase.meting?.["grond"] === "string" ? (fase.meting["grond"] as string) : "";
    if (v.status === "gepubliceerd" && !grond.startsWith("uitgifte:")) {
      geweigerd.push({
        inhoudVersieId: v.id,
        pad: v.pad,
        reden:
          `het registerrecord bestaat al en is niet door de uitgifte geschreven ` +
          `(laatste fase ${fase.fase ?? "GEEN"}, grond '${grond || "geen"}'). Die publicatie wacht ` +
          `op een mens die de pull request opent`,
      });
      continue;
    }

    /* HET RECORD KOMT UIT publiceer(), met alle poorten eraan.
       `alleenRecord` draait de volledige weg — de statuscontrole, de
       afdrukbinding, de bewijshertoets onder een slot, de
       onderwerp-eigenaar, de interne links — en schrijft niets. Een
       eigen bouwer hier zou een tweede record kunnen opleveren dat de
       poorten nooit heeft gezien. */
    const rapport = await publiceer(pool, organisatieId, v.id, {
      actor: systeemActor("uitgifte:opdracht", { beleidVersie }),
      alleenRecord: true,
      siteKennis: kennis,
    });
    if (rapport.record === undefined) {
      geweigerd.push({ inhoudVersieId: v.id, pad: v.pad, reden: rapport.reden });
      continue;
    }

    opdrachten.push({
      inhoudVersieId: v.id,
      pad: v.pad,
      slug,
      canoniekeUrl: v.canonieke_url,
      bestandspad: rapport.record.bestandspad,
      recordInhoud: rapport.record.inhoud,
      recordHash: rapport.record.hash,
      branch: branchVoor(slug, v.id),
      commitBericht:
        `publicatie: nieuws/${slug}\n\n` +
        `Inhoudsversie ${v.id}, goedgekeurd onder publicatiebeleid ` +
        `${v.goedkeurend_beleid ?? beleidVersie} (risico ${v.risico_klasse}).\n` +
        `Inhoudsafdruk ${v.inhoud_afdruk ?? "onbekend"}.\n` +
        `Registerrecord ${rapport.record.hash}.\n\n` +
        `Geauteurd door het intelligenceplatform: ${rapport.record.bestandspad}\n` +
        `Al het andere in deze commit is gegenereerd door scripts/seo/bouw.mjs.\n`,
      beleidVersie: v.goedkeurend_beleid ?? beleidVersie,
      risicoKlasse: v.risico_klasse,
      websiteVersie: kennis.websiteVersie,
      fase: fase.fase,
    });
  }

  log.info("uitgiftewachtrij", {
    opdrachten: opdrachten.length,
    geweigerd: geweigerd.length,
    stop: stop.map((s) => s.sleutel),
    vandaag,
  });

  return { beleid, stop, opdrachten, geweigerd, vandaagGepubliceerd: vandaag };
}

/* ------------------------------------------------------------------
   De terugmeldingen
   ------------------------------------------------------------------ */

/**
 * De toegestane overgangen.
 *
 * EEN TOESTANDSMACHINE EN GEEN VRIJE MELDING. Zonder deze tabel zou een
 * uitvoerder PR_GEMERGED kunnen melden zonder ooit een record te hebben
 * geschreven, en dan zou het logboek een merge bevatten van iets wat
 * niet bestaat. `null` is "er staat nog geen fase in het logboek".
 */
const TOEGESTAAN: Readonly<Record<string, readonly (Fase | null)[]>> = {
  RECORD_GESCHREVEN: ["GOEDGEKEURD"],
  PR_AANGEMAAKT: ["RECORD_GESCHREVEN"],
  PR_GEMERGED: ["PR_AANGEMAAKT"],
  LIVE_GEVERIFIEERD: ["PR_GEMERGED"],
};

async function eisFase(
  pool: Pool,
  organisatieId: number,
  inhoudVersieId: number,
  doel: Fase,
): Promise<Fase | null> {
  const { fase } = await metOrganisatie(pool, { organisatieId }, (c) =>
    huidigeFase(c, organisatieId, inhoudVersieId),
  );
  const toegestaan = TOEGESTAAN[doel] ?? [];
  if (fase === doel) {
    /* IDEMPOTENT: dezelfde fase twee keer melden is geen fout. De
       uitvoerder kan opnieuw opstarten nadat hij heeft gemeld maar
       vóórdat hij het antwoord zag. */
    return fase;
  }
  if (!toegestaan.includes(fase)) {
    throw new IntelFout(
      "validatie",
      `fase ${doel} kan niet volgen op ${fase ?? "GEEN FASE"}; toegestaan is ` +
        `${toegestaan.map((f) => f ?? "GEEN FASE").join(" of ")}`,
    );
  }
  return fase;
}

/**
 * De uitvoerder heeft het registerrecord geschreven.
 *
 * publiceer() doet hier het echte werk: hij bouwt het record opnieuw,
 * vergelijkt de hash met die van de uitvoerder, draait alle poorten en
 * de bewijshertoets, en legt de publicatie, de status, het
 * pagina-register, het besluit en de auditregel vast.
 */
export async function aanvaardRecord(
  pool: Pool,
  organisatieId: number,
  inhoudVersieId: number,
  bewijs: { readonly recordHash: string; readonly waar: string; readonly beleidVersie: string },
  opties: { readonly intelligenceWortel?: string } = {},
): Promise<{ ok: boolean; reden: string; publicatieId: number | null }> {
  const huidig = await eisFase(pool, organisatieId, inhoudVersieId, "RECORD_GESCHREVEN");
  if (huidig === "RECORD_GESCHREVEN") {
    return { ok: true, reden: "deze fase stond al in het logboek", publicatieId: null };
  }

  const kennis = await siteKennisUitArtefact(opties.intelligenceWortel ?? APP_WORTEL);
  const rapport = await publiceer(pool, organisatieId, inhoudVersieId, {
    actor: systeemActor("uitgifte:record", { beleidVersie: bewijs.beleidVersie }),
    siteKennis: kennis,
    recordVanUitvoerder: { hash: bewijs.recordHash, waar: bewijs.waar },
  });
  return {
    ok: rapport.publicatieId !== null,
    reden: rapport.reden,
    publicatieId: rapport.publicatieId,
  };
}

/** De uitvoerder heeft een pull request geopend. */
export async function aanvaardPr(
  pool: Pool,
  organisatieId: number,
  inhoudVersieId: number,
  bewijs: {
    readonly branch: string;
    readonly commit: string;
    readonly prNummer: number | null;
    readonly prUrl: string | null;
    readonly beleidVersie: string;
  },
): Promise<{ ok: boolean; reden: string }> {
  const huidig = await eisFase(pool, organisatieId, inhoudVersieId, "PR_AANGEMAAKT");
  if (huidig === "PR_AANGEMAAKT") return { ok: true, reden: "deze fase stond al in het logboek" };

  if (!/^[0-9a-f]{7,40}$/.test(bewijs.commit)) {
    throw new IntelFout(
      "validatie",
      `'${bewijs.commit}' is geen commit-sha; zonder commit is er niets om later in main terug te vinden`,
    );
  }

  const actor = systeemActor("uitgifte:pr", { beleidVersie: bewijs.beleidVersie });
  await metOrganisatie(pool, { organisatieId }, async (c) => {
    await legPublicatiebesluitVast(c, {
      organisatieId,
      inhoudVersieId,
      besluit: "ingediend",
      fase: "PR_AANGEMAAKT",
      actor,
      motivatie:
        `pull request ${bewijs.prNummer === null ? "(nummer onbekend)" : `#${bewijs.prNummer}`} ` +
        `op branch ${bewijs.branch}, commit ${bewijs.commit.slice(0, 12)}`,
      meting: {
        branch: bewijs.branch,
        commit: bewijs.commit,
        prNummer: bewijs.prNummer,
        prUrl: bewijs.prUrl,
        gemetenDoor: "uitvoerder",
      },
    });
    await legPublicatieAuditVast(c, {
      organisatieId,
      actor,
      handeling: "uitgifte_pr_aangemaakt",
      objectId: inhoudVersieId,
      naWaarde: { branch: bewijs.branch, commit: bewijs.commit, pr: bewijs.prNummer },
      motivatie: "een geopende pull request is geen publicatie; de merge en de deploy komen nog",
      herkomst: "uitvoerder",
    });
  });
  return { ok: true, reden: "PR_AANGEMAAKT vastgelegd" };
}

/** De uitvoerder heeft de pull request gemerged. */
export async function aanvaardMerge(
  pool: Pool,
  organisatieId: number,
  inhoudVersieId: number,
  bewijs: {
    readonly mergeCommit: string;
    readonly checksGroen: readonly string[];
    readonly beleidVersie: string;
  },
): Promise<{ ok: boolean; reden: string }> {
  const huidig = await eisFase(pool, organisatieId, inhoudVersieId, "PR_GEMERGED");
  if (huidig === "PR_GEMERGED") return { ok: true, reden: "deze fase stond al in het logboek" };

  if (!/^[0-9a-f]{7,40}$/.test(bewijs.mergeCommit)) {
    throw new IntelFout("validatie", `'${bewijs.mergeCommit}' is geen commit-sha`);
  }
  /* DE CHECKS ZIJN GEEN SIERAAD. GitHub handhaaft de vereiste checks
     zelf — de branchbescherming op main staat op drie verplichte checks
     met strict en enforce_admins, dus een merge zonder groene poort
     wordt door GitHub geweigerd en niet door ons. Maar WELKE checks
     groen stonden hoort in het logboek, want anders is achteraf niet na
     te gaan onder welke poort dit naar productie ging. */
  if (bewijs.checksGroen.length === 0) {
    throw new IntelFout(
      "validatie",
      "een merge zonder gemelde groene checks wordt niet vastgelegd; noem de checks die GitHub " +
        "groen rapporteerde",
    );
  }

  const actor = systeemActor("uitgifte:merge", { beleidVersie: bewijs.beleidVersie });
  await metOrganisatie(pool, { organisatieId }, async (c) => {
    await legPublicatiebesluitVast(c, {
      organisatieId,
      inhoudVersieId,
      besluit: "ingediend",
      fase: "PR_GEMERGED",
      actor,
      motivatie:
        `gemerged als ${bewijs.mergeCommit.slice(0, 12)} met ${bewijs.checksGroen.length} ` +
        `groene check(s): ${bewijs.checksGroen.join(", ")}`,
      meting: {
        mergeCommit: bewijs.mergeCommit,
        checksGroen: bewijs.checksGroen,
        gemetenDoor: "uitvoerder",
      },
    });
    await legPublicatieAuditVast(c, {
      organisatieId,
      actor,
      handeling: "uitgifte_gemerged",
      objectId: inhoudVersieId,
      naWaarde: { mergeCommit: bewijs.mergeCommit, checks: [...bewijs.checksGroen] },
      motivatie:
        "de merge is een productiedeploy; of het artikel ook publiek staat wordt in de volgende " +
        "fase door de server zelf gemeten",
      herkomst: "uitvoerder",
    });
  });
  return { ok: true, reden: "PR_GEMERGED vastgelegd" };
}

/**
 * Staat het artikel publiek? De SERVER meet dat zelf.
 *
 * Hergebruikt verifieerLivePublicatie() uit #79 en vervangt daarin
 * alleen de git-vraag, want de server heeft geen git. De vier
 * HTTP-metingen — status 200, zelfverwijzende canonical, de kop op de
 * pagina, de URL in de sitemap — doet hij wel zelf, en die zijn de
 * eigenlijke grond: zonder echte merge is er geen pagina om op te
 * halen, dus een gelogen mergemelding haalt deze fase niet.
 */
export async function verifieerUitgifteLive(
  pool: Pool,
  organisatieId: number,
  inhoudVersieId: number,
  bewijs: {
    readonly gemergedVolgensUitvoerder: boolean;
    readonly beleidVersie: string;
  },
  opties: { readonly haal?: import("../publicatie/verificatie.ts").Haler } = {},
): Promise<{ ok: boolean; reden: string; grendels: readonly { naam: string; ok: boolean; meting: string }[] }> {
  const huidig = await eisFase(pool, organisatieId, inhoudVersieId, "LIVE_GEVERIFIEERD");
  if (huidig === "LIVE_GEVERIFIEERD") {
    return { ok: true, reden: "deze fase stond al in het logboek", grendels: [] };
  }

  const { verifieerLivePublicatie } = await import("../publicatie/verificatie.ts");
  const actor = systeemActor("uitgifte:live", { beleidVersie: bewijs.beleidVersie });

  const uit = await metOrganisatie(pool, { organisatieId }, (c) =>
    verifieerLivePublicatie(c, organisatieId, inhoudVersieId, {
      actor,
      ...(opties.haal === undefined ? {} : { haal: opties.haal }),
      /* DE GIT-VRAAG WORDT DOOR DE UITVOERDER BEANTWOORD, en dat staat
         zo in het logboek. De server kan hem niet zelf stellen: er is
         geen werkboom en geen git in de container (gemeten). De vier
         HTTP-metingen eronder zijn de echte grond. */
      git: async (args: readonly string[]) => {
        if (args[0] === "merge-base" && args[1] === "--is-ancestor") {
          if (bewijs.gemergedVolgensUitvoerder) return "";
          throw new IntelFout(
            "validatie",
            "de uitvoerder meldt dat de publicatiecommit NIET in main zit",
          );
        }
        throw new IntelFout(
          "configuratie",
          `de server heeft geen git; het commando '${args.join(" ")}' kan hier niet worden gedraaid`,
        );
      },
    }),
  );

  return { ok: uit.geslaagd, reden: uit.reden, grendels: uit.grendels };
}

/**
 * Een stap is mislukt.
 *
 * WAT HIER GEBEURT EN WAT NIET. Er komt een GEBLOKKEERD-regel in het
 * logboek met de stap en de fout, en die regels voeden de
 * stroomonderbreker hierboven. De versie wordt NIET teruggezet: of een
 * halve publicatie te herstellen is, hangt af van de fase waarin hij
 * strandde, en dat oordeel hoort niet in een foutmelding thuis. Het
 * dashboard toont de fase, zodat een mens ziet waar hij staat.
 */
export async function meldUitgifteFout(
  pool: Pool,
  organisatieId: number,
  inhoudVersieId: number,
  bewijs: { readonly stap: string; readonly fout: string; readonly beleidVersie: string },
): Promise<void> {
  const actor = systeemActor("uitgifte:stop", { beleidVersie: bewijs.beleidVersie });
  const { fase } = await metOrganisatie(pool, { organisatieId }, (c) =>
    huidigeFase(c, organisatieId, inhoudVersieId),
  );
  await metOrganisatie(pool, { organisatieId }, async (c) => {
    await legPublicatiebesluitVast(c, {
      organisatieId,
      inhoudVersieId,
      besluit: "automatisch_geblokkeerd",
      fase: "GEBLOKKEERD",
      actor,
      motivatie: `de uitgifte strandde bij '${bewijs.stap}': ${bewijs.fout.slice(0, 500)}`,
      meting: { stap: bewijs.stap, faseVoorFout: fase, gemetenDoor: "uitvoerder" },
    });
    await legPublicatieAuditVast(c, {
      organisatieId,
      actor,
      handeling: "uitgifte_mislukt",
      objectId: inhoudVersieId,
      naWaarde: { stap: bewijs.stap, fase },
      motivatie: bewijs.fout.slice(0, 500),
      herkomst: "uitvoerder",
    });
  });
  log.waarschuwing("uitgifte mislukt", {
    versie: inhoudVersieId,
    stap: bewijs.stap,
    fase,
    fout: bewijs.fout.slice(0, 200),
  });
}

/** De canonieke basis-URL waarop de live-verificatie meet. */
export function siteBasis(): string {
  return configLezen().siteBasisUrl;
}
