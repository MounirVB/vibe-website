/* ============================================================
   INHOUD — automatische publicatie, het handhavingspunt
   ------------------------------------------------------------
   WAT HIER BIJKOMT, en wat er met opzet NIET bijkomt.

   intel.publicatiebeleid draagt sinds migratie 0004 de velden
   auto_publiceren_aan, auto_max_risico, auto_toegestane_soorten,
   auto_min_bronnen en auto_min_bewijskwaliteit. Gemeten op 5 november
   2026 keek geen enkele regel code ernaar behalve het dashboard (voor
   de weergave) en cli/e2e.ts (die toetst DAT geen beleidsregel hoog
   risico toestaat). Geen van de zeventien plannertaken publiceerde.

   Het beleid was dus een intentieverklaring zonder handhaving. Deze
   module is de handhaving — en niets meer dan dat. Het SCHRIJVEN van
   een pagina, het bijwerken van de sitemap, de hertoets van het bewijs
   en het terugdraaien blijven in publiceer.ts, dat werkt en bewezen is.

   ------------------------------------------------------------
   DE NEGEN VOORWAARDEN, EN WIE ZE BEWAAKT

   Niet alles hoort hier. Een voorwaarde die de database kan afdwingen,
   hoort in de database; een voorwaarde die publiceer() al hertoetst,
   hoort niet twee keer geschreven te worden. De verdeling:

     1 alle blokkerende poorten geslaagd   DB + publiceer()
     2 risico binnen het beleidsmaximum    HIER (en DB voor 'hoog')
     3 artikelsoort expliciet toegestaan   HIER
     4 minimum onafhankelijke bronnen      HIER
     5 minimale bewijskwaliteit            HIER
     6 geen bronconflict of verlopen claim publiceer() -> toetsGebondenBewijs
     7 het artikel is actueel              HIER
     8 geen eerdere publicatie van dezelfde inhoud  HIER + publiceer()
     9 beleid expliciet geactiveerd        HIER, als eerste

   HOOG RISICO STAAT OP DRIE NIVEAUS DICHT. Het beleid kan niet op
   (auto aan + max hoog) staan: publicatiebeleid_hoog_risico_nooit_-
   automatisch. De versierij kan niet (goedkeuring_soort 'beleid' +
   risico hoog) dragen: inhoud_versies_beleid_nooit_hoog_risico. En
   deze module weigert het ongeacht wat het beleid zegt. Drie keer
   hetzelfde, want dit is de regel die onder geen enkele configuratie
   mag wijken.

   ------------------------------------------------------------
   FAIL-CLOSED, EN WAT DAT HIER BETEKENT

   Elke onzekerheid is een weigering met een reden, nooit een
   doorlaten. Geen beleidsrij: weigeren. Beleid uit: weigeren. Lijst
   met toegestane soorten leeg: weigeren (en dat is de
   STANDAARDtoestand — auto_toegestane_soorten is '{}' bij het zaaien).
   Geen gebeurtenisdatum: weigeren. Bewijs niet te lezen omdat er een
   herbeoordeling loopt: weigeren.

   De weigeringen komen met reden terug in het rapport, zodat in het
   taaklog staat waarom er niets is gepubliceerd. Een nieuwskanaal dat
   stilstaat moet zichtbaar stilstaan.

   ------------------------------------------------------------
   IDEMPOTENT

   Twee keer draaien publiceert niet twee keer. Drie dingen zorgen
   daarvoor, en ze dekken verschillende races:

     * de werkvoorraad vraagt status 'ter_review'; na een geslaagde
       ronde staat de versie op 'gepubliceerd' en valt hij eruit;
     * voorwaarde 8 toetst de inhoudsafdruk tegen intel.publicaties, en
       die afdruk verandert niet door opnieuw te draaien;
     * publiceer() zelf weigert een versie die niet 'goedgekeurd' is en
       hertoetst het bewijs onder een slot.
   ============================================================ */

import type { Pool } from "pg";
import { metOrganisatie, rijen, eenRij } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import { publiceer } from "./publiceer.ts";
import { legPublicatieAuditVast, legPublicatiebesluitVast, systeemActor } from "./actor.ts";
import { hertoetsInhoudVersie, inhoudAfdruk } from "./concept.ts";
import { IntelFout } from "../kern/fouten.ts";
import { toetsGebondenBewijs, bewijsDraagt } from "../pijplijn/claimpoort.ts";
import { herkenOnderwerpen } from "../pijplijn/onderwerpen.ts";

const log = maakLogger("autopublicatie");

/**
 * Hoe oud mag de gebeurtenis onder een automatisch artikel zijn?
 *
 * DERTIG DAGEN, en dat is strenger dan de voorstelpoort met opzet. Die
 * poort staat op een jaar (voorstel.ts: "de bron is X dagen oud, meer
 * dan een jaar") en dat is juist voor een KENNISpagina: een nettarief
 * van elf maanden oud is nog steeds de staande stand van zaken.
 *
 * Een NIEUWSkanaal is iets anders. Een bericht over een ontwikkeling
 * van vier maanden terug is geen nieuws, en het publiceren ervan zonder
 * dat iemand keek is precies de massaproductie die hier niet hoort. Het
 * getal staat hier als constante omdat het een redactionele keuze is en
 * geen meting; wie hem wil verruimen, ziet meteen wat hij verruimt.
 */
export const MAX_GEBEURTENIS_LEEFTIJD_DAGEN = 30;

/** Hoeveel onderwerptermen twee gebeurtenissen moeten delen om 'hetzelfde onderwerp' te zijn. */
const GEDEELDE_TERMEN_DREMPEL = 2;

/** De ordening van risicoklassen, laag naar hoog. */
const RISICO_ORDE: readonly string[] = ["laag", "midden", "hoog"];

function risicoBinnen(klasse: string, maximum: string | null): boolean {
  if (maximum === null) return false;
  const k = RISICO_ORDE.indexOf(klasse);
  const m = RISICO_ORDE.indexOf(maximum);
  /* Een onbekende klasse of een onbekend maximum is GEEN doorlaat. */
  if (k === -1 || m === -1) return false;
  return k <= m;
}

export type Beleid = {
  readonly versie: string;
  readonly autoAan: boolean;
  /**
   * Mag het platform ook ZELF naar main mergen?
   *
   * EEN TWEEDE SCHAKELAAR, EN DAARMEE EEN TWEEDE BESLUIT (migratie
   * 0058). Staat hij uit, dan keurt deze module goed en schrijft hij
   * het registerrecord zoals altijd — de bestaande weg, waarbij een
   * mens de PR opent. Staat hij AAN, dan stopt deze module ná de
   * goedkeuring en neemt de uitgiftelaag het over, want die kan het
   * record door een uitvoerder met een echte werkboom laten schrijven.
   */
  readonly uitgifteAan: boolean;
  readonly maxRisico: string | null;
  readonly toegestaneSoorten: readonly string[];
  readonly minBronnen: number;
  readonly minBewijskwaliteit: number;
};

export type Weigering = {
  readonly inhoudVersieId: number;
  readonly pad: string;
  /** Welke van de negen voorwaarden het blokkeerde. */
  readonly voorwaarde: string;
  readonly reden: string;
};

export type Gepubliceerd = {
  readonly inhoudVersieId: number;
  readonly pad: string;
  readonly publicatieId: number | null;
  readonly sitemapBijgewerkt: boolean;
};

export type AutoPublicatieRapport = {
  readonly beleid: Beleid | null;
  /**
   * Goedgekeurd, en nu wachtend op de uitgiftelaag.
   *
   * Dit is de uitkomst wanneer auto_uitgifte_aan AAN staat: de
   * goedkeuring is er, het registerrecord nog niet, want dat schrijft
   * een uitvoerder met een echte werkboom. Zie uitgifte/opdracht.ts.
   */
  readonly wachtOpUitgifte: readonly { readonly inhoudVersieId: number; readonly pad: string }[];
  /** Waarom er niets is gedaan, als het beleid het niet toestaat. */
  readonly beleidReden: string | null;
  readonly bekeken: number;
  readonly gepubliceerd: readonly Gepubliceerd[];
  readonly geweigerd: readonly Weigering[];
  readonly droog: boolean;
};

/** Het actieve beleid, of null als er geen actieve rij is. */
export async function leesBeleid(
  c: Parameters<typeof rijen>[0],
  organisatieId: number,
): Promise<Beleid | null> {
  const r = await rijen<{
    versie: string;
    auto_publiceren_aan: boolean;
    auto_uitgifte_aan: boolean;
    auto_max_risico: string | null;
    auto_toegestane_soorten: string[] | null;
    auto_min_bronnen: number;
    auto_min_bewijskwaliteit: number;
  }>(
    c,
    `select versie, auto_publiceren_aan, auto_uitgifte_aan, auto_max_risico,
            auto_toegestane_soorten, auto_min_bronnen, auto_min_bewijskwaliteit
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
    toegestaneSoorten: b.auto_toegestane_soorten ?? [],
    minBronnen: b.auto_min_bronnen,
    minBewijskwaliteit: b.auto_min_bewijskwaliteit,
  };
}

/**
 * De volledige ronde.
 *
 * `droog` doet alle toetsen en publiceert niets — bedoeld om te zien
 * WAT er zou gebeuren voordat het beleid aangaat.
 */
export async function automatischPubliceren(
  pool: Pool,
  organisatieId: number,
  opties: { readonly droog?: boolean; readonly max?: number } = {},
): Promise<AutoPublicatieRapport> {
  const droog = opties.droog === true;
  const max = opties.max ?? 10;

  /* ---------- VOORWAARDE 9, ALS EERSTE ----------
     Zonder actief beleid dat auto_publiceren_aan draagt, wordt er
     niets gelezen en niets geschreven. Dit is de standaardtoestand. */
  const voorbereiding = await metOrganisatie(pool, { organisatieId }, async (c) => {
    const beleid = await leesBeleid(c, organisatieId);
    if (beleid === null) {
      return { beleid, reden: "er is geen ACTIEVE beleidsrij; zonder beleid publiceert dit platform niet" };
    }
    if (!beleid.autoAan) {
      return {
        beleid,
        reden:
          `beleid '${beleid.versie}' heeft auto_publiceren_aan = false. Dat is de standaard en ` +
          `de enige toestand waarin dit platform nooit zelf publiceert`,
      };
    }
    if (beleid.toegestaneSoorten.length === 0) {
      return {
        beleid,
        reden:
          `beleid '${beleid.versie}' staat auto_publiceren toe maar auto_toegestane_soorten is LEEG. ` +
          `Een lege lijst is geen jokerteken: er is dan geen enkele soort toegestaan`,
      };
    }
    if (beleid.maxRisico === null) {
      return {
        beleid,
        reden: `beleid '${beleid.versie}' heeft geen auto_max_risico; zonder maximum is niets toegestaan`,
      };
    }
    return { beleid, reden: null as string | null };
  });

  if (voorbereiding.reden !== null) {
    log.info("automatische publicatie staat uit", { reden: voorbereiding.reden });
    return {
      beleid: voorbereiding.beleid,
      beleidReden: voorbereiding.reden,
      bekeken: 0,
      gepubliceerd: [],
      geweigerd: [],
      wachtOpUitgifte: [],
      droog,
    };
  }
  const beleid = voorbereiding.beleid!;

  /* ---------- DE WERKVOORRAAD ----------
     Alleen versies die op review staan MET geslaagde poorten en zonder
     blokkades. De poortcontrole staat hier al in de query, zodat een
     versie die hem niet haalt nooit in de kandidaatlijst komt. */
  type Kandidaat = {
    id: number;
    pad: string;
    soort: string;
    risico_klasse: string;
    status: string;
    inhoud_afdruk: string | null;
    kandidaat_id: number | null;
    gebeurtenis_id: number | null;
    gebeurtenis_titel: string | null;
    gebeurd_op: string | null;
    heeft_tegenspraak: boolean | null;
  };

  const kandidaten = await metOrganisatie(pool, { organisatieId }, (c) =>
    rijen<Kandidaat>(
      c,
      `select v.id, v.pad, v.soort, v.risico_klasse, v.status, v.inhoud_afdruk,
              v.kandidaat_id, k.gebeurtenis_id,
              g.titel as gebeurtenis_titel, g.gebeurd_op::text as gebeurd_op,
              g.heeft_tegenspraak
         from intel.inhoud_versies v
         left join intel.inhoud_kandidaten k on k.id = v.kandidaat_id
         left join intel.markt_gebeurtenissen g on g.id = k.gebeurtenis_id
        where v.organisatie_id = $1
          and v.status = 'ter_review'
          and v.poorten_geslaagd
          and cardinality(v.blokkades) = 0
        order by v.id
        limit $2`,
      [organisatieId, max],
    ),
  );

  const geweigerd: Weigering[] = [];
  const gepubliceerd: Gepubliceerd[] = [];
  const wachtOpUitgifte: { inhoudVersieId: number; pad: string }[] = [];

  for (const v of kandidaten) {
    const weiger = (voorwaarde: string, reden: string) => {
      geweigerd.push({ inhoudVersieId: v.id, pad: v.pad, voorwaarde, reden });
      log.info("automatische publicatie geweigerd", { versie: v.id, voorwaarde, reden: reden.slice(0, 200) });
    };

    /* ---------- VOORWAARDE 2 ---------- */
    if (v.risico_klasse === "hoog") {
      weiger(
        "2 risico",
        "risicoklasse HOOG vereist altijd een menselijke goedkeuring, ongeacht het beleid. " +
          "Dit staat ook in de database afgedwongen op twee niveaus",
      );
      continue;
    }
    if (!risicoBinnen(v.risico_klasse, beleid.maxRisico)) {
      weiger(
        "2 risico",
        `risicoklasse '${v.risico_klasse}' valt buiten het beleidsmaximum '${beleid.maxRisico}'`,
      );
      continue;
    }

    /* ---------- VOORWAARDE 3 ---------- */
    if (!beleid.toegestaneSoorten.includes(v.soort)) {
      weiger(
        "3 soort",
        `soort '${v.soort}' staat niet in auto_toegestane_soorten ` +
          `(${beleid.toegestaneSoorten.join(", ")})`,
      );
      continue;
    }

    /* ---------- VOORWAARDEN 4 EN 5 ----------
       De bronnen worden geteld over de PRIMAIRE bindingen van de
       gebonden claims, en onafhankelijk betekent: een andere bron in
       intel.bronnen. Twee documenten van dezelfde uitgever zijn één
       bron, want ze kunnen elkaar niet corroboreren. */
    const bewijsstand = await metOrganisatie(pool, { organisatieId }, (c) =>
      eenRij<{ bronnen: number; beste_kwaliteit: number | null; claims: number; verlopen: number }>(
        c,
        `select count(distinct bd.bron_id)::int                       as bronnen,
                max(u.bewijs_kwaliteit)::int                          as beste_kwaliteit,
                count(distinct u.id)::int                             as claims,
                count(distinct u.id) filter (
                  where u.geldig_tot is not null and u.geldig_tot < current_date
                )::int                                               as verlopen
           from intel.inhoud_uitspraken iu
           join intel.uitspraken u on u.id = iu.uitspraak_id
           left join intel.uitspraak_bronnen ub
                  on ub.uitspraak_id = u.id and ub.rol = 'primair'
           left join intel.brondocument_versies bv on bv.id = ub.versie_id
           left join intel.brondocumenten bd on bd.id = bv.brondocument_id
          where iu.organisatie_id = $1 and iu.inhoud_versie_id = $2`,
        [organisatieId, v.id],
      ),
    );
    const bronnen = bewijsstand?.bronnen ?? 0;
    const besteKwaliteit = bewijsstand?.beste_kwaliteit ?? 0;
    if (bronnen < beleid.minBronnen) {
      weiger(
        "4 bronnen",
        `${bronnen} onafhankelijke bron(nen) onder ${bewijsstand?.claims ?? 0} gebonden claim(s); ` +
          `het beleid eist ${beleid.minBronnen}`,
      );
      continue;
    }
    if (besteKwaliteit < beleid.minBewijskwaliteit) {
      weiger(
        "5 bewijskwaliteit",
        `beste bewijskwaliteit ${besteKwaliteit}; het beleid eist ${beleid.minBewijskwaliteit}`,
      );
      continue;
    }

    /* ---------- VOORWAARDE 6, het deel dat publiceer() niet ziet ----------
       publiceer() hertoetst het gebonden bewijs onder een slot. Wat
       hij NIET weet is of de gebeurtenis zelf tegenspraak draagt, en
       of een gebonden claim zijn geldigheid heeft overleefd. Beide
       hier, vóór de goedkeuring — want een goedkeuring intrekken is
       lastiger dan hem niet geven. */
    if (v.heeft_tegenspraak === true) {
      weiger("6 conflict", "de gebeurtenis draagt tegenspraak tussen bronnen");
      continue;
    }
    if ((bewijsstand?.verlopen ?? 0) > 0) {
      weiger("6 conflict", `${bewijsstand?.verlopen} gebonden claim(s) zijn over hun geldig_tot`);
      continue;
    }
    const bewijs = await metOrganisatie(pool, { organisatieId }, (c) =>
      toetsGebondenBewijs(c, organisatieId, v.id),
    );
    if (!bewijsDraagt(bewijs)) {
      weiger("6 conflict", `het bewijs draagt niet: ${bewijs.blokkades.join(" | ")}`);
      continue;
    }

    /* ---------- VOORWAARDE 7 ---------- */
    if (v.gebeurd_op === null) {
      weiger("7 actualiteit", "de gebeurtenis heeft geen datum; zonder datum is actualiteit niet te meten");
      continue;
    }
    const dagen = Math.round((Date.now() - Date.parse(v.gebeurd_op)) / 86_400_000);
    if (dagen > MAX_GEBEURTENIS_LEEFTIJD_DAGEN) {
      weiger(
        "7 actualiteit",
        `de gebeurtenis is ${dagen} dagen oud; de grens voor automatische publicatie is ` +
          `${MAX_GEBEURTENIS_LEEFTIJD_DAGEN} dagen`,
      );
      continue;
    }
    /* IS ER IETS NIEUWERS OVER HETZELFDE ONDERWERP? Dezelfde maatstaf
       als de voorstelpoort: twee gedeelde onderwerptermen. Eén term is
       bij deze bronnen bijna altijd 'energie' of 'net'. */
    if (v.gebeurtenis_titel !== null && v.gebeurtenis_id !== null) {
      const mijn = new Set(
        herkenOnderwerpen(v.gebeurtenis_titel, "").flatMap((t) =>
          t.termen.map((x) => x.replace(/^(titel|body):/, "").toLowerCase()),
        ),
      );
      const nieuwer = await metOrganisatie(pool, { organisatieId }, (c) =>
        rijen<{ id: number; titel: string; gebeurd_op: string }>(
          c,
          `select id, titel, gebeurd_op::text as gebeurd_op
             from intel.markt_gebeurtenissen
            where organisatie_id = $1 and id <> $2
              and gebeurd_op is not null and gebeurd_op > $3::timestamptz
            order by gebeurd_op desc
            limit 50`,
          [organisatieId, v.gebeurtenis_id, v.gebeurd_op],
        ),
      );
      const achterhaaldDoor = nieuwer.find((n) => {
        const hun = new Set(
          herkenOnderwerpen(n.titel, "").flatMap((t) =>
            t.termen.map((x) => x.replace(/^(titel|body):/, "").toLowerCase()),
          ),
        );
        return [...mijn].filter((t) => hun.has(t)).length >= GEDEELDE_TERMEN_DREMPEL;
      });
      if (achterhaaldDoor !== undefined) {
        weiger(
          "7 actualiteit",
          `achterhaald door gebeurtenis ${achterhaaldDoor.id} van ` +
            `${achterhaaldDoor.gebeurd_op.slice(0, 10)}: '${achterhaaldDoor.titel.slice(0, 60)}'`,
        );
        continue;
      }
    }

    /* ---------- VOORWAARDE 8 ----------
       Dezelfde INHOUD, niet hetzelfde pad. Een pagina mag een tweede
       versie krijgen; dezelfde tekst twee keer publiceren is een
       duplicaat. De afdruk is de maat. */
    if (v.inhoud_afdruk === null) {
      weiger("8 duplicaat", "de versie heeft geen inhoudsafdruk; zonder afdruk is een duplicaat niet te zien");
      continue;
    }
    const alGepubliceerd = await metOrganisatie(pool, { organisatieId }, (c) =>
      eenRij<{ n: number; eerdere: number | null }>(
        c,
        /* STATUS 'geschreven' IS DE LEVENDE PUBLICATIE.
           Mijn eerste versie filterde op 'geslaagd', en die waarde
           bestaat niet: de CHECK op intel.publicaties staat alleen
           'geschreven', 'teruggedraaid' en 'mislukt' toe. Daarmee
           matchte de duplicaatcontrole NOOIT en kon dezelfde afdruk
           twee keer gepubliceerd worden. Een eigen toets ving het —
           zaak 4b — en dat is precies waarom die zaak er is.

           'teruggedraaid' hoort hier NIET bij te staan: een
           terugdraaiing bestaat juist om opnieuw te kunnen publiceren.
           'mislukt' ook niet: dan staat er niets live. */
        `select count(*)::int as n, min(p.inhoud_versie_id)::int as eerdere
           from intel.publicaties p
           join intel.inhoud_versies w on w.id = p.inhoud_versie_id
          where p.organisatie_id = $1 and w.inhoud_afdruk = $2
            and p.status = 'geschreven'`,
        [organisatieId, v.inhoud_afdruk],
      ),
    );
    if ((alGepubliceerd?.n ?? 0) > 0) {
      weiger(
        "8 duplicaat",
        `deze inhoud is al gepubliceerd als versie ${alGepubliceerd?.eerdere}; ` +
          `dezelfde afdruk twee keer publiceren is een duplicaat`,
      );
      continue;
    }

    /* ---------- ALLE NEGEN GEHAALD ---------- */
    if (droog) {
      gepubliceerd.push({ inhoudVersieId: v.id, pad: v.pad, publicatieId: null, sitemapBijgewerkt: false });
      continue;
    }

    /* DE GOEDKEURING DOOR BELEID. `goedgekeurd_door` blijft NULL, want
       er was geen mens — zie migratie 0052 voor waarom dat eerlijker is
       dan een gebruikersrij die 'systeem' heet. De afdruk wordt mee
       vastgelegd, zodat tekstwijziging na goedkeuring publiceren
       onmogelijk blijft maken. */
    const actor = systeemActor("autopublicatie:goedkeuring", { beleidVersie: beleid.versie });
    const motivatie =
      `automatisch goedgekeurd onder beleid '${beleid.versie}': risico ${v.risico_klasse} ` +
      `binnen ${beleid.maxRisico}, soort ${v.soort} toegestaan, ${bronnen} onafhankelijke ` +
      `bron(nen) >= ${beleid.minBronnen}, bewijskwaliteit ${besteKwaliteit} >= ` +
      `${beleid.minBewijskwaliteit}, gebeurtenis ${dagen} dagen oud`;

    const goedkeuring = await metOrganisatie(pool, { organisatieId }, async (c) => {
      /* ---- DE AFDRUK MOET BIJ DE TEKST HOREN, NU AL ----
         Dezelfde controle die keurGoed() voor een mens doet
         (publiceer.ts:1410-1429), en om dezelfde reden: de goedkeuring
         bindt `goedgekeurde_afdruk` aan `inhoud_afdruk`, en die hele
         keten is waardeloos als de opgeslagen afdruk niet bij de
         opgeslagen tekst past. Dan bindt de goedkeuring aan een hash van
         iets anders.

         Zonder deze controle merkte de ronde dat pas aan een
         constraintfout uit de hertoets hieronder — een kale
         `inhoud_versies_goedkeuring_bindt` in het taaklog in plaats van
         een reden. Gemeten: de fixture van de bestaande suite droeg een
         VERZONNEN afdruk, en dat is precies de toestand die een
         rechtstreekse databasewijziging ook oplevert. */
      const tekst = await eenRij<{
        titel: string;
        direct_antwoord: string | null;
        body_markdown: string;
        structured_data: unknown;
        inhoud_afdruk: string | null;
      }>(
        c,
        `select titel, direct_antwoord, body_markdown, structured_data, inhoud_afdruk
           from intel.inhoud_versies where organisatie_id = $1 and id = $2`,
        [organisatieId, v.id],
      );
      if (tekst === null) return { ok: false as const, reden: "race" };
      const nu = inhoudAfdruk({
        titel: tekst.titel,
        directAntwoord: tekst.direct_antwoord ?? "",
        bodyMarkdown: tekst.body_markdown,
        structuredData: tekst.structured_data,
      });
      if (tekst.inhoud_afdruk !== nu) {
        throw new IntelFout(
          "validatie",
          `de opgeslagen inhoudsafdruk (${tekst.inhoud_afdruk?.slice(0, 12) ?? "GEEN"}) hoort niet ` +
            `bij de huidige tekst (${nu.slice(0, 12)}); deze versie is niet automatisch goed te keuren`,
        );
      }

      const r = await c.query(
        `update intel.inhoud_versies
            set status             = 'goedgekeurd',
                goedkeuring_soort  = 'beleid',
                goedkeurend_beleid = $3,
                goedgekeurde_afdruk = inhoud_afdruk,
                goedgekeurd_op     = now(),
                bijgewerkt_op      = now()
          where organisatie_id = $1 and id = $2
            and status = 'ter_review'
            and risico_klasse <> 'hoog'
            and poorten_geslaagd
            and cardinality(blokkades) = 0`,
        [organisatieId, v.id, beleid.versie],
      );
      if ((r.rowCount ?? 0) === 0) return { ok: false as const, reden: "race" };

      /* ---- EN DE POORTEN OPNIEUW, MET DE GOEDKEURING ERIN ----
         Dit is wat de MENSELIJKE weg sinds #78 doet (publiceer.ts:1463
         e.v.) en wat hier ontbrak: de UPDATE hierboven zette de status
         en raakte `poorten_geslaagd` en `blokkades` niet aan. Voor de
         twee menspoorten maakt dat hier niets uit — deze module weigert
         risico 'hoog' al drie regels eerder — maar de hertoets draait
         ook alle INHOUDELIJKE poorten plus toetsGebondenBewijs()
         opnieuw, en dat is precies de meting die je wil hebben op het
         moment dat een machine zonder mens goedkeurt.

         Faalt hij, dan rollen we de goedkeuring TERUG door te werpen.
         De menselijke weg laat een mislukte hertoets staan (een mens kan
         de tekst aanpassen en opnieuw proberen); een autonome ronde
         heeft dat niemand, dus een goedkeuring die niet kan publiceren
         hoort niet te blijven staan. */
      const h = await hertoetsInhoudVersie(c, organisatieId, v.id);
      if (h !== null && !h.poortenGeslaagd) {
        throw new IntelFout(
          "validatie",
          `de hertoets na de beleidsgoedkeuring faalt: ${h.blokkades.join(" | ")}`,
        );
      }

      /* ÉÉN SCHRIJFPAD, OOK HIER. Tot 9 november 2026 stond hier een
         eigen insert met 'systeem' in de hand gezet en zonder fase, en
         er werd geen auditregel geschreven. Daarmee omzeilde juist de
         enige handeling die nooit een mens heeft het schrijfpad dat voor
         die vraag is gebouwd (#79). */
      await legPublicatiebesluitVast(c, {
        organisatieId,
        inhoudVersieId: v.id,
        besluit: "goedgekeurd",
        fase: "GOEDGEKEURD",
        actor,
        motivatie,
        meting: {
          risico: v.risico_klasse,
          soort: v.soort,
          bronnen,
          bewijskwaliteit: besteKwaliteit,
          gebeurtenisLeeftijdDagen: dagen,
          poortenNaHertoets: h === null ? null : h.poortenGeslaagd,
        },
      });
      await legPublicatieAuditVast(c, {
        organisatieId,
        actor,
        handeling: "beleidsgoedkeuring",
        objectId: v.id,
        naWaarde: { pad: v.pad, status: "goedgekeurd", goedkeuring_soort: "beleid" },
        motivatie,
        herkomst: "taak",
      });
      return { ok: true as const, reden: "" };
    }).catch((e: unknown) => ({ ok: false as const, reden: (e as Error).message }));

    if (!goedkeuring.ok) {
      /* DE RACE. Tussen de werkvoorraad en deze update kan een mens of
         een andere ronde de versie hebben aangeraakt. De update eist de
         toestand opnieuw; raakt hij nul rijen, dan is er iets veranderd
         en publiceren we niet. */
      weiger(
        "9 race",
        goedkeuring.reden === "race"
          ? "de versie is tussen de selectie en de goedkeuring van toestand veranderd"
          : `de goedkeuring is teruggerold: ${goedkeuring.reden}`,
      );
      continue;
    }

    /* ---------- STOPPEN ALS DE UITGIFTELAAG HET OVERNEEMT ----------
       Met auto_uitgifte_aan AAN schrijft deze module het registerrecord
       NIET. Dat is geen taakverdeling uit netheid maar uit noodzaak:
       publiceer() heeft een werkboom van de site nodig, en op de plek
       waar deze taak draait — de Railway-container — bestaat die niet
       (gemeten 9 november 2026: geen /data/inhoud, geen .git, geen
       generator). De uitgiftelaag laat het record schrijven door een
       uitvoerder die de hele repo heeft, en controleert de bytes op hun
       hash. Zie uitgifte/opdracht.ts.

       De goedkeuring hierboven is al vastgelegd met fase GOEDGEKEURD;
       de versie staat dus klaar in de uitgiftewachtrij. */
    if (beleid.uitgifteAan) {
      wachtOpUitgifte.push({ inhoudVersieId: v.id, pad: v.pad });
      log.info("goedgekeurd en doorgegeven aan de uitgifte", {
        versie: v.id,
        pad: v.pad,
        beleid: beleid.versie,
      });
      continue;
    }

    /* DE SYSTEEMACTOR, MET ZIJN GROND. Dit is de ENIGE plek in de keten
       die zonder mens publiceert, en daarom de enige die systeemActor()
       mag gebruiken. De grond noemt het beleid dat het toestond, zodat
       het logboek 'systeem' nooit zonder uitleg laat staan. */
    const rapport = await publiceer(pool, organisatieId, v.id, {
      actor: systeemActor("autopublicatie:record", { beleidVersie: beleid.versie }),
    });
    if (rapport.publicatieId === null) {
      weiger("1 poorten", `publiceer() weigerde: ${rapport.reden}`);
      continue;
    }
    gepubliceerd.push({
      inhoudVersieId: v.id,
      pad: v.pad,
      publicatieId: rapport.publicatieId,
      sitemapBijgewerkt: rapport.sitemapBijgewerkt,
    });
    log.info("automatisch gepubliceerd", {
      versie: v.id,
      pad: v.pad,
      publicatie: rapport.publicatieId,
      beleid: beleid.versie,
    });
  }

  return {
    beleid,
    beleidReden: null,
    bekeken: kandidaten.length,
    gepubliceerd,
    geweigerd,
    wachtOpUitgifte,
    droog,
  };
}
