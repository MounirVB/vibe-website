/* ============================================================
   PUBLICATIE — staat het er werkelijk?
   ------------------------------------------------------------
   EEN GESLAAGDE PR IS GEEN PUBLICATIE, en dat was in de boekhouding niet
   te zien. publiceer() zet `inhoud_versies.status` op 'gepubliceerd'
   zodra het registerrecord in de werkboom staat — vóór de generator,
   vóór de merge en vóór de deploy. Daarna gebeurden er nog drie dingen
   waarvan NIETS werd vastgelegd:

     de PR is gemerged        (een git-feit)
     de website is uitgerold  (een deployfeit)
     de URL doet het          (een HTTP-feit)

   Deze module meet die drie en legt ze vast als één nieuwe fase,
   LIVE_GEVERIFIEERD, in dezelfde append-only tabel. Hij schrijft NIETS
   als een van de drie niet klopt: dan is er niets live en hoort er ook
   niets te staan.

   WAT HIJ NIET DOET. Hij publiceert niet, hij merget niet en hij
   deployt niet. Het is een meting met een auditregel, en daarom de enige
   stap in de keten die veilig tegen productie te draaien is.

   DRIE DINGEN ZIJN INJECTEERBAAR — git, HTTP en de klok ontbreken in een
   toets. `git` en `haal` kunnen worden meegegeven zodat de toetsen de
   hele weg kunnen naspelen zonder netwerk en zonder echte remote; dat is
   dezelfde opzet als in pr.ts.
   ============================================================ */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type pg from "pg";
import { configLezen } from "../kern/config.ts";
import { eenRij, rijen } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import {
  actorBeschrijving,
  legPublicatieAuditVast,
  legPublicatiebesluitVast,
  type Actor,
} from "../inhoud/actor.ts";
import { maakGit, type GitUitvoerder } from "./pr.ts";

const uitvoeren = promisify(execFile);
const log = maakLogger("publicatie-verificatie");

export type Antwoord = { readonly status: number; readonly tekst: string };
export type Haler = (url: string) => Promise<Antwoord>;

export type VerificatieGrendel = { naam: string; ok: boolean; meting: string };

export type VerificatieUitkomst = {
  readonly geslaagd: boolean;
  readonly inhoudVersieId: number;
  readonly url: string | null;
  readonly commit: string | null;
  readonly gemergedInMain: boolean;
  readonly httpStatus: number | null;
  readonly grendels: readonly VerificatieGrendel[];
  readonly reden: string;
};

/** De standaardhaler: gewone HTTP, alleen GET, met een tijdslimiet. */
export function standaardHaler(timeoutMs = 20_000): Haler {
  return async (url) => {
    const r = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return { status: r.status, tekst: r.status === 200 ? await r.text() : "" };
  };
}

/**
 * Staat de URL van deze inhoudsversie werkelijk live, met de juiste
 * canonical, en zit de publicatiecommit in main?
 *
 * Schrijft alleen bij volledig succes een regel; bij elke andere uitkomst
 * blijft het logboek ongemoeid en komt het antwoord terug als grendeltabel.
 */
export async function verifieerLivePublicatie(
  c: pg.PoolClient,
  organisatieId: number,
  inhoudVersieId: number,
  opties: {
    readonly actor: Actor;
    readonly siteWortel?: string;
    readonly basisBranch?: string;
    readonly git?: GitUitvoerder;
    readonly haal?: Haler;
  },
): Promise<VerificatieUitkomst> {
  const config = configLezen();
  const siteWortel = opties.siteWortel ?? config.siteWortel;
  const git = opties.git ?? maakGit(siteWortel);
  const haal = opties.haal ?? standaardHaler();
  const basis = opties.basisBranch ?? "origin/main";

  const grendels: VerificatieGrendel[] = [];
  const voeg = (naam: string, ok: boolean, meting: string) => {
    grendels.push({ naam, ok, meting });
    return ok;
  };
  const af = (reden: string, extra: Partial<VerificatieUitkomst> = {}): VerificatieUitkomst => {
    log.waarschuwing("live-verificatie niet geslaagd", { versie: inhoudVersieId, reden });
    return {
      geslaagd: false,
      inhoudVersieId,
      url: null,
      commit: null,
      gemergedInMain: false,
      httpStatus: null,
      grendels,
      reden,
      ...extra,
    };
  };

  /* ---------------- 1. is er iets om te verifiëren ---------------- */
  const v = await eenRij<{
    id: number;
    pad: string;
    titel: string;
    canonieke_url: string;
    status: string;
    inhoud_afdruk: string | null;
  }>(
    c,
    `select id, pad, titel, canonieke_url, status, inhoud_afdruk
       from intel.inhoud_versies
      where organisatie_id = $1 and id = $2`,
    [organisatieId, inhoudVersieId],
  );
  if (!v) return af(`inhoudsversie ${inhoudVersieId} bestaat niet in organisatie ${organisatieId}`);

  if (
    !voeg(
      "er is een publicatierecord geschreven",
      v.status === "gepubliceerd",
      `status is '${v.status}'`,
    )
  ) {
    return af(
      `status is '${v.status}'; er is nog geen publicatierecord, dus er valt niets live te ` +
        "verifiëren. Draai eerst npm run publiceer -- --versie <id> --pr",
    );
  }

  /* ---------------- 2. welke commit hoort hierbij ---------------- */
  const prRegels = await rijen<{ poortresultaten: { fase?: string; commit?: string; branch?: string; prUrl?: string | null } }>(
    c,
    `select poortresultaten
       from intel.publicatiebesluiten
      where organisatie_id = $1 and inhoud_versie_id = $2
      order by id desc`,
    [organisatieId, inhoudVersieId],
  );
  const pr = prRegels.map((r) => r.poortresultaten).find((p) => p?.fase === "PR_AANGEMAAKT");
  const commit = pr?.commit ?? null;
  if (!voeg("er is een publicatiecommit vastgelegd", commit !== null, commit ?? "geen PR-regel in het logboek")) {
    return af(
      "er staat geen regel met fase PR_AANGEMAAKT in het publicatielogboek; zonder commit is " +
        "niet vast te stellen of deze publicatie in main zit",
    );
  }

  /* ---------------- 3. zit die commit in main ---------------- */
  let gemerged = false;
  try {
    await git(["merge-base", "--is-ancestor", commit!, basis]);
    gemerged = true;
  } catch {
    gemerged = false;
  }
  if (
    !voeg(
      `de publicatiecommit zit in ${basis}`,
      gemerged,
      gemerged ? `${commit!.slice(0, 12)} is voorouder van ${basis}` : `${commit!.slice(0, 12)} zit NIET in ${basis}`,
    )
  ) {
    return af(
      `de pull request is niet gemerged: commit ${commit!.slice(0, 12)} zit niet in ${basis}. ` +
        "Een geopende PR is geen publicatie.",
      { commit },
    );
  }

  /* ---------------- 4. doet de publieke URL het ---------------- */
  const antwoord = await haal(v.canonieke_url).catch((e: unknown) => ({
    status: 0,
    tekst: `FOUT ${(e as Error).message}`,
  }));
  if (
    !voeg("de publieke URL geeft HTTP 200", antwoord.status === 200, `HTTP ${antwoord.status} op ${v.canonieke_url}`)
  ) {
    return af(
      `${v.canonieke_url} geeft HTTP ${antwoord.status}; de website is nog niet uitgerold of de ` +
        "generator heeft de pagina niet gemaakt",
      { commit, gemergedInMain: true, httpStatus: antwoord.status, url: v.canonieke_url },
    );
  }

  /* ---------------- 5. is het ONZE pagina ---------------- */
  const canonical = /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i.exec(antwoord.tekst)?.[1] ?? null;
  if (
    !voeg(
      "de canonical op de pagina wijst naar zichzelf",
      canonical === v.canonieke_url,
      canonical === null ? "geen canonical gevonden" : canonical,
    )
  ) {
    return af(
      `de pagina op ${v.canonieke_url} draagt canonical '${canonical ?? "GEEN"}'; dat is niet ` +
        "dezelfde URL en dus niet deze publicatie",
      { commit, gemergedInMain: true, httpStatus: 200, url: v.canonieke_url },
    );
  }

  /* De h1 van het bericht komt uit de titel; de generator kort hem in op
     het merksuffix. Daarom op het eerste deel toetsen en niet op de hele
     SEO-titel. */
  const kop = v.titel.split("|")[0]!.trim();
  voeg(
    "de kop van het bericht staat op de pagina",
    antwoord.tekst.includes(kop),
    kop.slice(0, 60),
  );

  /* ---------------- 6. staat hij in de sitemap ---------------- */
  const inSitemap = await staatInSitemap(config.siteBasisUrl, v.canonieke_url, haal);
  voeg("de URL staat in de sitemap", inSitemap.gevonden, inSitemap.meting);

  /* ---------------- 7. vastleggen, en alleen nu ---------------- */
  await legPublicatiebesluitVast(c, {
    organisatieId,
    inhoudVersieId: v.id,
    besluit: "gepubliceerd",
    fase: "LIVE_GEVERIFIEERD",
    actor: opties.actor,
    motivatie: `live geverifieerd op ${v.canonieke_url} (HTTP 200, canonical sluit, commit ${commit!.slice(0, 12)} in ${basis})`,
    meting: {
      url: v.canonieke_url,
      httpStatus: 200,
      commit,
      gemergedInMain: true,
      canonical,
      inSitemap: inSitemap.gevonden,
      inhoudAfdruk: v.inhoud_afdruk,
    },
  });
  await legPublicatieAuditVast(c, {
    organisatieId,
    actor: opties.actor,
    handeling: "publicatie_live_geverifieerd",
    objectId: v.id,
    naWaarde: { url: v.canonieke_url, httpStatus: 200, commit, inSitemap: inSitemap.gevonden },
    motivatie: "publieke URL gecontroleerd na de merge en de deploy",
  });

  /* DE METING GAAT NAAR intel.indexatie_status, NIET NAAR pagina_register.
     Dat is geen smaakkwestie: migratie 0034 heeft de twee live-kolommen
     van pagina_register met opzet GEDROPT en schrijft er drie redenen
     bij — lees ze daar, hun namen staan hier bewust niet, want een
     invariant in test/eenheid/indexatiemonitor.test.ts houdt bij dat
     niemand buiten die twee migraties en de migratiepoort ze noemt. De
     zwaarste reden: pagina_register draagt een BEFORE UPDATE-trigger
     (pagina_register_bijgewerkt → zet_bijgewerkt_op), dus elke
     live-meting zou `bijgewerkt_op` opstampen — en daarmee verdwijnt het
     verschil tussen "de pagina is gewijzigd" en "de pagina is gemeten",
     precies het onderscheid waarop de goedkeuringsbinding van 0033 rust.

     intel.indexatie_status bestaat hier wél voor: url, http_status,
     in_sitemap, bron EN bewijs, met een unieke sleutel op
     (organisatie, url, bron). Een tweede verificatie werkt dus dezelfde
     rij bij in plaats van er een naast te zetten. Bron 'eigen_meting',
     want dat is precies wat dit is. */
  await c.query(
    `insert into intel.indexatie_status
       (organisatie_id, pagina_id, url, in_sitemap, geindexeerd, bron, http_status,
        laatst_gecontroleerd_op, bewijs)
     values ($1,
             (select id from intel.pagina_register
               where organisatie_id = $1 and pad = $2),
             $3, $4, 'onbekend', 'eigen_meting', 200, now(), $5)
     on conflict (organisatie_id, url, bron) do update set
       in_sitemap  = excluded.in_sitemap,
       http_status = excluded.http_status,
       laatst_gecontroleerd_op = now(),
       bewijs      = excluded.bewijs,
       pagina_id   = coalesce(excluded.pagina_id, intel.indexatie_status.pagina_id)`,
    [
      organisatieId,
      v.pad,
      v.canonieke_url,
      inSitemap.gevonden,
      `live-verificatie na publicatie: HTTP 200, canonical sluit, commit ${commit!.slice(0, 12)} in ${basis}, ${inSitemap.meting}`,
    ],
  );

  log.info("live geverifieerd", {
    versie: v.id,
    url: v.canonieke_url,
    commit,
    door: actorBeschrijving(opties.actor),
  });

  return {
    geslaagd: true,
    inhoudVersieId: v.id,
    url: v.canonieke_url,
    commit,
    gemergedInMain: true,
    httpStatus: 200,
    grendels,
    reden: `${v.canonieke_url} staat live en is vastgelegd als LIVE_GEVERIFIEERD`,
  };
}

/**
 * Staat deze URL in de sitemap?
 *
 * De sitemap van deze site is een INDEX met kindsitemaps (gemeten:
 * sitemap-nationaal.xml en sitemap-regios.xml). Daarom eerst de index
 * lezen en dan de kinderen, zonder de kindnamen hard te coderen.
 */
async function staatInSitemap(
  basisUrl: string,
  url: string,
  haal: Haler,
): Promise<{ gevonden: boolean; meting: string }> {
  const wortel = `${basisUrl.replace(/\/+$/, "")}/sitemap.xml`;
  const index = await haal(wortel).catch(() => ({ status: 0, tekst: "" }));
  if (index.status !== 200) return { gevonden: false, meting: `sitemap.xml geeft HTTP ${index.status}` };
  if (index.tekst.includes(url)) return { gevonden: true, meting: "rechtstreeks in sitemap.xml" };

  const kinderen = [...index.tekst.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
  if (!/sitemapindex/i.test(index.tekst) || kinderen.length === 0) {
    return { gevonden: false, meting: "niet in sitemap.xml en geen index" };
  }
  for (const kind of kinderen) {
    const k = await haal(kind).catch(() => ({ status: 0, tekst: "" }));
    if (k.status === 200 && k.tekst.includes(url)) {
      return { gevonden: true, meting: `in ${kind.split("/").pop()}` };
    }
  }
  return { gevonden: false, meting: `niet gevonden in ${kinderen.length} kindsitemap(s)` };
}
