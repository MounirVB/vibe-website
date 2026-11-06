/* ============================================================
   TEST — harnas
   ------------------------------------------------------------
   Elke integratietest krijgt een EIGEN database met een unieke naam.
   Dat is geen netheid maar noodzaak: op deze machine draaien
   regelmatig meerdere sessies tegelijk, en een harnas met een vaste
   databasenaam laat die sessies elkaars fixtures wissen. De fout die
   dat oplevert ziet uit als een echte regressie en is er geen.

   De naam bevat het proces-id en een teller, dus twee gelijktijdige
   runs raken elkaar niet. Na de test wordt de database weer
   weggegooid, ook als de test faalt.

   Het netwerk staat in tests UIT (INTEL_NETWERK_TOEGESTAAN=0). Een
   test die een bron wil nabootsen geeft zijn eigen payload mee; een
   test die stil het internet op gaat is geen test maar een meting.
   ============================================================ */

import pg from "pg";
import { configVergeten, laadEnvBestand } from "../src/kern/config.ts";
import { maakPool, metOrganisatie, sluitAllePools, zonderOrganisatie, type Pool } from "../src/kern/db.ts";
import { verifieerMens, type Actor } from "../src/inhoud/actor.ts";
import { migreer } from "../src/db/migraties.ts";
/* DE ECHTE MOTORVERSIES EN DE ECHTE AFDRUKFUNCTIE, niet nagebouwde
   constanten. Een fixture met een hardgecodeerde versiestring blijft
   groen terwijl de code verder loopt, en dan toetst hij een verleden
   dat niet meer bestaat. */
import { inhoudAfdruk } from "../src/inhoud/concept.ts";
import { DOCUMENTSOORT_VERSIE } from "../src/pijplijn/documentsoort.ts";
import { MODALITEIT_VERSIE } from "../src/pijplijn/claimmodaliteit.ts";
import { MOTORVERSIES } from "../src/pijplijn/motorversies.ts";

let teller = 0;

/** DSN naar de beheerdatabase, afgeleid van INTEL_DB_URL. */
function beheerUrl(): { basis: string; beheer: string } {
  // De testrunner leest .env niet zelf; de harnas doet dat wel, zodat
  // `node --test` zonder omgevingsgeknutsel werkt.
  laadEnvBestand();
  const basis = process.env["INTEL_DB_URL"];
  if (!basis) throw new Error("INTEL_DB_URL ontbreekt; tests hebben een database nodig");
  const u = new URL(basis);
  const beheer = new URL(basis);
  beheer.pathname = "/postgres";
  return { basis: u.toString(), beheer: beheer.toString() };
}

export type Wegwerpdatabase = {
  readonly naam: string;
  readonly url: string;
  readonly pool: Pool;
  opruimen(): Promise<void>;
};

export async function maakWegwerpdatabase(
  label: string,
  opties: { totNummer?: number } = {},
): Promise<Wegwerpdatabase> {
  teller += 1;
  const schoon = label.replace(/[^a-z0-9]/gi, "").slice(0, 16).toLowerCase();
  const naam = `vibe_intel_t_${schoon}_${process.pid}_${teller}`;
  const { beheer } = beheerUrl();

  const beheerClient = new pg.Client({ connectionString: beheer });
  await beheerClient.connect();
  try {
    await beheerClient.query(`drop database if exists ${naam}`);
    await beheerClient.query(`create database ${naam}`);
  } finally {
    await beheerClient.end();
  }

  const url = (() => {
    const u = new URL(beheer);
    u.pathname = `/${naam}`;
    return u.toString();
  })();

  // Migreren als eigenaar, zonder SET ROLE.
  const eigenaar = new pg.Client({
    connectionString: url,
    options: "-c search_path=intel,public",
  });
  await eigenaar.connect();
  try {
    await migreer(eigenaar, opties.totNummer === undefined ? {} : { totNummer: opties.totNummer });
  } finally {
    await eigenaar.end();
  }

  // De applicatiepool neemt wel de rol aan, dus RLS geldt in tests.
  configVergeten();
  process.env["INTEL_NETWERK_TOEGESTAAN"] = "0";
  const pool = maakPool({ databaseUrl: url, rol: "vibe_intel_app", max: 4 });

  return {
    naam,
    url,
    pool,
    async opruimen() {
      await sluitAllePools();
      const opruimClient = new pg.Client({ connectionString: beheer });
      await opruimClient.connect();
      try {
        await opruimClient.query(
          `select pg_terminate_backend(pid) from pg_stat_activity where datname = $1`,
          [naam],
        );
        await opruimClient.query(`drop database if exists ${naam}`);
      } finally {
        await opruimClient.end();
      }
    },
  };
}

/** Maakt een organisatie aan als eigenaar en geeft het id terug. */
export async function maakOrganisatie(db: Wegwerpdatabase, sleutel: string): Promise<number> {
  const eigenaar = new pg.Client({
    connectionString: db.url,
    options: "-c search_path=intel,public",
  });
  await eigenaar.connect();
  try {
    const r = await eigenaar.query<{ id: number }>(
      `insert into intel.organisaties (sleutel, naam) values ($1, $2) returning id`,
      [sleutel, `Test ${sleutel}`],
    );
    const id = r.rows[0]?.id;
    if (id === undefined) throw new Error("organisatie niet aangemaakt");
    return id;
  } finally {
    await eigenaar.end();
  }
}

/** Maakt een gebruiker met rol en geeft het id terug. */
export async function maakGebruiker(
  db: Wegwerpdatabase,
  organisatieId: number,
  email: string,
  rol: string,
): Promise<number> {
  const eigenaar = new pg.Client({
    connectionString: db.url,
    options: "-c search_path=intel,public",
  });
  await eigenaar.connect();
  try {
    const r = await eigenaar.query<{ id: number }>(
      `insert into intel.gebruikers (organisatie_id, email, naam) values ($1, $2, $3) returning id`,
      [organisatieId, email, email],
    );
    const id = r.rows[0]?.id;
    if (id === undefined) throw new Error("gebruiker niet aangemaakt");
    await eigenaar.query(
      `insert into intel.gebruiker_rollen (gebruiker_id, rol) values ($1, $2)`,
      [id, rol],
    );
    return id;
  } finally {
    await eigenaar.end();
  }
}

/** Query als eigenaar; voor opzet die de applicatierol niet mag. */
export async function alsEigenaar<T>(
  db: Wegwerpdatabase,
  werk: (c: pg.Client) => Promise<T>,
): Promise<T> {
  const client = new pg.Client({
    connectionString: db.url,
    options: "-c search_path=intel,public",
  });
  await client.connect();
  try {
    return await werk(client);
  } finally {
    await client.end();
  }
}

/**
 * Migreert een halfgemigreerde wegwerpdatabase verder.
 *
 * Hoort bij `maakWegwerpdatabase(label, { totNummer })`: eerst migreren
 * tot de versie die in productie stond, dan representatieve historische
 * rijen invoeren, dan hiermee de rest toepassen. Dat is het scenario dat
 * CI tot 3.0.4 NIET kon naspelen, en precies daardoor kwam 0027 tot in
 * productie waar hij op bestaande rijen afbrak.
 */
export async function migreerVerder(
  db: Wegwerpdatabase,
  opties: { totNummer?: number } = {},
): Promise<{ toegepast: readonly string[] }> {
  const eigenaar = new pg.Client({
    connectionString: db.url,
    options: "-c search_path=intel,public",
  });
  await eigenaar.connect();
  try {
    const r = await migreer(
      eigenaar,
      opties.totNummer === undefined ? {} : { totNummer: opties.totNummer },
    );
    return { toegepast: r.toegepast };
  } finally {
    await eigenaar.end();
  }
}

/* ============================================================
   EEN CONCEPTVERSIE DIE ECHT DRAAGT
   ------------------------------------------------------------
   WAAROM DIT IN HET HARNAS HOORT. Tot de acceptatiecorrectie konden
   toetsen een inhoudsversie met één insert maken: wat tekst, een
   verzonnen `inhoud_afdruk` en `poorten_geslaagd = true`. Dat werkte
   omdat keurGoed() en publiceer() geen enkel uitspraakveld lazen.

   Nu lezen ze dat wel, en dus moet een fixture de hele keten hebben:
   een bron met een gezag, een document, een geclassificeerde versie,
   een claim met een modaliteit en een plafond, een PRIMAIRE binding, en
   een inhoudsversie die die bronversie in `invoer_versies` noemt. Tien
   toetsen in twee bestanden hadden dat nodig; één helper is beter dan
   tien keer dezelfde opzet, want tien kopieën lopen uiteen.

   DIT IS GEEN VERZWAKKING VAN DE POORT MAAR EEN FIXTURE DIE DE
   WERKELIJKHEID NASPEELT. De waarden komen uit de echte productieclaim
   die R3 behoudt: een feitelijke mededeling van RVO, bevoegd gezag,
   bewijskracht 4 met plafond 4, vastgesteld met zekerheid 0,80.
   ============================================================ */

export type DragendeVersie = {
  readonly versieId: number;
  readonly uitspraakId: number;
  readonly bronVersieId: number;
  readonly afdruk: string;
};

export async function maakDragendeVersie(
  db: Wegwerpdatabase,
  organisatieId: number,
  opties: {
    readonly slug: string;
    readonly status?: string;
    readonly risico?: "laag" | "midden" | "hoog";
    readonly aangemaaktDoor?: number | null;
    readonly bewerktDoor?: number | null;
    /** Overschrijft de documentsoort; voor zaken die juist NIET horen te dragen. */
    readonly documentsoort?: string;
    readonly gezag?: string;
    readonly modaliteit?: string;
    readonly modaliteitZekerheid?: number;
    readonly verificatieStatus?: string;
    readonly bewijsKwaliteit?: number;
    readonly bewijskrachtPlafond?: number | null;
    /**
     * De motorversiestempel. Standaard MOTORVERSIES, zoals
     * schrijfUitspraken() hem in productie zet. Geef expliciet `null`
     * mee om een claim te toetsen die NOG op herbeoordeling wacht.
     */
    readonly herbeoordeeldOnder?: string | null;
    /**
     * Maakt het concept ECHT publiceerbaar in plaats van alleen
     * claim-dragend.
     *
     * WAAROM DIT EEN OPTIE IS EN GEEN STANDAARD. Deze fixture zette
     * `poorten_geslaagd` hardgecodeerd op true zonder ooit een poort te
     * draaien. Dat hield zolang niemand hertoetste, maar sinds keurGoed()
     * na een goedkeuring zelf hertoetst, wordt die fictie vervangen door
     * de gemeten waarheid — en dan blijkt het concept op twee poorten te
     * staan die niets met claims te maken hebben: er staat geen
     * commerciele pagina in het register (poort 11b, blokkerend voor een
     * nieuw_artikel) en er is geen bronnensectie (poort 12). Een toets
     * die daarna "het bewijs draagt niet meer" verwacht, krijgt die
     * twee poorten te zien en meet dus iets anders dan hij beweert.
     *
     * Met `publiceerbaar: true` vult de fixture die twee aan: een
     * /contact-pagina in het register, een CTA naar /contact in de body,
     * en een bronnensectie met uitgever en https-URL. Dan is de ENIGE
     * overblijvende blokkade bij risico 'hoog' de menselijke goedkeuring,
     * en bij 'laag' is er geen enkele. De standaard blijft false, zodat
     * geen enkele bestaande toets van vorm verandert.
     */
    readonly publiceerbaar?: boolean;
    /**
     * De sleutel van de bron in intel.bronnen.
     *
     * WAAROM DIT UITMAAKT VOOR DE GENERATOR. weigerNieuws() in
     * scripts/seo/bouw-routes.mjs eist een DRAGENDE bron, en leidt die
     * soort af uit de uitgeverscategorie in het bronregister in CODE
     * (src/bronnen/register.ts). Een verzonnen sleutel staat daar niet
     * en valt terug op MARKTPARTIJ — die kan een bericht niet alleen
     * dragen, dus de generator maakt er GEEN pagina van. Een toets die
     * de echte websitebuild wil bewijzen, geeft hier dus een echte
     * sleutel mee (bijvoorbeeld 'acm-besluiten', uitgeverSoort
     * 'toezichthouder'). Standaard blijft de fixturesleutel, zodat geen
     * bestaande toets van vorm verandert.
     */
    readonly bronSleutel?: string;
  },
): Promise<DragendeVersie> {
  const titel = "Ondernemers krijgen in 2026 meer tijd voor hun SDE++-aanvraag";
  const directAntwoord =
    "De aanvraagtermijn voor de SDE++ loopt in 2026 twee weken langer door dan vorig jaar.";
  const bodyMarkdown = opties.publiceerbaar
    ? "De lead van het bericht.\n\n## Wat er is vastgelegd\n\nEen alinea.\n\n" +
      "## Wat dit voor u betekent\n\nWilt u weten wat dit betekent? [Plan een gesprek](/contact).\n"
    : "De lead van het bericht.\n\n## Wat er is vastgelegd\n\nEen alinea.\n";
  const bronnenSectie = opties.publiceerbaar
    ? [
        {
          uitgever: "Rijksdienst voor Ondernemend Nederland",
          url: "https://www.rvo.nl/subsidies-financiering/sde",
          datum: "2026-10-27",
        },
      ]
    : [];
  const interneLinks = opties.publiceerbaar ? ["/contact"] : [];
  const structuredData = { "@context": "https://schema.org", "@type": "Article" };
  const afdruk = inhoudAfdruk({ titel, directAntwoord, bodyMarkdown, structuredData });
  const pad = `/nieuws/${opties.slug}`;

  let uit: DragendeVersie = {
    versieId: 0,
    uitspraakId: 0,
    bronVersieId: 0,
    afdruk,
  };

  let kandidaatId: string | null = null;

  await alsEigenaar(db, async (c) => {
    await c.query("select set_config('app.organisatie_id', $1, false)", [String(organisatieId)]);

    if (opties.publiceerbaar) {
      /* commercieleSelectie() (inhoud/concept.ts) neemt soort
         'oplossing'/'systeem' plus het pad /contact; zonder zo'n rij
         levert het register nul commerciele paden en kan poort 11b
         niets vinden. */
      await c.query(
        `insert into intel.pagina_register
           (organisatie_id, pad, canonieke_url, soort, bestaat_in_repo, in_sitemap, beheer)
         values ($1, '/contact', 'https://www.vibeenergy.nl/contact', 'oplossing', true, true,
                 'handmatig')
         on conflict (organisatie_id, pad) do nothing`,
        [organisatieId],
      );

      /* EN EEN ONDERWERP-EIGENAAR, want publiceerViaRegister() weigert
         zonder. Hij leest het cluster van de KANDIDAAT en zoekt daarmee
         de nationale pagina die de zoekintentie bezit
         (CLUSTER_NAAR_ROUTE in site/routeregister.ts). Het cluster
         'netcongestie' wijst naar kennis/netcongestie-uitgelegd, en die
         route bestaat in het echte routeregister van de site — dus deze
         fixture werkt zowel tegen een minimale als tegen de ECHTE
         sitewortel. Zonder deze drie rijen weigert publiceren met "geen
         onderwerp-eigenaar te bepalen". */
      const cl = await c.query<{ id: string }>(
        `insert into intel.onderwerp_clusters (organisatie_id, sleutel, naam)
         values ($1, 'netcongestie', 'Netcongestie')
         on conflict (organisatie_id, sleutel) do update set naam = excluded.naam
         returning id::text`,
        [organisatieId],
      );
      const geb = await c.query<{ id: string }>(
        `insert into intel.markt_gebeurtenissen
           (organisatie_id, sleutel, titel, gebeurtenis_soort, onderwerp_cluster_id, risico_klasse)
         values ($1, $2, 'Fixture voor de publicatieketen', 'subsidie', $3::bigint, $4)
         returning id::text`,
        [organisatieId, `fixture-keten-${opties.slug}`, cl.rows[0]!.id, opties.risico ?? "laag"],
      );
      kandidaatId = (
        await c.query<{ id: string }>(
          `insert into intel.inhoud_kandidaten
             (organisatie_id, gebeurtenis_id, onderwerp_cluster_id, besluit, motor_versie, status)
           values ($1, $2::bigint, $3::bigint, 'NEWS_ITEM', 'fixture-keten', 'in_concept')
           returning id::text`,
          [organisatieId, geb.rows[0]!.id, cl.rows[0]!.id],
        )
      ).rows[0]!.id;
    }

    const bron = await c.query<{ id: number }>(
      `insert into intel.bronnen
         (organisatie_id, sleutel, uitgever, soort, endpoint_url, basis_url, actief,
          robots_status, tdm_status, verificatie_status, verificatie_bewijs,
          betrouwbaarheid, is_primaire_bron)
       values ($1, $2, 'Rijksdienst voor Ondernemend Nederland', 'rss',
               'https://www.rvo.nl/feed', 'https://www.rvo.nl', true,
               'toegestaan', 'geen_voorbehoud', 'geverifieerd', 'fixture', 4, true)
       on conflict (organisatie_id, sleutel) do update set uitgever = excluded.uitgever
       returning id`,
      [organisatieId, opties.bronSleutel ?? `rvo-${opties.slug}`],
    );
    const doc = await c.query<{ id: number }>(
      `insert into intel.brondocumenten
         (organisatie_id, bron_id, extern_id, canonieke_url, titel, uitgever, soort,
          gepubliceerd_op)
       values ($1, $2, $3, $4, $5, 'Rijksdienst voor Ondernemend Nederland', 'rss',
               current_date - 10)
       returning id`,
      [
        organisatieId,
        bron.rows[0]!.id,
        opties.slug,
        `https://www.rvo.nl/${opties.slug}`,
        "Aanvraagperiode SDE++ 2026",
      ],
    );
    const ruweTekst =
      "De aanvraagperiode voor de SDE++ 2026 loopt van 9 maart tot 2 april 2026 en " +
      "duurt daarmee twee weken langer dan vorig jaar.";
    const bv = await c.query<{ id: number }>(
      `insert into intel.brondocument_versies
         (organisatie_id, brondocument_id, versie, inhoud_hash, titel, ruwe_tekst,
          tekst_lengte, documentsoort, documentsoort_gezag, documentsoort_versie,
          documentsoort_grondslag)
       values ($1, $2, 1, $3, $4, $5, $6, $7, $8, $9, $10)
       returning id`,
      [
        organisatieId,
        doc.rows[0]!.id,
        `hash-${opties.slug}`,
        "Aanvraagperiode SDE++ 2026",
        ruweTekst,
        ruweTekst.length,
        opties.documentsoort ?? "FEITELIJKE_MEDEDELING",
        opties.gezag ?? "BEVOEGD_GEZAG",
        DOCUMENTSOORT_VERSIE,
        JSON.stringify({ uitleg: "fixture" }),
      ],
    );

    /* GEEN GEBEURTENIS. `uitspraken.gebeurtenis_id` is nullable (0003
       regel 174) en deze fixture gaat over de GOEDKEURKETEN, niet over
       de nieuwsselectie. Een gebeurtenis erbij zou een
       relevantiegrondslag en een geo-grondslag vragen die hier niets
       toetsen. */
    const u = await c.query<{ id: number }>(
      `insert into intel.uitspraken
         (organisatie_id, tekst, soort, waarde_numeriek, eenheid, onderwerp,
          verificatie_status, bewijs_kwaliteit,
          modaliteit, modaliteit_zekerheid, modaliteit_versie, modaliteit_grondslag,
          bewijskracht_plafond, herbeoordeeld_onder)
       values ($1, $2, 'datum', 2, 'week', 'subsidie',
               'ongeverifieerd', $3, $4, $5, $6, $7, $8, $9)
       returning id`,
      [
        organisatieId,
        "De aanvraagperiode voor de SDE++ 2026 loopt twee weken langer door.",
        opties.bewijsKwaliteit ?? 4,
        opties.modaliteit ?? "VASTGESTELD",
        opties.modaliteitZekerheid ?? 0.8,
        MODALITEIT_VERSIE,
        JSON.stringify({ uitleg: "fixture" }),
        opties.bewijskrachtPlafond === undefined ? 4 : opties.bewijskrachtPlafond,
        /* DE STEMPEL, zoals schrijfUitspraken() hem in productie zet.
           Zonder hem leest de claimpoort deze fixture als "nog te
           herbeoordelen" en blijft hij DICHT — en dan toetst een
           fixture iets anders dan productie doet. Gemeten: 22
           integratietoetsen vielen daarop om, met "aanname: de poort
           staat weer open" als foutregel.

           Wie een claim MET een openstaande herbeoordeling wil
           toetsen, geeft herbeoordeeldOnder expliciet mee als null. */
        opties.herbeoordeeldOnder === undefined ? MOTORVERSIES : opties.herbeoordeeldOnder,
      ],
    );
    /* EERST DE BINDING, DAN DE STATUS. De constraint trigger
       `uitspraken_bewijsplicht` (0003 regel 292-317) weigert
       'bevestigd' zonder primaire bronversie. Hij is DEFERRABLE
       INITIALLY DEFERRED en vuurt dus bij de commit, maar deze orde
       maakt de bedoeling zichtbaar: de binding IS het bewijs. */
    await c.query(
      `insert into intel.uitspraak_bronnen (organisatie_id, uitspraak_id, versie_id, rol)
       values ($1, $2, $3, 'primair')`,
      [organisatieId, u.rows[0]!.id, bv.rows[0]!.id],
    );
    await c.query("update intel.uitspraken set verificatie_status = $2 where id = $1", [
      u.rows[0]!.id,
      opties.verificatieStatus ?? "bevestigd",
    ]);

    const v = await c.query<{ id: number }>(
      `insert into intel.inhoud_versies
         (organisatie_id, pad, versie, soort, titel, meta_omschrijving, canonieke_url,
          direct_antwoord, body_markdown, structured_data, status, risico_klasse,
          auteur_soort, poorten_geslaagd, inhoud_afdruk, invoer_versies,
          aangemaakt_door, bewerkt_door, bronnen_sectie, interne_links, kandidaat_id)
       values ($1, $2, 1, 'nieuw_artikel', $3,
               'Een metabeschrijving die lang genoeg is om de lengtepoort van het concept te halen.',
               'https://www.vibeenergy.nl' || $2,
               $4, $5, $6, $7, $8, 'ai', true, $9, array[$10::bigint], $11, $12,
               $13::jsonb, $14::jsonb, $15::bigint)
       returning id`,
      [
        organisatieId,
        pad,
        titel,
        directAntwoord,
        bodyMarkdown,
        JSON.stringify(structuredData),
        opties.status ?? "ter_review",
        opties.risico ?? "laag",
        afdruk,
        bv.rows[0]!.id,
        opties.aangemaaktDoor ?? null,
        opties.bewerktDoor ?? null,
        /* Beide kolommen zijn NOT NULL met default '[]' (migratie 0004
           regel 182-183), dus een lege lijst is exact wat elke bestaande
           toets al zag. */
        JSON.stringify(bronnenSectie),
        JSON.stringify(interneLinks),
        kandidaatId,
      ],
    );

    await c.query(
      `insert into intel.inhoud_uitspraken
         (organisatie_id, inhoud_versie_id, uitspraak_id, rol)
       values ($1, $2, $3, 'kern')`,
      [organisatieId, v.rows[0]!.id, u.rows[0]!.id],
    );

    uit = {
      versieId: v.rows[0]!.id,
      uitspraakId: u.rows[0]!.id,
      bronVersieId: bv.rows[0]!.id,
      afdruk,
    };
  });

  return uit;
}

/**
 * Een GEVERIFIEERDE menselijke actor voor de publicatieketen.
 *
 * Sinds de auditcorrectie is `actor` een verplichte parameter van
 * publiceer(), draaiTerug() en maakPublicatiePr(), en die actor komt
 * alleen uit verifieerMens() — die de gebruiker, zijn organisatie, zijn
 * actief-zijn en zijn RECHT in de database toetst. Een toets kan dus geen
 * actor verzinnen, en dat is precies de bedoeling: een fixture die een
 * identiteit mag faken, toetst de grendel niet die in productie geldt.
 *
 * De gebruiker moet het recht `inhoud.publiceren` hebben; de rollen
 * `beheerder` en `redacteur` dragen dat (migratie 0001).
 */
export async function actorVan(
  db: Wegwerpdatabase,
  organisatieId: number,
  gebruikerId: number,
): Promise<Actor> {
  return metOrganisatie(db.pool, { organisatieId }, (c) =>
    verifieerMens(c, organisatieId, { gebruikerId }),
  );
}

/** Alle invariantbevindingen; leeg betekent dat de aannames kloppen. */
export async function invarianten(db: Wegwerpdatabase): Promise<string[]> {
  return zonderOrganisatie(db.pool, async (c) => {
    const a = await c.query<{ r: string }>(
      "select soort || ': ' || bevinding as r from intel_priv.controleer_invarianten()",
    );
    const b = await c.query<{ r: string }>(
      "select soort || ': ' || bevinding as r from intel_priv.controleer_inhoudsinvarianten()",
    );
    return [...a.rows, ...b.rows].map((x) => x.r);
  });
}
