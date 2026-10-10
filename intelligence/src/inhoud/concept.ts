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

import { configLezen } from "../kern/config.ts";
import { eenRij, metOrganisatie, rijen, type Pool } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import { kort, sha256hex, slug } from "../kern/tekst.ts";
import { boekAanroep, controleerBudget, kiesProvider, type Provider } from "./model.ts";
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
};

function soortVanBesluit(besluit: string): OpgebouwdConcept["soort"] {
  switch (besluit) {
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
  const metWaarde = bevestigd.filter((u) => u.waarde_numeriek !== null);
  const uitgevers = [...new Set(uitspraken.map((u) => u.uitgever))];

  const soort = soortVanBesluit(invoer.besluit);
  const pad =
    soort === "pagina_update" || soort === "kennis_update"
      ? (invoer.doelPaginaPad ?? `/kennis-${slug(invoer.gebeurtenisTitel)}`)
      : `/nieuws-${slug(invoer.gebeurtenisTitel)}`;

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
    regels.push(
      "Er zijn voor deze ontwikkeling nog geen harde waarden uit een primaire bron vastgelegd. " +
        "Zodra die er zijn, wordt dit onderdeel aangevuld.",
    );
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
    regels.push(
      "De bron noemt geen specifiek gebied. Deze ontwikkeling wordt daarom als landelijk " +
        "behandeld; er is geen bewijs dat hij voor een bepaalde gemeente of netbeheerdergebied " +
        "anders uitpakt.",
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
    regels.push(`- ${u.uitgever}${datum ? `, ${datum}` : ""} — <${u.bron_url}>`);
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
    uitspraakBindingen: [
      ...metWaarde.map((u) => ({ uitspraakId: u.id, rol: "kern" as const })),
      ...uitspraken
        .filter((u) => !metWaarde.some((m) => m.id === u.id))
        .map((u) => ({ uitspraakId: u.id, rol: "ondersteunend" as const })),
    ],
    invoerVersies: [...new Set(uitspraken.map((u) => u.versie_id))],
  };
}

/** Afdruk waaraan een goedkeuring bindt. */
export function inhoudAfdruk(c: {
  titel: string;
  directAntwoord: string;
  bodyMarkdown: string;
  structuredData: unknown;
}): string {
  return sha256hex(
    [c.titel, c.directAntwoord, c.bodyMarkdown, JSON.stringify(c.structuredData)].join(" "),
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
              d.gepubliceerd_op
         from intel.uitspraken u
         join intel.uitspraak_bronnen ub on ub.uitspraak_id = u.id
         join intel.brondocument_versies v on v.id = ub.versie_id
         join intel.brondocumenten d on d.id = v.brondocument_id
         join intel.bronnen b on b.id = d.bron_id
        where u.gebeurtenis_id = $1
        order by u.id, ub.rol`,
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

    // Optioneel: het model mag de tekst herschrijven. Faalt dat of
    // voegt het een getal toe, dan valt de poort erop en blijft het
    // deterministische concept staan.
    let modelGebruikt = "deterministisch";
    if (opties.metModel) {
      const provider: Provider = kiesProvider();
      const budget = await controleerBudget(c, organisatieId);
      if (!budget.mag) {
        log.waarschuwing("modelaanroep overgeslagen wegens budget", { reden: budget.reden });
      } else if (provider.naam === "openai") {
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
          const herschreven = { ...concept, bodyMarkdown: antwoord.tekst.trim() };
          // Alleen overnemen als het geen nieuwe getallen introduceert.
          const proef = toetsVoorConcept(herschreven, invoer, uitspraken, bestaandePaden, config.siteBasisUrl);
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
          log.waarschuwing("modelaanroep mislukt; deterministische tekst behouden", { fout: e });
        }
      }
    }

    const resultaten = toetsVoorConcept(
      concept,
      invoer,
      uitspraken,
      bestaandePaden,
      config.siteBasisUrl,
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
        modelGebruikt === "deterministisch" ? "mens" : "ai",
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

function toetsVoorConcept(
  concept: OpgebouwdConcept,
  invoer: ConceptInvoer,
  uitspraken: readonly UitspraakRij[],
  bestaandePaden: ReadonlySet<string>,
  siteBasisUrl: string,
) {
  const gebonden: GebondenUitspraak[] = uitspraken.map((u) => ({
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
  }));

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
    injectieInBron: false,
    bestaandePaden,
    siteBasisUrl,
    doelPaginaBeheer: invoer.doelPaginaBeheer,
  });
}
