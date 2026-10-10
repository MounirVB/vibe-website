/* ============================================================
   GEO — referentiegeografie synchroniseren
   ------------------------------------------------------------
   Vult intel.geo_bereiken uit officiele bronnen: provincies en
   gemeenten uit PDOK (CC BY 4.0, machinaleesbaar verklaard in de API
   zelf) en netbeheergebieden uit Mijn Aansluiting (publiek domein).

   Twee dingen die hier bewust NIET gebeuren:

   1. Geen geometrie opslaan. Het platform doet geen ruimtelijke
      insluiting, want "deze gemeente overlapt het gebied van deze
      netbeheerder" is geen bewijs dat een netbeperking voor die
      gemeente geldt. Alleen codes, namen en de hierarchie.
   2. Geen koppeling gemeente -> netbeheerder afleiden. Die relatie
      bestaat wel, maar niet als bewijs; ze zou de grondslagladder
      stilletjes op 'afgeleid' zetten terwijl het als feit leest.

   Deze synchronisatie schrijft referentiedata en loopt daarom onder de
   onderhoudsrol, niet onder de applicatierol. De applicatierol mag
   intel.geo_bereiken alleen lezen; dat is wat voorkomt dat één tenant
   de geografie van een andere kan vervuilen.
   ============================================================ */

import type pg from "pg";
import { configLezen } from "../kern/config.ts";
import { maakPool, zonderOrganisatie } from "../kern/db.ts";
import { IntelFout } from "../kern/fouten.ts";
import { maakLogger } from "../kern/log.ts";
import { haalOp } from "../bronnen/http.ts";

const log = maakLogger("geo");

const PDOK_HOSTS = ["api.pdok.nl"] as const;
const PDOK_BASIS = "https://api.pdok.nl/kadaster/brk-bestuurlijke-gebieden/ogc/v1/collections";
const MIJNAANSLUITING_HOSTS = ["public.geodata.mijnaansluiting.nl"] as const;
const MIJNAANSLUITING_WFS =
  "https://public.geodata.mijnaansluiting.nl/geoserver/mijnaansluiting_open/wfs" +
  "?service=WFS&version=2.0.0&request=GetFeature" +
  "&typeNames=mijnaansluiting_open:netbeheergebieden_elektriciteit&outputFormat=application/json";

type Kenmerken = Record<string, unknown>;

function tekstVan(k: Kenmerken, ...namen: string[]): string | null {
  for (const n of namen) {
    const w = k[n];
    if (typeof w === "string" && w.trim()) return w.trim();
    if (typeof w === "number") return String(w);
  }
  return null;
}

async function haalFeatures(
  url: string,
  hosts: readonly string[],
  maxBytes: number,
): Promise<Kenmerken[]> {
  const uitkomst = await haalOp({
    url,
    toegestaneHosts: hosts,
    maxBytes,
    minIntervalSeconden: 2,
    accept: "application/geo+json, application/json;q=0.9",
  });
  if (uitkomst.soort !== "ok") {
    throw new IntelFout(
      "netwerk",
      `geo-ophaling mislukt voor ${url}: ${
        uitkomst.soort === "fout" ? `${uitkomst.foutSoort} ${uitkomst.bericht}` : uitkomst.soort
      }`,
    );
  }
  const ontleed = JSON.parse(uitkomst.body) as { features?: unknown };
  if (!Array.isArray(ontleed.features)) {
    throw new IntelFout("bron_parse", `geen features in de respons van ${url}`);
  }
  return ontleed.features
    .map((f) => (f as { properties?: Kenmerken }).properties)
    .filter((p): p is Kenmerken => p !== undefined && p !== null);
}

async function schrijfBereik(
  c: pg.PoolClient,
  rij: {
    soort: string;
    code: string;
    naam: string;
    ouderId: number | null;
    netbeheerder: string | null;
    bronSleutel: string;
    bronUrl: string;
  },
): Promise<number> {
  const r = await c.query<{ id: number }>(
    `insert into intel.geo_bereiken
       (soort, code, naam, ouder_id, netbeheerder, bron_sleutel, bron_url, opgehaald_op)
     values ($1, $2, $3, $4, $5, $6, $7, now())
     on conflict (soort, code) do update set
       naam         = excluded.naam,
       ouder_id     = coalesce(excluded.ouder_id, intel.geo_bereiken.ouder_id),
       netbeheerder = coalesce(excluded.netbeheerder, intel.geo_bereiken.netbeheerder),
       bron_sleutel = excluded.bron_sleutel,
       bron_url     = excluded.bron_url,
       opgehaald_op = now()
     returning id`,
    [
      rij.soort,
      rij.code,
      rij.naam,
      rij.ouderId,
      rij.netbeheerder,
      rij.bronSleutel,
      rij.bronUrl,
    ],
  );
  const id = r.rows[0]?.id;
  if (id === undefined) throw new IntelFout("database", `geo_bereik ${rij.soort}/${rij.code} niet geschreven`);
  return id;
}

export type GeoRapport = {
  readonly provincies: number;
  readonly gemeenten: number;
  readonly netbeheergebieden: number;
  readonly gemeentenZonderProvincie: readonly string[];
};

export async function syncGeo(): Promise<GeoRapport> {
  const config = configLezen();
  // Onderhoudsrol: alleen deze rol mag in de referentiegeografie schrijven.
  const pool = maakPool({ rol: config.onderhoudRol });

  return zonderOrganisatie(pool, async (c) => {
    const landRij = await c.query<{ id: number }>(
      "select id from intel.geo_bereiken where soort = 'land' and code = 'NL'",
    );
    const landId = landRij.rows[0]?.id ?? null;

    // 1. Provincies
    const provincieUrl = `${PDOK_BASIS}/provinciegebied/items?f=json&limit=100`;
    const provincieFeatures = await haalFeatures(provincieUrl, PDOK_HOSTS, 52_428_800);
    const provincieIdPerCode = new Map<string, number>();
    for (const p of provincieFeatures) {
      const code = tekstVan(p, "code");
      const naam = tekstVan(p, "naam");
      if (!code || !naam) continue;
      const id = await schrijfBereik(c, {
        soort: "provincie",
        code,
        naam,
        ouderId: landId,
        netbeheerder: null,
        bronSleutel: "pdok:brk-bestuurlijke-gebieden/provinciegebied",
        bronUrl: provincieUrl,
      });
      provincieIdPerCode.set(code, id);
    }

    // 2. Gemeenten. De provinciecode staat in de feature zelf, dus de
    //    hierarchie komt uit de bron en niet uit een gevolgtrekking.
    const gemeenteUrl = `${PDOK_BASIS}/gemeentegebied/items?f=json&limit=1000`;
    const gemeenteFeatures = await haalFeatures(gemeenteUrl, PDOK_HOSTS, 104_857_600);
    let gemeenten = 0;
    const zonderProvincie: string[] = [];
    for (const g of gemeenteFeatures) {
      const code = tekstVan(g, "code");
      const naam = tekstVan(g, "naam");
      if (!code || !naam) continue;
      const provincieCode = tekstVan(g, "ligt_in_provincie_code", "ligtInProvincieCode");
      const ouderId = provincieCode ? provincieIdPerCode.get(provincieCode) ?? null : null;
      if (!ouderId) zonderProvincie.push(`${code} ${naam}`);
      await schrijfBereik(c, {
        soort: "gemeente",
        code,
        naam,
        ouderId,
        netbeheerder: null,
        bronSleutel: "pdok:brk-bestuurlijke-gebieden/gemeentegebied",
        bronUrl: gemeenteUrl,
      });
      gemeenten += 1;
    }

    // 3. Netbeheergebieden elektriciteit
    const netFeatures = await haalFeatures(MIJNAANSLUITING_WFS, MIJNAANSLUITING_HOSTS, 20_971_520);
    let netbeheergebieden = 0;
    for (const n of netFeatures) {
      const code = tekstVan(n, "netbeheerderCode", "netbeheerdercode");
      const naam = tekstVan(n, "netbeheerderName", "netbeheerdername", "netbeheerderLabel");
      if (!code || !naam) continue;
      await schrijfBereik(c, {
        soort: "netbeheerdergebied",
        code,
        naam,
        ouderId: landId,
        netbeheerder: naam,
        bronSleutel: "mijnaansluiting:netbeheergebieden_elektriciteit",
        bronUrl: MIJNAANSLUITING_WFS,
      });
      netbeheergebieden += 1;
    }

    log.info("geografie gesynchroniseerd", {
      provincies: provincieIdPerCode.size,
      gemeenten,
      netbeheergebieden,
    });

    return {
      provincies: provincieIdPerCode.size,
      gemeenten,
      netbeheergebieden,
      gemeentenZonderProvincie: zonderProvincie,
    };
  });
}
