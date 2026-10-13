/* ============================================================
   INHOUD — beoordeling en publicatieketen (par. 14, 15, 16)
   ------------------------------------------------------------
   Een mens keurt goed, en die goedkeuring geldt voor PRECIES wat hij
   heeft gezien. Dat laatste is de hele moeilijkheid.

   De voorstelmotor draait elke ronde opnieuw over dezelfde kandidaten
   en werkt hun rij bij. Zonder binding zou een goedkeuring van gisteren
   blijven staan op een alinea die vandaag anders is — en dan publiceert
   het platform iets wat niemand heeft gelezen. Daarom hangt elke
   beslissing aan de inhoudshash: verandert de inhoud wezenlijk, dan
   vervalt de goedkeuring en moet er opnieuw naar gekeken worden.

   DE KETEN
     DRAFT              het voorstel haalt de controles niet
     READY_FOR_REVIEW   een mens kan er iets van vinden
     APPROVED           goedgekeurd, gebonden aan een hash
     PUBLICATION_PRECHECK  de laatste poort vóór uitrol
     DEPLOYMENT         de wijziging is uitgerold
     LIVE_VERIFIED      en live teruggezien
     REJECTED           eindpunt ernaast

   Elke overgang wordt vastgelegd in intel.voorstel_beoordelingen, met
   de hash waarover is besloten. Dat is append-only: een auditspoor dat
   je kunt bijwerken is geen auditspoor.

   WAT DEZE MODULE NIET DOET
   Hij keurt niets zelf goed. Er is altijd een `door` nodig, en die
   waarde komt uit de ingelogde sessie. Een automatische goedkeuring
   bestaat hier niet — niet als gemak, niet als test, niet om een
   acceptatietest groen te krijgen.
   ============================================================ */

import type pg from "pg";
import { eenRij, rijen } from "../kern/db.ts";
import { IntelFout } from "../kern/fouten.ts";

export type PublicatieStatus =
  | "DRAFT"
  | "READY_FOR_REVIEW"
  /* NIEUW IN 3.0.4: een linkvoorstel wacht op een mens, maar is geen
     feitelijke paginarevisie en mag dus niet in READY_FOR_REVIEW staan.
     Zie de toelichting bij KLAAR_VOOR_LINKREVIEW in inhoud/voorstel.ts. */
  | "READY_FOR_LINK_REVIEW"
  /* NIEUW IN 3.0.6: een voorstel voor een nieuwe pagina wacht op een
     mens, in zijn eigen staat. Zie inhoud/nieuwepagina.ts en 0035. */
  | "NEW_PAGE_CANDIDATE"
  | "APPROVED"
  | "PUBLICATION_PRECHECK"
  | "DEPLOYMENT"
  | "LIVE_VERIFIED"
  | "REJECTED";

export type Besluit = "goedgekeurd" | "afgewezen" | "herziening_gevraagd";

/**
 * Naar het vocabulaire van intel.inhoud_voorstellen.beoordeling.
 *
 * Die kolom bestond al met drie waarden in kapitalen (0021) en het
 * auditspoor van 0029 gebruikt kleine letters met een vierde waarde.
 * Dat is geen slordigheid om weg te poetsen: de kolom draagt de
 * LAATSTE beslissing voor de bestaande UI, het auditspoor draagt de
 * geschiedenis met een fijnere indeling. Eén kaart tussen de twee, zodat
 * ze niet uiteen kunnen lopen.
 */
const BESLUIT_NAAR_KOLOM: Readonly<Record<Besluit, string>> = {
  goedgekeurd: "GOEDGEKEURD",
  afgewezen: "AFGEKEURD",
  herziening_gevraagd: "AANGEPAST",
};

export const STATUS_LABEL: Readonly<Record<PublicatieStatus, string>> = {
  DRAFT: "Concept",
  READY_FOR_REVIEW: "Klaar voor beoordeling",
  READY_FOR_LINK_REVIEW: "Linkvoorstel, klaar voor beoordeling",
  NEW_PAGE_CANDIDATE: "Voorstel voor een NIEUWE pagina, klaar voor beoordeling",
  APPROVED: "Goedgekeurd",
  PUBLICATION_PRECHECK: "Publicatiecontrole",
  DEPLOYMENT: "Uitgerold",
  LIVE_VERIFIED: "Live geverifieerd",
  REJECTED: "Afgewezen",
};

type VoorstelRij = {
  id: string;
  kandidaat_id: number;
  doel_pad: string | null;
  wijziging_soort: string;
  nieuwe_tekst: string | null;
  eindoordeel: string;
  publicatie_status: PublicatieStatus;
  inhouds_hash: string | null;
  goedgekeurd_hash: string | null;
  beoordeeld_door: number | null;
  /** Het e-mailadres van de beoordelaar, voor weergave en audit. */
  beoordeeld_door_email: string | null;
  beoordeeld_op: string | null;
  precheck_uitslag: string | null;
  /** De risicoklasse van de gebeurtenis waar dit voorstel aan hangt. */
  risico_klasse: string | null;
  /** De websiteVersie waarop is goedgekeurd; null vóór migratie 0033. */
  goedgekeurde_website_versie: string | null;
};

/* ---------------------------------------------------------------- rechten
   WAAROM DE RECHTENCONTROLE HIER STAAT EN NIET ALLEEN IN DE ROUTE.

   Tot 3.0.4 hing goedkeuren uitsluitend aan de middleware
   `vereistRecht("distributie.concept")` in dashboard/server.ts. Twee
   problemen, beide gemeten:

   1 Het was het VERKEERDE recht. De rechtenmatrix in 0001 geeft
     `distributie.concept` ook aan de rol `analist`, die géén
     `inhoud.goedkeuren` heeft. Een analist kon dus redactionele
     paginarevisies goedkeuren.
   2 Het stond alleen op de route. Elke andere aanroeper van beoordeel()
     — een CLI, een taak, een volgende route — had geen enkele
     rechtencontrole.

   Daarom toetst beoordeel() het recht nu zelf, tegen intel.rol_rechten.
   De route houdt zijn middleware (dat geeft een nette 403 in plaats van
   een exception), maar de grendel zit hier. */
export const RECHT_BEOORDELEN = "inhoud.goedkeuren";
export const RECHT_HOOGRISICO = "inhoud.hoogrisico.goedkeuren";

async function rechtenVan(c: pg.PoolClient, gebruikerId: number): Promise<Set<string>> {
  const r = await rijen<{ recht: string }>(
    c,
    `select distinct rr.recht
       from intel.gebruiker_rollen gr
       join intel.rol_rechten rr on rr.rol = gr.rol
      where gr.gebruiker_id = $1`,
    [gebruikerId],
  );
  return new Set(r.map((x) => x.recht));
}

async function leesVoorstel(
  c: pg.PoolClient,
  organisatieId: number,
  voorstelId: string,
): Promise<VoorstelRij> {
  const r = await eenRij<VoorstelRij>(
    c,
    `select id::text, kandidaat_id, doel_pad, wijziging_soort, nieuwe_tekst, eindoordeel,
            publicatie_status, inhouds_hash, goedgekeurd_hash, beoordeeld_door,
            (select g.email from intel.gebruikers g where g.id = beoordeeld_door)
              as beoordeeld_door_email,
            beoordeeld_op::text, precheck_uitslag,
            goedgekeurde_website_versie,
            (select mg.risico_klasse from intel.markt_gebeurtenissen mg
              where mg.id = gebeurtenis_id) as risico_klasse
       from intel.inhoud_voorstellen
      where organisatie_id = $1 and id = $2::bigint`,
    [organisatieId, voorstelId],
  );
  if (!r) throw new IntelFout("validatie", `voorstel ${voorstelId} bestaat niet`);
  return r;
}

/**
 * Is de goedkeuring nog geldig?
 *
 * Geldig betekent: er IS een goedkeuring, en de inhoud is sindsdien niet
 * veranderd. Een rij waarvan de hash is doorgeschoven heeft geen geldige
 * goedkeuring meer, ook al staat er een naam en een datum bij.
 */
export function goedkeuringGeldig(rij: {
  publicatie_status: string;
  inhouds_hash: string | null;
  goedgekeurd_hash: string | null;
}): { geldig: boolean; reden: string } {
  const na = new Set(["APPROVED", "PUBLICATION_PRECHECK", "DEPLOYMENT", "LIVE_VERIFIED"]);
  if (!na.has(rij.publicatie_status)) {
    return { geldig: false, reden: `status ${rij.publicatie_status}: nog niet goedgekeurd` };
  }
  if (!rij.goedgekeurd_hash) {
    return { geldig: false, reden: "goedgekeurd zonder gebonden hash" };
  }
  if (rij.goedgekeurd_hash !== rij.inhouds_hash) {
    return {
      geldig: false,
      reden:
        `de inhoud is na goedkeuring gewijzigd: goedgekeurd op ` +
        `${rij.goedgekeurd_hash.slice(0, 12)}, nu ${(rij.inhouds_hash ?? "geen").slice(0, 12)}. ` +
        `Er is opnieuw een beoordeling nodig.`,
    };
  }
  return { geldig: true, reden: `gebonden aan ${rij.goedgekeurd_hash.slice(0, 12)}` };
}

export type BeoordeelUitslag = {
  readonly voorstelId: string;
  readonly besluit: Besluit;
  readonly statusVoor: PublicatieStatus;
  readonly statusNa: PublicatieStatus;
  readonly gebondenHash: string;
};

/**
 * Legt een menselijk besluit vast.
 *
 * `gebruikerId` is verplicht en verwijst naar een bestaand account; de
 * aanroeper haalt die uit de sessie. Een naam als vrije tekst zou
 * niets bewijzen — iedereen kan 'beheer@vibeenergy.nl' typen.
 * `verwachteHash` is de hash die de beoordelaar
 * op zijn scherm zag: klopt die niet meer met de rij, dan is het
 * voorstel ondertussen gewijzigd en wordt het besluit GEWEIGERD. Zo kan
 * een beoordelaar niet per ongeluk iets anders goedkeuren dan hij las.
 */
export async function beoordeel(
  c: pg.PoolClient,
  organisatieId: number,
  opdracht: {
    voorstelId: string;
    besluit: Besluit;
    /** Het account dat besluit. Komt uit de sessie, niet uit invoer. */
    gebruikerId: number;
    notitie?: string | null;
    /** De hash zoals getoond aan de beoordelaar. */
    verwachteHash: string;
    /**
     * De websiteVersie uit het sitekennisartefact, GEMETEN door de
     * aanroeper en niet uit invoer.
     *
     * Wordt bij een goedkeuring vastgelegd, zodat publicatiePrecheck
     * later twee ONAFHANKELIJKE waarden kan vergelijken. Tot 3.0.4 kreeg
     * die controle beide waarden van dezelfde aanroeper en bewees hij
     * niets. Zie migratie 0033.
     */
    websiteVersie: string;
  },
): Promise<BeoordeelUitslag> {
  /* HET ACCOUNT MOET BESTAAN EN BIJ DEZE ORGANISATIE HOREN.
     Dit is geen formaliteit: zonder deze controle kan een
     gebruikers-id uit een andere organisatie een voorstel goedkeuren,
     en dan is het auditspoor onwaar. */
  const gebruiker = await eenRij<{ email: string }>(
    c,
    `select email from intel.gebruikers
      where id = $1 and organisatie_id = $2 and actief`,
    [opdracht.gebruikerId, organisatieId],
  );
  if (!gebruiker) {
    throw new IntelFout(
      "autorisatie",
      `gebruiker ${opdracht.gebruikerId} is geen actief account van deze organisatie; ` +
        `een beoordeling zonder geldig account wordt niet vastgelegd`,
    );
  }
  if (!/^[0-9a-f]{64}$/.test(opdracht.websiteVersie)) {
    throw new IntelFout(
      "validatie",
      "websiteVersie is geen sha256; de aanroeper hoort hem uit het sitekennisartefact te MÉTEN",
    );
  }

  const door = gebruiker.email;
  const rij = await leesVoorstel(c, organisatieId, opdracht.voorstelId);

  /* HET RECHT, SERVER-SIDE. Zie de toelichting bij RECHT_BEOORDELEN:
     dit hing eerder alleen aan de route, en aan het verkeerde recht. */
  const rechten = await rechtenVan(c, opdracht.gebruikerId);
  if (!rechten.has(RECHT_BEOORDELEN)) {
    throw new IntelFout(
      "autorisatie",
      `${door} mag geen redactioneel besluit nemen: het recht ${RECHT_BEOORDELEN} ontbreekt`,
    );
  }
  /* Hoog risico vraagt een zwaarder recht. 0001 geeft dat met opzet
     alleen aan `beheerder`; zie de comment op intel.rol_rechten. De
     risicoklasse komt van de gebeurtenis en niet van de aanvrager, dus
     hij is niet te beïnvloeden door wie goedkeurt. */
  if (
    opdracht.besluit === "goedgekeurd" &&
    rij.risico_klasse === "hoog" &&
    !rechten.has(RECHT_HOOGRISICO)
  ) {
    throw new IntelFout(
      "autorisatie",
      `voorstel ${rij.id} hangt aan een gebeurtenis met risicoklasse hoog; ` +
        `goedkeuren vraagt het recht ${RECHT_HOOGRISICO} en ${door} heeft dat niet`,
    );
  }

  if (!rij.inhouds_hash) {
    throw new IntelFout(
      "validatie",
      `voorstel ${rij.id} heeft geen inhoudshash; er is niets om een besluit aan te binden`,
    );
  }

  /* DE HASH DIE DE BEOORDELAAR ZAG MOET DE HUIDIGE ZIJN.
     Anders keurt iemand goed wat hij een minuut eerder op zijn scherm
     had, terwijl de motor er intussen een andere alinea in heeft gezet.
     Dit is dezelfde gedachte als een optimistische lock, maar met de
     inhoud als versie in plaats van een teller. */
  if (opdracht.verwachteHash !== rij.inhouds_hash) {
    throw new IntelFout(
      "conflict",
      `het voorstel is gewijzigd sinds u het opende (u zag ` +
        `${opdracht.verwachteHash.slice(0, 12)}, er staat nu ${rij.inhouds_hash.slice(0, 12)}). ` +
        `Lees het opnieuw voordat u besluit.`,
    );
  }

  /* ALLEEN BEOORDEELBARE VOORSTELLEN.
     Een voorstel dat de controles niet haalt is geen keuze die aan een
     mens hoort te worden voorgelegd; goedkeuren zou een poort omzeilen
     in plaats van passeren. */
  const BEOORDEELBAAR: readonly PublicatieStatus[] = [
    "READY_FOR_REVIEW",
    "READY_FOR_LINK_REVIEW",
    /* Goedkeuren betekent hier "deze pagina mag gemaakt worden". Het
       maken zelf blijft mensenwerk via de beschermde git-werkstroom;
       dit platform schrijft geen bestand en registreert geen route. */
    "NEW_PAGE_CANDIDATE",
  ];
  if (opdracht.besluit === "goedgekeurd" && !BEOORDEELBAAR.includes(rij.publicatie_status)) {
    throw new IntelFout(
      "validatie",
      `voorstel ${rij.id} staat op ${rij.publicatie_status} en is niet goed te keuren. ` +
        `Alleen ${BEOORDEELBAAR.join(" of ")} kan worden goedgekeurd.`,
    );
  }

  const statusNa: PublicatieStatus =
    opdracht.besluit === "goedgekeurd"
      ? "APPROVED"
      : opdracht.besluit === "afgewezen"
        ? "REJECTED"
        : /* Herziening gevraagd: terug naar concept, want er moet iets
             veranderen voordat er weer iets te beoordelen is. */
          "DRAFT";

  await c.query(
    `update intel.inhoud_voorstellen
        set publicatie_status = $3,
            goedgekeurd_hash  = case when $4 = 'goedgekeurd' then $5 else null end,
            beoordeeld_door   = $6,
            beoordeeld_op     = now(),
            beoordeling       = $8,
            beoordeling_notitie = $7,
            /* De versie waarop is goedgekeurd, gemeten uit het artefact.
               Alleen bij een goedkeuring; bij afwijzen of herziening is
               er niets om aan te binden. Zie migratie 0033. */
            goedgekeurde_website_versie =
              case when $4 = 'goedgekeurd' then $9 else null end
      where organisatie_id = $1 and id = $2::bigint`,
    [
      organisatieId,
      rij.id,
      statusNa,
      opdracht.besluit,
      rij.inhouds_hash,
      opdracht.gebruikerId,
      opdracht.notitie ?? null,
      BESLUIT_NAAR_KOLOM[opdracht.besluit],
      opdracht.websiteVersie,
    ],
  );

  await c.query(
    `insert into intel.voorstel_beoordelingen
       (organisatie_id, voorstel_id, inhouds_hash, besluit, door, door_gebruiker_id,
        notitie, status_voor, status_na)
     values ($1, $2::bigint, $3, $4, $5, $6, $7, $8, $9)`,
    [
      organisatieId,
      rij.id,
      rij.inhouds_hash,
      opdracht.besluit,
      /* Het adres zoals het NU is: een momentopname, zodat het spoor
         niet meebeweegt als het account later wordt hernoemd. */
      door,
      opdracht.gebruikerId,
      opdracht.notitie ?? null,
      rij.publicatie_status,
      statusNa,
    ],
  );

  return {
    voorstelId: rij.id,
    besluit: opdracht.besluit,
    statusVoor: rij.publicatie_status,
    statusNa,
    gebondenHash: rij.inhouds_hash,
  };
}

export type PrecheckControle = {
  readonly naam: string;
  readonly oordeel: "PASS" | "FAIL";
  readonly reden: string;
};

export type PrecheckUitslag = {
  readonly uitslag: "PASS" | "FAIL";
  readonly controles: readonly PrecheckControle[];
};

/**
 * De laatste poort vóór uitrol (par. 16).
 *
 * Deze controle staat NA de goedkeuring en niet ervoor, en dat is geen
 * dubbelop: tussen goedkeuren en uitrollen kan de wereld veranderen. De
 * website kan een nieuwe versie hebben gekregen, de doelpagina kan
 * verdwenen zijn, en de inhoud kan opnieuw zijn samengesteld. Een
 * precheck die vóór de goedkeuring loopt bewijst niets over het moment
 * waarop er daadwerkelijk iets wordt gepubliceerd.
 */
export async function publicatiePrecheck(
  c: pg.PoolClient,
  organisatieId: number,
  voorstelId: string,
  context: {
    /** De routes die het sitekennisartefact nu als gepubliceerd kent. */
    gepubliceerdeRoutes: readonly string[];
    /**
     * De websiteversie van het artefact dat NU geldt, gemeten door de
     * aanroeper.
     *
     * De versie waarop is GOEDGEKEURD komt NIET meer van de aanroeper
     * maar uit de rij (kolom goedgekeurde_website_versie, migratie
     * 0033). Tot 3.0.4 kreeg deze functie beide waarden van dezelfde
     * aanroeper, en dan vergelijkt de controle twee kopieën van hetzelfde
     * getal in plaats van twee onafhankelijke metingen.
     */
    huidigeWebsiteVersie: string;
  },
): Promise<PrecheckUitslag> {
  const rij = await leesVoorstel(c, organisatieId, voorstelId);
  const controles: PrecheckControle[] = [];
  const voeg = (naam: string, ok: boolean, reden: string) =>
    controles.push({ naam, oordeel: ok ? "PASS" : "FAIL", reden });

  const binding = goedkeuringGeldig(rij);
  voeg("goedkeuring geldig", binding.geldig, binding.reden);

  voeg(
    "menselijke beoordelaar",
    rij.beoordeeld_door !== null,
    rij.beoordeeld_door !== null
      ? `goedgekeurd door account ${rij.beoordeeld_door}` +
        (rij.beoordeeld_door_email ? ` (${rij.beoordeeld_door_email})` : "")
      : "geen beoordelaar vastgelegd",
  );

  const doelBestaat = rij.doel_pad !== null && context.gepubliceerdeRoutes.includes(rij.doel_pad);
  voeg(
    "doelpagina bestaat nog",
    doelBestaat,
    doelBestaat
      ? `${rij.doel_pad} staat in het sitekennisartefact`
      : `${rij.doel_pad ?? "geen doelpad"} staat NIET in de ${context.gepubliceerdeRoutes.length} gepubliceerde routes`,
  );

  /* DE WEBSITE MAG NIET ONDER DE GOEDKEURING ZIJN VERSCHOVEN.
     Is de site gewijzigd sinds de goedkeuring, dan kan de sectie waar
     deze alinea in moest anders zijn of niet meer bestaan. Dat is geen
     reden om te weigeren maar wel om opnieuw te kijken. */
  const goedgekeurdOp = rij.goedgekeurde_website_versie;
  const zelfdeSite = goedgekeurdOp !== null && goedgekeurdOp === context.huidigeWebsiteVersie;
  voeg(
    "website onveranderd sinds goedkeuring",
    zelfdeSite,
    goedgekeurdOp === null
      ? `er is niet vastgelegd op welke websiteversie is goedgekeurd. Dat kan bij een ` +
        `goedkeuring van vóór migratie 0033; dan is niet vast te stellen of de doelsectie ` +
        `sindsdien is verschoven. Laat dit voorstel opnieuw beoordelen.`
      : zelfdeSite
        ? `websiteversie ${context.huidigeWebsiteVersie.slice(0, 12)} ongewijzigd sinds de goedkeuring`
        : `de website is gewijzigd: goedgekeurd op ${goedgekeurdOp.slice(0, 12)}, ` +
          `nu ${context.huidigeWebsiteVersie.slice(0, 12)}`,
  );

  const heeftTekst = (rij.nieuwe_tekst ?? "").trim().length > 0;
  voeg(
    "er is iets te publiceren",
    heeftTekst && rij.wijziging_soort !== "geen",
    heeftTekst
      ? `wijzigingssoort ${rij.wijziging_soort}, ${(rij.nieuwe_tekst ?? "").length} tekens`
      : "geen nieuwe tekst",
  );

  const uitslag: "PASS" | "FAIL" = controles.every((x) => x.oordeel === "PASS") ? "PASS" : "FAIL";

  await c.query(
    `update intel.inhoud_voorstellen
        set precheck_op = now(),
            precheck_uitslag = $3,
            publicatie_status = case
              when $3 = 'PASS' then 'PUBLICATION_PRECHECK'
              else publicatie_status
            end
      where organisatie_id = $1 and id = $2::bigint`,
    [organisatieId, rij.id, uitslag],
  );

  return { uitslag, controles };
}

/** De beoordelingsgeschiedenis van één voorstel, nieuwste eerst. */
export async function beoordelingsgeschiedenis(
  c: pg.PoolClient,
  organisatieId: number,
  voorstelId: string,
): Promise<
  readonly {
    besluit: string;
    door: string;
    door_gebruiker_id: string;
    notitie: string | null;
    status_voor: string;
    status_na: string;
    inhouds_hash: string;
    op: string;
  }[]
> {
  return rijen(
    c,
    `select besluit, door, door_gebruiker_id::text, notitie, status_voor, status_na,
            inhouds_hash, op::text
       from intel.voorstel_beoordelingen
      where organisatie_id = $1 and voorstel_id = $2::bigint
      order by op desc, id desc`,
    [organisatieId, voorstelId],
  );
}
