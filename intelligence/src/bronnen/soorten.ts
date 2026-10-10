/* ============================================================
   BRONNEN — het contract
   ------------------------------------------------------------
   De canonieke bronomschrijving staat hier, in code, en niet in de
   database. Dat is een bewuste keuze: of een uitgever automatisch
   ophalen toestaat, en of er een tekst-en-datamining-voorbehoud
   geldt, is een beoordeling die in code review hoort en niet in een
   bewerkbare tabelrij. `intel.bronnen` draagt daarom alleen de
   GEMETEN toestand: wanneer voor het laatst opgehaald, met welke
   etag, hoe gezond, hoeveel opeenvolgende fouten.
   ============================================================ */

export type BronSoort =
  | "rss"
  | "atom"
  | "json_api"
  | "odata"
  | "sru"
  | "sitemap"
  | "html_lijst"
  | "dataset"
  | "tijdreeks"
  | "wfs";

export type UitgeverSoort =
  | "rijksoverheid"
  | "toezichthouder"
  | "statistiek"
  | "netbeheerder"
  | "branchevereniging"
  | "aanbestedingen"
  | "geodata"
  | "vakmedium"
  | "marktplatform";

/** Vaste onderwerptaxonomie voor de B2B-energiemarkt van Vibe. */
export type Onderwerp =
  | "netcongestie"
  | "netbeheer"
  | "subsidie"
  | "regelgeving"
  | "marktprijs"
  | "flexibiliteit"
  | "bess"
  | "ems"
  | "laadinfrastructuur"
  | "zonne-energie"
  | "vastgoedverduurzaming"
  | "aanbesteding"
  | "vergunning"
  | "statistiek"
  | "geografie";

export type RobotsStatus = "toegestaan" | "verboden" | "onbekend";
export type TdmStatus = "geen_voorbehoud" | "voorbehoud" | "onbekend";
export type VerificatieStatus = "geverifieerd" | "onbevestigd" | "afgewezen";
export type Gezondheid = "HEALTHY" | "DEGRADED" | "QUIET" | "BROKEN" | "DISABLED" | "ONBEKEND";

export type DatumHerkomst =
  | "feed"
  | "sitemap_lastmod"
  | "news_sitemap"
  | "item_metadata"
  | "pagina_inhoud"
  | "onbekend";

export type Bron = {
  readonly sleutel: string;
  readonly uitgever: string;
  readonly uitgeverSoort: UitgeverSoort;
  readonly soort: BronSoort;

  readonly basisUrl: string;
  readonly endpointUrl: string;
  /**
   * Redirect-allowlist. Een feed die buiten deze hosts wil uitkomen
   * wordt geweigerd in plaats van gevolgd — anders bepaalt de uitgever
   * welke host wij aanspreken.
   */
  readonly toegestaneHosts: readonly string[];

  readonly taal: string;
  readonly geoBereik: string;
  readonly onderwerpen: readonly Onderwerp[];

  /** Primaire bron = de uitgever is zelf de autoriteit over dit feit. */
  readonly isPrimaireBron: boolean;
  readonly betrouwbaarheid: 1 | 2 | 3 | 4 | 5;

  readonly licentie: string | null;
  readonly licentieUrl: string | null;
  /**
   * Eigen woorden van de uitgever waarin hergebruik wordt toegestaan,
   * zonder benoemde licentie. Letterlijk citeren, niet samenvatten:
   * dit is de grondslag waarop wij ophalen.
   */
  readonly hergebruikVerklaring: string | null;
  readonly robotsStatus: RobotsStatus;
  readonly tdmStatus: TdmStatus;
  readonly magCiteren: boolean;
  readonly citaatLimietTekens: number;

  /** Uitkomst van een echte ophaling met geparseerde items. */
  readonly verificatie: {
    readonly status: VerificatieStatus;
    readonly bewijs: string;
    readonly op: string | null;
  };

  readonly ophaalintervalMinuten: number;
  readonly minIntervalSeconden: number;
  readonly maxItemsPerOphaling: number;
  readonly maxBytes: number;

  readonly actief: boolean;
  /** Verplicht als actief false is: waarom staat deze bron uit. */
  readonly inactiefReden: string | null;
  /**
   * Levert deze bron marktgebeurtenissen, of alleen referentiedata?
   * PDOK-gemeentegrenzen zijn geen gebeurtenis in de markt; die vullen
   * intel.geo_bereiken. Zie migratie 0012.
   */
  readonly levertGebeurtenissen: boolean;

  /** Welke itemurls meetellen. Uitsluiten wint van includeren. */
  readonly urlPatroon: RegExp | null;
  readonly uitsluitPatroon: RegExp | null;

  /** Wat we van deze bron bewaren, in gewone woorden. */
  readonly bewaren: string;
  readonly config: Readonly<Record<string, unknown>>;
  readonly notities: string;
};

/** Eén item zoals een parser het oplevert, vóór normalisatie. */
export type RuwItem = {
  externId: string;
  url: string;
  titel: string;
  samenvatting: string | null;
  tekst: string | null;
  gepubliceerdOp: Date | null;
  datumHerkomst: DatumHerkomst;
  extra: Record<string, unknown>;
};

export type OphaalResultaat =
  | {
      resultaat: "ok";
      httpStatus: number;
      items: RuwItem[];
      etag: string | null;
      lastModified: string | null;
      bytes: number;
      duurMs: number;
    }
  | {
      resultaat: "niet_gewijzigd";
      httpStatus: number;
      duurMs: number;
    }
  | {
      resultaat: "overgeslagen";
      reden: string;
    }
  | {
      resultaat: "fout";
      httpStatus: number | null;
      foutSoort: string;
      foutBericht: string;
      herhaalbaar: boolean;
      duurMs: number;
    };

/**
 * Controleert of een bronomschrijving intern consistent is. Draait in
 * de poort en in de tests, zodat een nieuwe bron niet per ongeluk
 * actief kan staan zonder gemeten toestemming.
 */
export function controleerBron(b: Bron): string[] {
  const fouten: string[] = [];

  if (!/^[a-z0-9-]+$/.test(b.sleutel)) {
    fouten.push(`${b.sleutel}: sleutel mag alleen kleine letters, cijfers en streepjes bevatten`);
  }
  if (b.actief && b.robotsStatus !== "toegestaan") {
    fouten.push(`${b.sleutel}: actief met robots_status=${b.robotsStatus}`);
  }
  if (b.actief && b.tdmStatus !== "geen_voorbehoud") {
    fouten.push(`${b.sleutel}: actief met tdm_status=${b.tdmStatus}`);
  }
  if (!b.actief && !b.inactiefReden) {
    fouten.push(`${b.sleutel}: inactief zonder reden`);
  }
  if (b.actief && b.verificatie.status !== "geverifieerd") {
    fouten.push(
      `${b.sleutel}: actief terwijl het endpoint niet geverifieerd is (${b.verificatie.status})`,
    );
  }
  if (b.verificatie.status === "geverifieerd" && !b.verificatie.op) {
    fouten.push(`${b.sleutel}: geverifieerd zonder datum`);
  }
  if (b.verificatie.status === "geverifieerd" && b.verificatie.bewijs.length < 20) {
    fouten.push(`${b.sleutel}: geverifieerd zonder bruikbaar bewijs`);
  }
  if (b.magCiteren && b.citaatLimietTekens <= 0) {
    fouten.push(`${b.sleutel}: mag citeren maar citaatlimiet is 0`);
  }
  if (!b.magCiteren && b.citaatLimietTekens > 0) {
    fouten.push(`${b.sleutel}: citaatlimiet gezet terwijl citeren niet mag`);
  }
  if (b.onderwerpen.length === 0) {
    fouten.push(`${b.sleutel}: geen onderwerpen`);
  }
  if (b.ophaalintervalMinuten < 5) {
    fouten.push(`${b.sleutel}: ophaalinterval onder vijf minuten is onnodig belastend`);
  }

  // De endpointhost moet zelf in de allowlist staan, anders weigert de
  // eerste ophaling meteen zijn eigen URL.
  try {
    const host = new URL(b.endpointUrl).host;
    if (!b.toegestaneHosts.includes(host)) {
      fouten.push(`${b.sleutel}: endpointhost ${host} staat niet in toegestaneHosts`);
    }
  } catch {
    fouten.push(`${b.sleutel}: endpointUrl is geen geldige URL`);
  }

  return fouten;
}
