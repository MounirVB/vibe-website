/* ============================================================
   INHOUD — conceptgeneratie
   ------------------------------------------------------------
   Het concept wordt eerst deterministisch opgebouwd uit de eigen
   uitspraken. Daarna MAG een model die tekst herschrijven, met één
   harde beperking: het mag geen getal en geen bewering toevoegen. De
   poort `geen_verzonnen_getallen` controleert dat daarna, dus de
   belofte is niet afhankelijk van hoe braaf het model zich gedraagt.

   Eén detail dat makkelijk fout gaat: `uitspraken.tekst` is de ZIN UIT
   DE BRON. Die staat in de database als bewijs en hoort niet in de
   paginatekst — dat zou herpublicatie zijn. In het concept gaan daarom
   alleen de waarde, de eenheid en de uitgever mee, niet de bronzin.
   De poort geen_bronherpublicatie vangt het als dat toch gebeurt.

   Interpretatie wordt expliciet gelabeld. "Wat dit betekent voor
   bedrijven" is onze gevolgtrekking en wordt als zodanig aangekondigd,
   niet als bronfeit gepresenteerd.
   ============================================================ */

import type pg from "pg";
import { configLezen } from "../kern/config.ts";
import {
  claimDraagt,
  eisHerbeoordeling,
  toetsGebondenBewijs,
  waaromNietDragend,
} from "../pijplijn/claimpoort.ts";
import { eenRij, metOrganisatie, rijen, type Pool } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import { kort, sha256hex, slug } from "../kern/tekst.ts";
import { boekAanroep, kiesProvider, type Provider } from "./model.ts";
import {
  budgetStand,
  isModelToegestaan,
  meldMislukking,
  meldSucces,
  onderbrekerStand,
} from "../ops/aibeheer.ts";
import { toetsConcept, vatPoortenSamen, type GebondenUitspraak } from "./poorten.ts";

const log = maakLogger("concept");

/** Welke Vibe-oplossing hoort bij welk cluster, en welke CTA past. */
const OPLOSSING_PER_CLUSTER: Readonly<
  Record<string, { oplossing: string; cta: string; ctaPad: string }>
> = {
  netcongestie: {
    oplossing: "batterijopslag en energiemanagement om binnen de beschikbare transportcapaciteit te blijven",
    cta: "Laat uw netbeperking in kaart brengen",
    ctaPad: "/contact",
  },
  netbeheer: {
    oplossing: "inzicht in de gevolgen van tarief- en netbesluiten voor uw aansluiting",
    cta: "Bespreek wat dit voor uw aansluiting betekent",
    ctaPad: "/contact",
  },
  bess: {
    oplossing: "dimensionering en exploitatie van een batterijsysteem achter de meter",
    cta: "Vraag een dimensionering aan",
    ctaPad: "/systeem-energieopslag",
  },
  batterijveiligheid: {
    oplossing: "opstelling, normen en veiligheidseisen rond opslag",
    cta: "Bespreek de veiligheidseisen voor uw locatie",
    ctaPad: "/contact",
  },
  ems: {
    oplossing: "sturing en meting met VIBE.CONTROL",
    cta: "Bekijk hoe sturing werkt",
    ctaPad: "/vibe-control",
  },
  laadinfrastructuur: {
    oplossing: "laadinfrastructuur die binnen het beschikbare vermogen blijft",
    cta: "Bespreek uw laadbehoefte",
    ctaPad: "/systeem-laadpalen",
  },
  "zonne-energie": {
    oplossing: "dakgebonden opwek, inclusief de gevolgen van terugleverbeperking",
    cta: "Laat uw dakpotentie bepalen",
    ctaPad: "/systeem-zonnepanelen",
  },
  subsidie: {
    oplossing: "een businesscase die rekening houdt met de actuele regelingen",
    cta: "Vraag een businesscase aan",
    ctaPad: "/contact",
  },
  vastgoedverduurzaming: {
    oplossing: "verduurzaming van bedrijfsvastgoed met energie als opbrengst",
    cta: "Bespreek uw vastgoedportefeuille",
    ctaPad: "/contact",
  },
  flexibiliteit: {
    oplossing: "het benutten van flexibiliteit achter de meter",
    cta: "Bespreek uw flexpotentie",
    ctaPad: "/contact",
  },
  marktprijs: {
    oplossing: "sturing op prijsverschillen binnen de dag",
    cta: "Bekijk hoe sturing werkt",
    ctaPad: "/vibe-control",
  },
  regelgeving: {
    oplossing: "inzicht in wat een besluit voor uw situatie betekent",
    cta: "Bespreek de gevolgen voor uw situatie",
    ctaPad: "/contact",
  },
};

export type ConceptInvoer = {
  readonly kandidaatId: number;
  readonly gebeurtenisId: number;
  readonly besluit: string;
  readonly clusterSleutel: string | null;
  readonly clusterNaam: string | null;
  readonly clusterOmschrijving: string | null;
  readonly risicoKlasse: "laag" | "midden" | "hoog";
  readonly gebeurtenisTitel: string;
  readonly gebeurdOp: Date | null;
  readonly doelPaginaId: number | null;
  readonly doelPaginaPad: string | null;
  readonly doelPaginaBeheer: "handmatig" | "intelligence" | null;
};

export type OpgebouwdConcept = {
  readonly pad: string;
  readonly soort: "nieuw_artikel" | "pagina_update" | "regio_patch" | "kennis_update";
  readonly titel: string;
  readonly metaOmschrijving: string;
  readonly canoniekeUrl: string;
  readonly directAntwoord: string;
  readonly bodyMarkdown: string;
  readonly structuredData: Record<string, unknown>;
  readonly interneLinks: readonly string[];
  readonly bronnenSectie: readonly { uitgever: string; url: string; datum: string | null }[];
  readonly ctaSleutel: string;
  readonly uitspraakBindingen: readonly { uitspraakId: number; rol: "kern" | "ondersteunend" }[];
  readonly invoerVersies: readonly number[];
};

type UitspraakRij = {
  id: number;
  tekst: string;
  soort: string;
  waarde_numeriek: string | null;
  eenheid: string | null;
  geldig_vanaf: string | null;
  geldig_tot: string | null;
  verificatie_status: string;
  uitgever: string;
  bron_url: string;
  versie_id: number;
  gepubliceerd_op: Date | null;
  /* R3 — zie de toelichting bij splitsNaarModaliteit(). */
  modaliteit: string | null;
  modaliteit_zekerheid: string | null;
  documentsoort: string | null;
  primaire_bron_bevestigd: boolean;
};

/**
 * R3 — SCHEIDT WAT VASTSTAAT VAN WAT GEVRAAGD OF VERWACHT WORDT.
 *
 * Sectie 7 van de R3-opdracht eist "duidelijke onderscheidingen tussen
 * feiten, verwachtingen en advies". Dat was hier niet te maken: elke
 * bevestigde uitspraak met een getal landde onder 'Wat er is
 * vastgelegd', ongeacht of de bronzin iets vaststelde of iets vroeg.
 *
 * De gemeten consequentie. In productie stond op 30 oktober 2026 deze
 * rij bevestigd met bewijs_kwaliteit 5:
 *
 *   waarde 125000000 EUR — 'Schaal daarom de bestaande Flex-E-regeling
 *   op naar een Flex-E regeling XL van structureel EUR 125 miljoen per
 *   jaar (2027-2030).'
 *
 * Als concept zou dat '**125000000 EUR** — vastgelegd door Netbeheer
 * Nederland' worden, onder een kop die zegt dat het vastligt. Het is een
 * verzoek aan de Tweede Kamer.
 *
 * Een claim die niet draagbaar is als feit verdwijnt daarom NIET — dat
 * zou de redacteur informatie onthouden — maar gaat naar een eigen
 * sectie met zijn modaliteit erbij.
 */
function splitsNaarModaliteit(rijen: readonly UitspraakRij[]): {
  readonly vastgesteld: readonly UitspraakRij[];
  readonly nietVastgesteld: readonly UitspraakRij[];
} {
  const vastgesteld: UitspraakRij[] = [];
  const nietVastgesteld: UitspraakRij[] = [];
  for (const u of rijen) {
    /* DRIE EISEN, VIA ÉÉN FUNCTIE. Eerste versie toetste hier alleen de
       modaliteit en de zekerheid. Een audit over alle verbruikers van
       bevestigde claims ving dat: een claim uit een
       SECUNDAIRE_BERICHTGEVING met een vaststellende zin kwam zo onder
       'Wat er is vastgelegd' terecht. De zin stelt dan wel iets vast,
       maar de bron is er niet de bron van — en dat is precies het
       onderscheid waar R3 om begonnen is.

       claimDraagt() in pijplijn/claimpoort.ts is de ENIGE definitie van
       'deze claim draagt', zodat de conceptlaag, de publicatielaag en
       het dashboard niet uiteen kunnen lopen. */
    if (
      claimDraagt({
        verificatieStatus: u.verificatie_status,
        modaliteit: u.modaliteit,
        modaliteitZekerheid: u.modaliteit_zekerheid === null ? null : Number(u.modaliteit_zekerheid),
        documentsoort: u.documentsoort,
      })
    ) {
      vastgesteld.push(u);
    } else {
      nietVastgesteld.push(u);
    }
  }
  return { vastgesteld, nietVastgesteld };
}

/** Het label dat een niet-vastgestelde claim in de tekst krijgt. */
function modaliteitLabel(u: UitspraakRij): string {
  if (u.modaliteit === "VOORSTEL") return "VOORSTEL — nog niet vastgesteld";
  if (u.modaliteit === "VERWACHTING") return "VERWACHTING — een prognose, geen stand";
  if (u.modaliteit === null) return "NIET BEOORDEELD — modaliteit onbekend";
  const zeker = u.modaliteit_zekerheid === null ? 0 : Number(u.modaliteit_zekerheid);
  return `ONZEKER — modaliteit ${u.modaliteit} met zekerheid ${zeker.toFixed(2)}`;
}

function soortVanBesluit(besluit: string): OpgebouwdConcept["soort"] {
  switch (besluit) {
    /* NEWS_ITEM is het besluit van de nieuwsselectie (migratie 0041).
       Het levert dezelfde SOORT op als NEW_ARTICLE — een eigen pagina
       onder nieuws/<slug> — maar op de tegenovergestelde grond: een
       nieuwsbericht VEREIST een onderwerp-eigenaar waar NEW_ARTICLE er
       juist geen mag hebben. Zie pijplijn/nieuwsselectie.ts. */
    case "NEWS_ITEM":
    case "NEW_ARTICLE":
      return "nieuw_artikel";
    case "UPDATE_EXISTING":
      return "pagina_update";
    case "REGIONAL_PATCH":
      return "regio_patch";
    case "KNOWLEDGE_UPDATE":
      return "kennis_update";
    default:
      return "nieuw_artikel";
  }
}

function nlDatum(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

/** Nederlandse notatie: komma als decimaalteken. */
function nlGetal(waarde: string | null): string {
  if (waarde === null) return "";
  const n = Number(waarde);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("nl-NL", { maximumFractionDigits: 3 });
}

/**
 * Bouwt het concept deterministisch op. Alleen waarden en eenheden uit
 * de uitspraken; nooit de bronzin.
 */
export function bouwConcept(
  invoer: ConceptInvoer,
  uitspraken: readonly UitspraakRij[],
  geo: readonly { naam: string; soort: string; grondslag: string }[],
  bestaandePaden: ReadonlySet<string>,
): OpgebouwdConcept {
  const config = configLezen();
  const cluster = invoer.clusterSleutel ?? "overig";
  const oplossing = OPLOSSING_PER_CLUSTER[cluster] ?? {
    oplossing: "inzicht in wat deze ontwikkeling voor uw energiesituatie betekent",
    cta: "Plan een gesprek",
    ctaPad: "/contact",
  };

  const bevestigd = uitspraken.filter((u) => u.verificatie_status === "bevestigd");
  /* R3 — alleen een VASTGESTELDE claim mag onder 'Wat er is vastgelegd'.
     Zie splitsNaarModaliteit() voor de gemeten reden. */
  const gesplitst = splitsNaarModaliteit(bevestigd.filter((u) => u.waarde_numeriek !== null));
  const metWaarde = gesplitst.vastgesteld;
  const nietVastgesteldeWaarden = gesplitst.nietVastgesteld;
  /* Dragende claims over ALLE uitspraken, niet alleen die met een getal:
     een datumbesluit zonder cijfer kan een bericht ook dragen. */
  const dragend = uitspraken.filter((u) =>
    claimDraagt({
      verificatieStatus: u.verificatie_status,
      modaliteit: u.modaliteit,
      modaliteitZekerheid: u.modaliteit_zekerheid === null ? null : Number(u.modaliteit_zekerheid),
      documentsoort: u.documentsoort,
    }),
  );
  const uitgevers = [...new Set(uitspraken.map((u) => u.uitgever))];

  const soort = soortVanBesluit(invoer.besluit);
  /* HET NIEUWSPAD IS `/nieuws/<slug>` EN NIET `/nieuws-<slug>`.
     Dit was een koppelteken, en dat koppelteken sloot het hele
     nieuwskanaal af. Gemeten op b2de0c4:

       bouwConcept()                -> '/nieuws-acm-stelt-tarieven-vast'
       slugVanPad(dat pad)          -> null
       isNieuwsPad(dat pad)         -> false
       publiceerViaRegister()       -> weigert, 'valt buiten data/inhoud/nieuws/'

     site/nieuwsregister.ts eist `^nieuws\/([a-z0-9][a-z0-9-]*)$` (regel
     142) en publicatie/pr.ts eist `^data\/inhoud\/nieuws\/[a-z0-9][a-z0-9-]*\.json$`
     (regel 60). Een pad met koppelteken haalt geen van beide. Elk
     NEW_ARTICLE werd daarom geweigerd bij publiceer(), en dat is de
     werkelijke reden dat data/inhoud/nieuws/ niet bestaat en er nul
     artikelen zijn — niet een redactionele keuze.

     De routereservering in data/seo/nieuws-architectuur.json is
     `nieuws/<slug>`; dat contract is hier leidend, niet deze functie.
     Een kennisupdate houdt zijn koppelteken-terugval: die route is geen
     nieuwsroute en wordt bewust NIET naar schijf geschreven. */
  const pad =
    soort === "pagina_update" || soort === "kennis_update"
      ? (invoer.doelPaginaPad ?? `/kennis-${slug(invoer.gebeurtenisTitel)}`)
      : `/nieuws/${slug(invoer.gebeurtenisTitel)}`;

  // Liever de volledige kop zonder merksuffix dan een kop die
  // middenin een woord afgekapt wordt.
  const volledigeKop = invoer.gebeurtenisTitel.trim();
  const metSuffix = `${volledigeKop} | Vibe Energy`;
  const titel =
    metSuffix.length <= 70
      ? metSuffix
      : volledigeKop.length <= 70
        ? volledigeKop
        : kort(volledigeKop, 70);
  const titelKern = volledigeKop;

  // Direct antwoord: zelfstandig leesbaar, met de kernwaarden erin.
  const waardeReeks = metWaarde
    .slice(0, 3)
    .map((u) => `${nlGetal(u.waarde_numeriek)} ${u.eenheid ?? ""}`.trim())
    .join(", ");
  const directAntwoord = kort(
    [
      `${invoer.clusterNaam ?? cluster}:`,
      uitgevers.length > 0 ? `volgens ${uitgevers.slice(0, 2).join(" en ")}` : "",
      waardeReeks ? `zijn de vastgelegde waarden ${waardeReeks}.` : "is er een ontwikkeling gemeld.",
      `Voor bedrijven raakt dit ${oplossing.oplossing}.`,
    ]
      .filter(Boolean)
      .join(" "),
    380,
  );

  const metaOmschrijving = kort(
    `${invoer.clusterNaam ?? cluster} — wat de recente ontwikkeling betekent voor bedrijven, ` +
      `met bronverwijzing naar ${uitgevers[0] ?? "de primaire bron"}.`,
    158,
  );

  // Interne links: alleen paden die bestaan.
  const kandidaatLinks = [oplossing.ctaPad, "/contact", "/projecten"].filter((p) =>
    bestaandePaden.has(p),
  );
  const interneLinks = [...new Set(kandidaatLinks)];

  const geoMetBewijs = geo.filter((g) => g.grondslag !== "afgeleid");

  const regels: string[] = [];
  regels.push(`# ${titelKern}`);
  regels.push("");
  regels.push(directAntwoord);
  regels.push("");

  regels.push("## Wat er is vastgelegd");
  regels.push("");
  if (metWaarde.length === 0) {
    /* GEEN GETALLEN, MAAR WEL BEWIJS — en dat verschil hoort zichtbaar
       te zijn.

       Hier stond één regel: "Er zijn nog geen harde waarden vastgelegd."
       Dat is waar voor een gebeurtenis zonder bewijs, maar MISLEIDEND
       voor een gebeurtenis met een bevestigde kwalitatieve uitspraak —
       een datumbesluit, een regelwijziging. Die heeft wél bewijs; het
       heeft alleen geen getal.

       WAAROM HIER NIET DE BRONZIN STAAT. `uitspraken.tekst` is de ZIN
       UIT DE BRON. Die in de paginatekst zetten is herpublicatie, en
       poort 5 (`geen_bronherpublicatie`) vangt dat terecht. De
       verwoorde vorm hoort uit de semantieklaag te komen
       (`uitspraken.verwoorde_zin`, migratie 0025) — maar die laag
       beoordeelt alleen uitspraken MET een numerieke uitdrukking.
       Gemeten: van de 53 bevestigde uitspraken hebben er 2 een
       verwoorde_zin, en 17 hebben verwoordbaar = NULL omdat
       backfillSemantiek ze oversloeg wegens 'zonder uitdrukking'.

       Dus: dit concept kan het feit niet zelf verwoorden zonder te
       verzinnen of te herpubliceren. Dan hoort het dat te ZEGGEN, en
       een mens vult het aan. Dat is wat §5 van de opdracht vraagt:
       markeer onzekere informatie expliciet voor redactionele
       beoordeling. Het concept blijft daarmee op ter_review staan, wat
       de juiste uitkomst is. */
    if (bevestigd.length === 0) {
      regels.push(
        "Er zijn voor deze ontwikkeling nog geen harde waarden uit een primaire bron vastgelegd. " +
          "Zodra die er zijn, wordt dit onderdeel aangevuld.",
      );
    } else {
      const soorten = [...new Set(bevestigd.map((u) => u.soort))].join(", ");
      regels.push(
        `**TE VERWOORDEN DOOR DE REDACTIE.** Deze ontwikkeling rust op ` +
          `${bevestigd.length} bevestigde uitspraak/uitspraken van het soort ${soorten}, ` +
          `vastgelegd door ${uitgevers.join(" en ")}. Er zit geen numerieke waarde in, ` +
          "en de semantische laag heeft er daarom geen verwoordbare vorm van gemaakt. " +
          "Het feit staat in de bron die onderaan dit bericht genoemd is; " +
          "een redacteur hoort het hier in eigen woorden neer te zetten. " +
          "Dit bericht is niet publiceerbaar zolang dat niet gebeurd is.",
      );
    }
  } else {
    for (const u of metWaarde.slice(0, 10)) {
      const waarde = `${nlGetal(u.waarde_numeriek)} ${u.eenheid ?? ""}`.trim();
      const geldig = u.geldig_vanaf
        ? ` (geldig vanaf ${u.geldig_vanaf})`
        : u.geldig_tot
          ? ` (geldig tot ${u.geldig_tot})`
          : "";
      regels.push(`- **${waarde}**${geldig} — vastgelegd door ${u.uitgever}.`);
    }
  }
  regels.push("");

  /* R3 — WAT NIET VASTSTAAT, STAAT APART EN MET ZIJN LABEL.
     Deze sectie verschijnt alleen als er iets in hoort. Een lege sectie
     met de kop 'Wat is voorgesteld of verwacht' zou suggereren dat er
     naar gekeken is terwijl er niets was. */
  if (nietVastgesteldeWaarden.length > 0) {
    regels.push("## Wat is voorgesteld of verwacht");
    regels.push("");
    regels.push(
      "*De onderstaande cijfers staan NIET vast. Ze komen uit een voorstel, een verwachting " +
        "of een bronzin waarvan de strekking niet eenduidig is. Ze horen in een bericht alleen " +
        "met deze kwalificatie erbij, en nooit als geldende regel.*",
    );
    regels.push("");
    for (const u of nietVastgesteldeWaarden.slice(0, 10)) {
      const waarde = `${nlGetal(u.waarde_numeriek)} ${u.eenheid ?? ""}`.trim();
      regels.push(`- **${waarde}** — ${modaliteitLabel(u)}. Genoemd door ${u.uitgever}.`);
    }
    regels.push("");
  }

  regels.push("## Wat dit betekent voor bedrijven");
  regels.push("");
  regels.push(
    "*Dit onderdeel is een interpretatie van Vibe Energy op basis van de bovenstaande " +
      "vastgelegde waarden. Het is geen uitspraak van de genoemde bron.*",
  );
  regels.push("");
  regels.push(
    `${invoer.clusterOmschrijving ?? "Deze ontwikkeling raakt de energiesituatie van bedrijven."} ` +
      `Voor een bedrijf is de relevante vraag wat dit doet met ${oplossing.oplossing}.`,
  );
  regels.push("");

  regels.push("## Waar dit geldt");
  regels.push("");
  if (geoMetBewijs.length === 0) {
    /* HIER STOND EEN STILLE GEVOLGTREKKING, EN DIE WAS EEN DEFECT.
       De tekst was: "De bron noemt geen specifiek gebied. Deze
       ontwikkeling wordt daarom als landelijk behandeld". Dat maakt van
       een LEEG geoveld de bewering dat het feit in heel Nederland geldt
       — ook wanneer de bron over Vlaanderen gaat. Een leeg veld is geen
       bewijs. De poort `toepassingsgebied_is_nederlands` houdt een
       buitenlandse brontekst nu tegen, en deze tekst doet geen uitspraak
       meer die het bewijs niet draagt. */
    regels.push(
      "De bron noemt geen specifiek gebied binnen Nederland. Er is daarom geen bewijs dat " +
        "deze ontwikkeling voor een bepaalde gemeente of netbeheerdergebied anders uitpakt — " +
        "en ook geen bewijs dat hij overal hetzelfde uitpakt.",
    );
  } else {
    regels.push(
      `De bron noemt zelf ${geoMetBewijs.map((g) => `${g.naam} (${g.soort})`).join(", ")}. ` +
        "Buiten die gebieden is er geen bewijs dat deze ontwikkeling geldt.",
    );
  }
  regels.push("");

  regels.push("## Bronnen");
  regels.push("");
  const bronnenSectie: { uitgever: string; url: string; datum: string | null }[] = [];
  const gezien = new Set<string>();
  for (const u of uitspraken) {
    if (gezien.has(u.bron_url)) continue;
    gezien.add(u.bron_url);
    const datum = nlDatum(u.gepubliceerd_op);
    bronnenSectie.push({ uitgever: u.uitgever, url: u.bron_url, datum });
    /* R3 — DE SOORT VAN HET DOCUMENT STAAT BIJ DE BRON.
       'Netbeheer Nederland, 12 oktober 2026' zegt niets over of dat
       document een besluit navertelde of erom vroeg. Een lezer die de
       bronnenlijst naloopt hoort dat te zien, en een redacteur die de
       sterkte van een bericht weegt helemaal.

       Is het een navertelling, dan staat er ook bij of het origineel
       bij het bevoegde gezag is TERUGGEVONDEN. Niet-teruggevonden is
       geen bewering dat het besluit niet bestaat; het betekent dat het
       niet in onze eigen verzameling staat. Zie bronverificatie.ts. */
    const soortLabel = u.documentsoort === null ? "" : ` [${u.documentsoort}]`;
    const origineel =
      u.documentsoort === "SECUNDAIRE_BERICHTGEVING"
        ? u.primaire_bron_bevestigd
          ? " — origineel teruggevonden bij het bevoegde gezag"
          : " — origineel NIET teruggevonden in onze bronverzameling"
        : "";
    regels.push(
      `- ${u.uitgever}${datum ? `, ${datum}` : ""}${soortLabel}${origineel} — <${u.bron_url}>`,
    );
  }
  if (bronnenSectie.length === 0) regels.push("- (geen bron gebonden)");
  regels.push("");

  regels.push(`[${oplossing.cta}](${oplossing.ctaPad})`);

  const bodyMarkdown = regels.join("\n");
  const canoniekeUrl = `${config.siteBasisUrl}${pad}`;

  const structuredData: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": soort === "nieuw_artikel" ? "NewsArticle" : "Article",
    headline: titelKern,
    description: metaOmschrijving,
    inLanguage: "nl-NL",
    url: canoniekeUrl,
    datePublished: nlDatum(invoer.gebeurdOp) ?? nlDatum(new Date()),
    publisher: { "@type": "Organization", name: "Vibe Energy", url: config.siteBasisUrl },
    citation: bronnenSectie.map((b) => ({
      "@type": "CreativeWork",
      publisher: { "@type": "Organization", name: b.uitgever },
      url: b.url,
    })),
  };

  return {
    pad,
    soort,
    titel,
    metaOmschrijving,
    canoniekeUrl,
    directAntwoord,
    bodyMarkdown,
    structuredData,
    interneLinks,
    bronnenSectie,
    ctaSleutel: oplossing.cta,
    // Kernclaims zijn de bevestigde uitspraken met een waarde; die
    // dragen de pagina. De rest is ondersteunend.
    /* WAT EEN KERNCLAIM IS: BEVESTIGD, NIET BEVESTIGD-MET-GETAL.
       Hier stond `metWaarde` — bevestigd ÉN waarde_numeriek !== null.
       Gevolg: een gebeurtenis waarvan het bewijs kwalitatief of een
       datum is, kreeg nul kernclaims, en poort 6
       (`kernclaim_heeft_bewijs`) blokkeerde het concept met "geen enkele
       uitspraak is als kernclaim gebonden".

       Gemeten op uitspraak 11 (gebeurtenis 53, 'Ondernemers krijgen in
       2026 meer tijd voor subsidieaanvraag SDE++'): soort 'datum',
       verificatie_status 'bevestigd', bewijs_kwaliteit 5,
       waarde_numeriek NULL — de zin noemt een aanvraagperiode van 27
       oktober tot 26 november 2026. Een volkomen concreet, bevestigd,
       gedateerd feit, en precies het soort bericht dat dit kanaal moet
       dragen. Het werd geweigerd omdat er geen GETAL in een kolom stond.

       Schaal van het probleem, gemeten: van 53 bevestigde uitspraken
       hebben 17 geen numerieke waarde. Voor al die gebeurtenissen was
       een publiceerbaar concept onmogelijk.

       De vraag die poort 6 STELT is "is er bevestigd bewijs onder dit
       artikel". Een getal was daar een proxy voor, en een verkeerde.
       De numerieke discipline zit in poort 7
       (`geen_verzonnen_getallen`), die onafhankelijk eist dat ELK getal
       in de tekst uit een gebonden uitspraak komt. Die poort wordt
       hierdoor niet zwakker: hij leest `waardeNumeriek` van de gebonden
       uitspraken, en een kwalitatieve uitspraak voegt daar niets aan toe.

       Niet-bevestigde uitspraken blijven ondersteunend. Zou een
       ongeverifieerde uitspraak kern worden, dan zou poort 6 juist
       terecht blokkeren. */
    /* R3 — ALLEEN EEN DRAGENDE CLAIM WORDT KERNCLAIM.
       ----------------------------------------------------------------
       Hier stond `bevestigd.map(...)`: élke claim met
       verificatie_status 'bevestigd' werd kernclaim. Een audit over de
       verbruikers van bevestigde claims wees dit aan als blokkerend, en
       terecht: de modaliteitstoets hierboven haalt een lobbyclaim net
       uit de FEITENSECTIE, en drie regels later werd diezelfde claim
       alsnog als KERNCLAIM aan de versie gebonden. Een kernclaim is wat
       het bericht draagt; poort 6 en het publicatiecontract lezen
       precies die rol.

       Niet-dragende claims blijven ondersteunend. Ze verdwijnen dus
       niet uit de versie — dat zou de redactie informatie onthouden —
       maar ze dragen niets. */
    uitspraakBindingen: [
      ...dragend.map((u) => ({ uitspraakId: u.id, rol: "kern" as const })),
      ...uitspraken
        .filter((u) => !dragend.some((m) => m.id === u.id))
        .map((u) => ({ uitspraakId: u.id, rol: "ondersteunend" as const })),
    ],
    invoerVersies: [...new Set(uitspraken.map((u) => u.versie_id))],
  };
}

/**
 * Serialiseert met gesorteerde sleutels, recursief.
 *
 * WAAROM DIT BESTAAT — een defect dat de eigen tests vingen. De afdruk
 * hoort een functie te zijn van de OPGESLAGEN rij: alleen dan kan een
 * latere controle hem narekenen en zien of de tekst buiten de keten om
 * is gewijzigd. Met `JSON.stringify` was hij dat niet.
 *
 * `structured_data` is een `jsonb`-kolom, en jsonb bewaart geen
 * sleutelorde: hij herordent (op lengte, dan bytegewijs) en haalt
 * witruimte weg. Een afdruk die bij de conceptbouw uit het
 * JS-object komt, is daarna dus niet meer te reproduceren uit de
 * kolom — zelfs niet als er niets veranderd is. De hertoets in
 * keurGoed() wees daarom elk legitiem gegenereerd concept af; de
 * R3-eindproef werd rood en had gelijk.
 *
 * Door hier ZELF te sorteren is de orde van jsonb niet meer relevant:
 * beide kanten komen op dezelfde string uit.
 *
 * DE GRENS, EERLIJK BENOEMD. jsonb normaliseert ook getallen en laat
 * dubbele sleutels vallen. Een structured-dataobject met `1.0` of met
 * twee keer dezelfde sleutel zou alsnog uiteen kunnen lopen. Onze
 * schema.org-objecten worden in dit bestand opgebouwd uit strings en
 * hele getallen, dus dat geval bestaat hier niet. Het staat er als
 * waarschuwing voor wie er later iets anders in stopt.
 */
function canoniekJson(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return `[${v.map(canoniekJson).join(",")}]`;
  const o = v as Record<string, unknown>;
  const paren = Object.keys(o)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canoniekJson(o[k])}`);
  return `{${paren.join(",")}}`;
}

/** Afdruk waaraan een goedkeuring bindt. */
export function inhoudAfdruk(c: {
  titel: string;
  directAntwoord: string;
  bodyMarkdown: string;
  structuredData: unknown;
}): string {
  /* De scheiding is een NUL-byte: die kan in normale tekst niet
     voorkomen, dus de afdruk is ondubbelzinnig. Hij staat hier als
     ESCAPE en niet als letterlijke byte, en dat is geen smaak.
     Met een rauwe NUL erin ziet `file` dit bestand als `data` en
     slaat grep het STIL over: een zoekactie naar kiesProvider in dit
     bestand gaf nul resultaten terwijl de aanroep er wel staat. Een
     beveiligingsscan die op grep leunt zou dit hele bestand missen.
     De hash verandert niet: de string is byte-identiek. */
  return sha256hex(
    [c.titel, c.directAntwoord, c.bodyMarkdown, canoniekJson(c.structuredData)].join("\u0000"),
  );
}

const SYSTEEMPROMPT = [
  "Je herschrijft een conceptartikel voor een Nederlandse zakelijke energie-installateur.",
  "",
  "HARDE REGELS, in deze volgorde:",
  "1. Voeg GEEN enkel getal toe dat niet al in de tekst staat. Verander geen getal.",
  "2. Voeg geen feit, naam, bedrijf, locatie of datum toe die niet al in de tekst staat.",
  "3. Verwijder de bronnenlijst niet en verander geen URL.",
  "4. Laat de koppenstructuur en de markdown-opmaak intact.",
  "5. Laat de regel die zegt dat een onderdeel een interpretatie is staan.",
  "6. Beloof niets: geen garantie, geen 'altijd', geen zekerheid over subsidie of capaciteit.",
  "",
  "Je taak is alleen: zakelijker en leesbaarder formuleren in het Nederlands, in de",
  "u-vorm, zonder marketingtaal. Geef uitsluitend de herschreven markdown terug.",
].join("\n");

export type ConceptRapport = {
  readonly kandidaatId: number;
  readonly inhoudVersieId: number | null;
  readonly pad: string;
  readonly poortenGeslaagd: boolean;
  readonly blokkades: readonly string[];
  readonly adviezen: readonly string[];
  readonly modelGebruikt: string;
};

export async function maakConcept(
  pool: Pool,
  organisatieId: number,
  kandidaatId: number,
  opties: { metModel?: boolean } = {},
): Promise<ConceptRapport> {
  const config = configLezen();

  return metOrganisatie(pool, { organisatieId }, async (c) => {
    /* R3 — DE CLAIMPOORT STAAT VOORAAN.
       Een concept is een artefact dat op bewijs rust: de kernclaims
       hieronder binden aan intel.uitspraken en het publicatiecontract
       leest precies die rol. Een concept bouwen op een populatie waarin
       nog historische, onterecht bevestigde claims staan, levert een
       artefact op dat later niet meer te verantwoorden is. */
    await eisHerbeoordeling(c, organisatieId, "de conceptgeneratie");

    const k = await eenRij<ConceptInvoer & { gebeurtenis_titel: string; gebeurd_op: Date | null }>(
      c,
      `select k.id                as "kandidaatId",
              k.gebeurtenis_id    as "gebeurtenisId",
              k.besluit,
              oc.sleutel          as "clusterSleutel",
              oc.naam             as "clusterNaam",
              oc.omschrijving     as "clusterOmschrijving",
              k.risico_klasse     as "risicoKlasse",
              g.titel             as gebeurtenis_titel,
              g.gebeurd_op,
              k.doel_pagina_id    as "doelPaginaId",
              pr.pad              as "doelPaginaPad",
              pr.beheer           as "doelPaginaBeheer"
         from intel.inhoud_kandidaten k
         join intel.markt_gebeurtenissen g on g.id = k.gebeurtenis_id
         left join intel.onderwerp_clusters oc on oc.id = k.onderwerp_cluster_id
         left join intel.pagina_register pr on pr.id = k.doel_pagina_id
        where k.organisatie_id = $1 and k.id = $2`,
      [organisatieId, kandidaatId],
    );
    if (!k) throw new Error(`kandidaat ${kandidaatId} bestaat niet`);

    const uitspraken = await rijen<UitspraakRij>(
      c,
      `select distinct on (u.id)
              u.id, u.tekst, u.soort, u.waarde_numeriek, u.eenheid,
              u.geldig_vanaf, u.geldig_tot, u.verificatie_status,
              b.uitgever, d.canonieke_url as bron_url, v.id as versie_id,
              d.gepubliceerd_op,
              /* R3 — de modaliteit van de claim en de soort van het
                 document waaruit hij komt. Zonder deze vier velden kan
                 bouwConcept() niet scheiden wat vaststaat van wat
                 gevraagd of verwacht wordt. */
              u.modaliteit, u.modaliteit_zekerheid::text as modaliteit_zekerheid,
              v.documentsoort, u.primaire_bron_bevestigd
         from intel.uitspraken u
         /* ROL = PRIMAIR, en dat is een correctie van een echte fout.
            Hier stond geen rolvoorwaarde en eronder
            'order by u.id, ub.rol' bij een 'distinct on (u.id)'. De
            toegestane rollen zijn ('primair', 'bevestigend',
            'tegensprekend'), en die sorteren ALFABETISCH. Dus koos deze
            query bij een claim met meerdere bindingen de BEVESTIGENDE
            versie, en niet de primaire -- precies de versie waarvan de
            claim niet afkomstig is. De documentsoort die daaruit kwam
            voedde claimDraagt(), dus een navertelling kon de soort van
            een bevestigend besluit lenen. Dat is de fout die R3 moet
            uitsluiten.
            De schrijfkant gebruikte altijd de primaire versie; deze
            leeskant nu ook. Zie claimpoort.ts bij
            WACHT_OP_HERBEOORDELING_SQL. */
         join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id and ub.rol = 'primair'
         join intel.brondocument_versies v on v.id = ub.versie_id
         join intel.brondocumenten d on d.id = v.brondocument_id
         join intel.bronnen b on b.id = d.bron_id
        where u.gebeurtenis_id = $1
        order by u.id, v.id`,
      [k.gebeurtenisId],
    );

    const geo = await rijen<{ naam: string; soort: string; grondslag: string }>(
      c,
      `select gb.naam, gb.soort, gg.grondslag
         from intel.gebeurtenis_geo gg
         join intel.geo_bereiken gb on gb.id = gg.geo_bereik_id
        where gg.gebeurtenis_id = $1`,
      [k.gebeurtenisId],
    );

    const paden = await rijen<{ pad: string }>(
      c,
      "select pad from intel.pagina_register where organisatie_id = $1 and bestaat_in_repo",
      [organisatieId],
    );
    const bestaandePaden = new Set(paden.map((p) => p.pad));

    const invoer: ConceptInvoer = { ...k, gebeurtenisTitel: k.gebeurtenis_titel, gebeurdOp: k.gebeurd_op };
    let concept = bouwConcept(invoer, uitspraken, geo, bestaandePaden);

    /* De injectiestand van de bronversies waar dit concept uit komt.
       Dezelfde vraag die motor.ts regel 374-378 stelt, maar gebonden aan
       de versies van DIT concept in plaats van aan de gebeurtenis. Komt
       er geen enkele versie uit (een concept zonder uitspraken), dan is
       er ook geen verdachte bron — `any(array[])` op een lege array
       geeft false, en dat is hier het juiste antwoord. */
    const injectie = await eenRij<{ verdacht: boolean }>(
      c,
      `select exists (
                select 1 from intel.brondocument_versies bv
                 where bv.injectie_verdacht and bv.id = any($1::bigint[])
              ) as verdacht`,
      [concept.invoerVersies],
    );
    const injectieInBron = injectie?.verdacht ?? false;
    if (injectieInBron) {
      log.waarschuwing("concept komt uit een injectieverdachte bronversie", {
        kandidaat: kandidaatId,
        versies: concept.invoerVersies,
      });
    }

    // Optioneel: het model mag de tekst herschrijven. Faalt dat of
    // voegt het een getal toe, dan valt de poort erop en blijft het
    // deterministische concept staan.
    let modelGebruikt = "deterministisch";
    if (opties.metModel) {
      const provider: Provider = kiesProvider();

      /* Vier grendels vóór een declarabele aanroep, elk met een eigen
         reden om te bestaan:

           1 de ALLOWLIST — een model dat niet expliciet is toegestaan
             wordt niet aangeroepen, ook niet als de configuratie hem
             noemt. Een lege allowlist betekent niets toegestaan; dat
             is de veilige kant bij een verse installatie.
           2 de STROOMONDERBREKER — bij een provider die structureel
             faalt is doorgaan geld betalen voor mislukte aanroepen.
           3 het BUDGET — dag, maand, tokens en gemeten kosten.
           4 de deterministische TERUGVAL — elke grendel laat het
             deterministische concept staan en breekt niets. De
             ingestielaag en de poorten werken zonder model.

         De orde is niet vrij: allowlist en onderbreker zijn gratis
         databasevragen, het budget ook, en pas daarna mag er geld
         uit. */
      const allow = await isModelToegestaan(c, provider.naam, provider.model);
      const breker = await onderbrekerStand(c, organisatieId);
      /* `betaald` hangt aan de provider: alleen een echte openai-aanroep
         kost geld, en alleen die hoort door de geldgrendels. */
      const budget = await budgetStand(c, organisatieId, provider.naam === "openai");

      if (provider.naam !== "openai") {
        log.info("deterministische provider; geen modelaanroep", { provider: provider.naam });
      } else if (!allow.toegestaan) {
        log.waarschuwing("modelaanroep overgeslagen: niet op de allowlist", {
          model: provider.model,
          reden: allow.reden,
        });
      } else if (breker.open) {
        log.waarschuwing("modelaanroep overgeslagen: stroomonderbreker open", {
          tot: breker.openTot,
          reden: breker.reden,
        });
      } else if (!budget.mag) {
        log.waarschuwing("modelaanroep overgeslagen wegens budget", { reden: budget.reden });
      } else {
        try {
          const antwoord = await provider.genereer({
            doel: "concept_herschrijven",
            systeem: SYSTEEMPROMPT,
            gebruiker: concept.bodyMarkdown,
          });
          await boekAanroep(c, organisatieId, {
            doel: "concept_herschrijven",
            antwoord,
            provider: antwoord.provider,
            model: antwoord.model,
            promptHash: antwoord.promptHash,
            geslaagd: true,
          });
          // De onderbrekerteller terug naar nul: deze provider werkt.
          await meldSucces(c, organisatieId);
          const herschreven = { ...concept, bodyMarkdown: antwoord.tekst.trim() };
          // Alleen overnemen als het geen nieuwe getallen introduceert.
          const proef = toetsVoorConcept(
            herschreven,
            invoer,
            uitspraken,
            bestaandePaden,
            config.siteBasisUrl,
            injectieInBron,
          );
          const samenvatting = vatPoortenSamen(proef);
          const nieuweGetallen = samenvatting.blokkades.some((b) =>
            b.startsWith("geen_verzonnen_getallen"),
          );
          if (nieuweGetallen) {
            log.waarschuwing("modelversie introduceerde getallen; deterministische tekst behouden", {
              kandidaat: kandidaatId,
            });
          } else {
            concept = herschreven;
            modelGebruikt = `${antwoord.provider}:${antwoord.model}`;
          }
        } catch (e) {
          await boekAanroep(c, organisatieId, {
            doel: "concept_herschrijven",
            antwoord: null,
            provider: provider.naam,
            model: provider.model,
            promptHash: "n.v.t.",
            geslaagd: false,
            foutSoort: (e as Error).message.slice(0, 200),
          });
          /* De onderbreker meetellen. Na vijf mislukkingen achtereen
             gaat hij vijftien minuten open en kost een vastgelopen
             provider geen geld meer. */
          const na = await meldMislukking(c, organisatieId, (e as Error).message);
          log.waarschuwing("modelaanroep mislukt; deterministische tekst behouden", {
            fout: e,
            mislukt_achtereen: na.misluktAchtereen,
            onderbreker_open: na.open,
          });
        }
      }
    }

    const resultaten = toetsVoorConcept(
      concept,
      invoer,
      uitspraken,
      bestaandePaden,
      config.siteBasisUrl,
      injectieInBron,
    );
    const samenvatting = vatPoortenSamen(resultaten);
    const afdruk = inhoudAfdruk(concept);

    const volgende = await eenRij<{ v: number }>(
      c,
      `select coalesce(max(versie), 0) + 1 as v from intel.inhoud_versies
        where organisatie_id = $1 and pad = $2`,
      [organisatieId, concept.pad],
    );

    const versie = await eenRij<{ id: number }>(
      c,
      `insert into intel.inhoud_versies
         (organisatie_id, kandidaat_id, pagina_id, pad, versie, soort, titel,
          meta_omschrijving, canonieke_url, direct_antwoord, body_markdown,
          structured_data, interne_links, bronnen_sectie, cta_sleutel,
          status, risico_klasse, auteur_soort, model, prompt_hash,
          invoer_versies, poortresultaten, poorten_geslaagd, inhoud_afdruk, blokkades)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
               'ter_review',$16,$17,$18,$19,$20,$21,$22,$23,$24)
       returning id`,
      [
        organisatieId,
        kandidaatId,
        invoer.doelPaginaId,
        concept.pad,
        volgende?.v ?? 1,
        concept.soort,
        concept.titel,
        concept.metaOmschrijving,
        concept.canoniekeUrl,
        concept.directAntwoord,
        concept.bodyMarkdown,
        JSON.stringify(concept.structuredData),
        JSON.stringify(concept.interneLinks),
        JSON.stringify(concept.bronnenSectie),
        concept.ctaSleutel,
        invoer.risicoKlasse,
        /* AUTEURSCHAP, EERLIJK GEREGISTREERD.
           Hier stond `modelGebruikt === "deterministisch" ? "mens" : "ai"`.
           Gevolg, gemeten: alle 7 inhoudsversies in de database staan op
           auteur_soort='mens' met model='deterministisch'. Geen mens
           heeft ook maar één van die teksten geschreven — bouwConcept()
           deed dat.

           Een deterministische opbouw is geen MENS maar een MACHINE
           zonder model. Het enum kent twee waarden ('ai','mens'), en van
           die twee is 'ai' de juiste: de vraag die het veld beantwoordt
           is "heeft een mens dit geschreven", en het antwoord is nee.
           Dat is geen muggenzifterij maar de voorwaarde onder §9 van de
           opdracht: menselijke goedkeuring moet HERLEIDBAAR zijn, en dat
           kan niet als het auditspoor de machine als mens opvoert.

           Dit veld wordt in heel src/ alleen geschreven en nooit
           gelezen, dus er verandert geen gedrag — alleen de waarheid van
           de registratie. `aangemaakt_door` blijft NULL, en dat is
           consistent: er is geen menselijke auteur om naar te wijzen. */
        "ai",
        modelGebruikt,
        afdruk,
        concept.invoerVersies,
        JSON.stringify(resultaten),
        samenvatting.geslaagd,
        afdruk,
        samenvatting.blokkades,
      ],
    );
    if (!versie) throw new Error("inhoudsversie niet geschreven");

    for (const binding of concept.uitspraakBindingen) {
      await c.query(
        `insert into intel.inhoud_uitspraken
           (organisatie_id, inhoud_versie_id, uitspraak_id, rol)
         values ($1, $2, $3, $4)
         on conflict (inhoud_versie_id, uitspraak_id) do nothing`,
        [organisatieId, versie.id, binding.uitspraakId, binding.rol],
      );
    }

    await c.query(
      `insert into intel.publicatiebesluiten
         (organisatie_id, inhoud_versie_id, besluit, actor_soort, motivatie, poortresultaten)
       values ($1, $2, 'ingediend', 'systeem', $3, $4)`,
      [
        organisatieId,
        versie.id,
        `concept opgebouwd uit ${uitspraken.length} uitspraken; poorten ${
          samenvatting.geslaagd ? "geslaagd" : `geblokkeerd (${samenvatting.blokkades.length})`
        }`,
        JSON.stringify(resultaten),
      ],
    );

    await c.query(
      "update intel.inhoud_kandidaten set status = 'in_concept' where id = $1",
      [kandidaatId],
    );

    return {
      kandidaatId,
      inhoudVersieId: versie.id,
      pad: concept.pad,
      poortenGeslaagd: samenvatting.geslaagd,
      blokkades: samenvatting.blokkades,
      adviezen: samenvatting.adviezen,
      modelGebruikt,
    };
  });
}

/* ============================================================
   HERTOETSEN — dezelfde poorten over een BESTAANDE versie
   ------------------------------------------------------------
   WAAROM DIT BESTAAT. Het redactionele dashboard moet een concept
   kunnen laten AANPASSEN (§8 van de opdracht). Een aangepaste tekst die
   de oude poortuitslag houdt, is het gevaarlijkste wat er is: de
   redacteur zet een getal in de tekst, `poorten_geslaagd` blijft op
   true staan, en publiceer() laat het door omdat het die kolom leest.

   Daarom loopt een bewerking door EXACT dezelfde poorten als de
   generatie. Niet een tweede, mildere set — dat is de les uit
   voorstel.ts: twee oordelen over dezelfde vraag lopen altijd uiteen.

   DE AFDRUK WORDT OPNIEUW BEREKEND. Een goedkeuring bindt aan de
   afdruk (inhoud_versies_goedkeuring_bindt), dus een gewijzigde tekst
   hoort een nieuwe afdruk te krijgen. Staat de versie al op
   goedgekeurd, dan weigert de database die update — en dat is precies
   goed: een goedgekeurde tekst wijzig je niet, je maakt een nieuwe
   versie.
   ============================================================ */

export type HertoetsUitkomst = {
  readonly versieId: number;
  readonly poortenGeslaagd: boolean;
  readonly blokkades: readonly string[];
  readonly adviezen: readonly string[];
  readonly afdruk: string;
};

/**
 * Toetst een bestaande inhoudsversie opnieuw tegen alle poorten en
 * schrijft de uitslag terug.
 *
 * Geeft `null` als de versie niet bestaat in deze organisatie.
 */
export async function hertoetsInhoudVersie(
  c: pg.PoolClient,
  organisatieId: number,
  versieId: number,
): Promise<HertoetsUitkomst | null> {
  const config = configLezen();

  const v = await eenRij<{
    pad: string;
    titel: string;
    meta_omschrijving: string | null;
    canonieke_url: string;
    direct_antwoord: string | null;
    body_markdown: string;
    structured_data: unknown;
    interne_links: string[] | null;
    bronnen_sectie: { uitgever: string; url: string }[] | null;
    risico_klasse: "laag" | "midden" | "hoog";
    goedgekeurd_door: number | null;
    invoer_versies: number[] | null;
    doel_pagina_beheer: "handmatig" | "intelligence" | null;
  }>(
    c,
    `select v.pad, v.titel, v.meta_omschrijving, v.canonieke_url, v.direct_antwoord,
            v.body_markdown, v.structured_data, v.interne_links, v.bronnen_sectie,
            v.risico_klasse, v.goedgekeurd_door, v.invoer_versies,
            pr.beheer as doel_pagina_beheer
       from intel.inhoud_versies v
       left join intel.pagina_register pr
              on pr.organisatie_id = v.organisatie_id and pr.id = v.pagina_id
      where v.organisatie_id = $1 and v.id = $2`,
    [organisatieId, versieId],
  );
  if (!v) return null;

  /* De GEBONDEN uitspraken, met hun rol zoals die is vastgelegd. Niet
     opnieuw afleiden: de binding is een feit in intel.inhoud_uitspraken
     en hoort niet per hertoets te verschuiven. */
  const gebonden = await rijen<{
    id: number;
    tekst: string;
    soort: string;
    waarde_numeriek: string | null;
    eenheid: string | null;
    geldig_vanaf: string | null;
    geldig_tot: string | null;
    verificatie_status: string;
    rol: "kern" | "ondersteunend" | "context";
    modaliteit: string | null;
    modaliteit_zekerheid: string | null;
    documentsoort: string | null;
  }>(
    c,
    /* R3 — DE DRIE VELDEN DIE HIER ONTBRAKEN.
       De audit vond het: deze query haalde geen enkel R3-veld op, dus
       de hertoets gaf poort 6 alleen `verificatie_status` mee en kon
       niet zien of een kernclaim nog droeg. Een redacteur die een
       concept bewerkte, kreeg daardoor een PASS op precies de poort die
       hem had moeten waarschuwen -- dezelfde vorm als de valse PASS op
       de injectiepoort die eerder in dit bestand is gerepareerd.
       De join op rol = 'primair' is dezelfde als in bouwConcept; zie de
       toelichting daar en in claimpoort.ts. */
    `select u.id, u.tekst, u.soort, u.waarde_numeriek, u.eenheid,
            u.geldig_vanaf, u.geldig_tot, u.verificatie_status, iu.rol,
            u.modaliteit, u.modaliteit_zekerheid::text as modaliteit_zekerheid,
            bv.documentsoort
       from intel.inhoud_uitspraken iu
       join intel.uitspraken u on u.id = iu.uitspraak_id
       left join intel.uitspraak_bronnen ub
              on ub.uitspraak_id = u.id and ub.rol = 'primair'
       left join intel.brondocument_versies bv on bv.id = ub.versie_id
      where iu.organisatie_id = $1 and iu.inhoud_versie_id = $2
      order by u.id, bv.id`,
    [organisatieId, versieId],
  );

  const paden = await rijen<{ pad: string }>(
    c,
    "select pad from intel.pagina_register where organisatie_id = $1 and bestaat_in_repo",
    [organisatieId],
  );

  const injectie = await eenRij<{ verdacht: boolean }>(
    c,
    `select exists (
              select 1 from intel.brondocument_versies bv
               where bv.injectie_verdacht and bv.id = any($1::bigint[])
            ) as verdacht`,
    [v.invoer_versies ?? []],
  );

  const resultaten = toetsConcept({
    pad: v.pad,
    titel: v.titel,
    metaOmschrijving: v.meta_omschrijving,
    canoniekeUrl: v.canonieke_url,
    directAntwoord: v.direct_antwoord,
    bodyMarkdown: v.body_markdown,
    structuredData: v.structured_data,
    interneLinks: v.interne_links ?? [],
    bronnenSectie: v.bronnen_sectie ?? [],
    risicoKlasse: v.risico_klasse,
    goedgekeurdDoor: v.goedgekeurd_door,
    uitspraken: gebonden.map((u) => {
      const kern = {
        verificatieStatus: u.verificatie_status,
        modaliteit: u.modaliteit,
        modaliteitZekerheid:
          u.modaliteit_zekerheid === null ? null : Number(u.modaliteit_zekerheid),
        documentsoort: u.documentsoort,
      };
      return {
        id: u.id,
        tekst: u.tekst,
        soort: u.soort,
        waardeNumeriek: u.waarde_numeriek === null ? null : Number(u.waarde_numeriek),
        eenheid: u.eenheid,
        geldigVanaf: u.geldig_vanaf,
        geldigTot: u.geldig_tot,
        verificatieStatus: u.verificatie_status,
        rol: u.rol,
        draagt: claimDraagt(kern),
        waaromNietDragend: waaromNietDragend(kern),
      };
    }),
    bronteksten: gebonden.map((u) => u.tekst),
    injectieInBron: injectie?.verdacht ?? false,
    bestaandePaden: new Set(paden.map((p) => p.pad)),
    siteBasisUrl: config.siteBasisUrl,
    doelPaginaBeheer: v.doel_pagina_beheer,
  });

  const samenvatting = vatPoortenSamen(resultaten);
  const afdruk = inhoudAfdruk({
    titel: v.titel,
    directAntwoord: v.direct_antwoord ?? "",
    bodyMarkdown: v.body_markdown,
    structuredData: v.structured_data,
  });

  /* DE CLAIMPOORT HOORT OOK IN DE OPGESLAGEN UITSLAG.
     `publiceer()` leest `poorten_geslaagd` als bewijs dat alles klopte.
     Zolang die kolom op true kan staan terwijl de populatie gemengd is
     of een binding is gewijzigd, is hij een belofte die de keten niet
     kan nakomen. Door de bewijsblokkades HIER mee te nemen kan de
     kolom dat niet meer: wat de tweede poort afkeurt, staat ook in
     `blokkades`.

     GEEN AUDITREGEL HIER, en dat is een keuze. Een hertoets is een
     DIAGNOSE en geen besluit; een redacteur die drie keer een komma
     verplaatst hoort geen drie 'automatisch_geblokkeerd'-besluiten in
     het publicatielogboek te veroorzaken. De auditregel valt op de
     plekken waar werkelijk iets wordt besloten: goedkeuren en
     publiceren. */
  const bewijs = await toetsGebondenBewijs(c, organisatieId, versieId);
  const blokkades = [...samenvatting.blokkades, ...bewijs.blokkades];
  const geslaagd = samenvatting.geslaagd && bewijs.blokkades.length === 0;

  await c.query(
    `update intel.inhoud_versies
        set poortresultaten = $2,
            poorten_geslaagd = $3,
            blokkades = $4,
            inhoud_afdruk = $5
      where id = $1`,
    /* `poortresultaten` BLIJFT EEN ARRAY van poortuitslagen. De
       studiopagina leest hem met `Array.isArray(v.poortresultaten)`
       (dashboard/server.ts regel 1693) en zou bij een object stil geen
       enkele poort meer tonen. De bewijsblokkades staan in
       `blokkades`, dat de studio ook rendert; de volledige
       claimtoestand gaat naar de auditregel op de besluitmomenten. */
    [versieId, JSON.stringify(resultaten), geslaagd, blokkades, afdruk],
  );

  log.info("inhoudsversie hertoetst", {
    versie: versieId,
    geslaagd,
    blokkades: blokkades.length,
    bewijsblokkades: bewijs.blokkades.length,
  });

  return {
    versieId,
    poortenGeslaagd: geslaagd,
    blokkades,
    adviezen: samenvatting.adviezen,
    afdruk,
  };
}

function toetsVoorConcept(
  concept: OpgebouwdConcept,
  invoer: ConceptInvoer,
  uitspraken: readonly UitspraakRij[],
  bestaandePaden: ReadonlySet<string>,
  siteBasisUrl: string,
  /* GEMETEN, NIET AANGENOMEN.
     Hier stond `injectieInBron: false` als constante in de aanroep
     hieronder. Gevolg: poort 10 (`injectiebron_vereist_mens`) meldde in
     de conceptroute ALTIJD 'geslaagd', ook wanneer het concept uit een
     bronversie kwam die de injectiedetector verdacht had verklaard.

     De besluitmotor leest dat feit wél — motor.ts regel 374-378 doet
     `exists (... where v.injectie_verdacht)` — dus de waarheid stond in
     de database en werd op deze ene plek weggegooid. De
     database-invariant `injectiebron_zonder_mens` (0009 regel 397) vangt
     het alsnog, maar pas bij status goedgekeurd/gepubliceerd. Een
     redacteur die het poortoverzicht van een concept leest, zag tot nu
     toe een valse PASS op precies de poort die hem had moeten
     waarschuwen. */
  injectieInBron: boolean,
) {
  const gebonden: GebondenUitspraak[] = uitspraken.map((u) => {
    const kern = {
      verificatieStatus: u.verificatie_status,
      modaliteit: u.modaliteit,
      modaliteitZekerheid:
        u.modaliteit_zekerheid === null ? null : Number(u.modaliteit_zekerheid),
      documentsoort: u.documentsoort,
    };
    return {
      id: u.id,
      tekst: u.tekst,
      soort: u.soort,
      waardeNumeriek: u.waarde_numeriek === null ? null : Number(u.waarde_numeriek),
      eenheid: u.eenheid,
      geldigVanaf: u.geldig_vanaf,
      geldigTot: u.geldig_tot,
      verificatieStatus: u.verificatie_status,
      rol:
        concept.uitspraakBindingen.find((b) => b.uitspraakId === u.id)?.rol ?? "context",
      draagt: claimDraagt(kern),
      waaromNietDragend: waaromNietDragend(kern),
    };
  });

  return toetsConcept({
    pad: concept.pad,
    titel: concept.titel,
    metaOmschrijving: concept.metaOmschrijving,
    canoniekeUrl: concept.canoniekeUrl,
    directAntwoord: concept.directAntwoord,
    bodyMarkdown: concept.bodyMarkdown,
    structuredData: concept.structuredData,
    interneLinks: concept.interneLinks,
    bronnenSectie: concept.bronnenSectie,
    risicoKlasse: invoer.risicoKlasse,
    goedgekeurdDoor: null,
    uitspraken: gebonden,
    // De bronzinnen zelf, om herpublicatie te kunnen meten.
    bronteksten: uitspraken.map((u) => u.tekst),
    injectieInBron,
    bestaandePaden,
    siteBasisUrl,
    doelPaginaBeheer: invoer.doelPaginaBeheer,
  });
}
