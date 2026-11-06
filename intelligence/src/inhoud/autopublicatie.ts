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
import { systeemActor } from "./actor.ts";
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
    auto_max_risico: string | null;
    auto_toegestane_soorten: string[] | null;
    auto_min_bronnen: number;
    auto_min_bewijskwaliteit: number;
  }>(
    c,
    `select versie, auto_publiceren_aan, auto_max_risico, auto_toegestane_soorten,
            auto_min_bronnen, auto_min_bewijskwaliteit
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
    const goedgekeurd = await metOrganisatie(pool, { organisatieId }, async (c) => {
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
      if ((r.rowCount ?? 0) === 0) return false;
      await c.query(
        `insert into intel.publicatiebesluiten
           (organisatie_id, inhoud_versie_id, besluit, actor_soort, motivatie, beleid_versie)
         values ($1, $2, 'goedgekeurd', 'systeem', $3, $4)`,
        [
          organisatieId,
          v.id,
          `automatisch goedgekeurd onder beleid '${beleid.versie}': risico ${v.risico_klasse} ` +
            `binnen ${beleid.maxRisico}, soort ${v.soort} toegestaan, ${bronnen} onafhankelijke ` +
            `bron(nen) >= ${beleid.minBronnen}, bewijskwaliteit ${besteKwaliteit} >= ` +
            `${beleid.minBewijskwaliteit}, gebeurtenis ${dagen} dagen oud`,
          beleid.versie,
        ],
      );
      return true;
    });

    if (!goedgekeurd) {
      /* DE RACE. Tussen de werkvoorraad en deze update kan een mens of
         een andere ronde de versie hebben aangeraakt. De update eist de
         toestand opnieuw; raakt hij nul rijen, dan is er iets veranderd
         en publiceren we niet. */
      weiger("9 race", "de versie is tussen de selectie en de goedkeuring van toestand veranderd");
      continue;
    }

    /* DE SYSTEEMACTOR, MET ZIJN GROND. Dit is de ENIGE plek in de keten
       die zonder mens publiceert, en daarom de enige die systeemActor()
       mag gebruiken. De grond noemt het beleid dat het toestond, zodat
       het logboek 'systeem' nooit zonder uitleg laat staan. */
    const rapport = await publiceer(pool, organisatieId, v.id, {
      actor: systeemActor(`automatische publicatieronde onder beleid ${beleid.versie}`),
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
    droog,
  };
}
