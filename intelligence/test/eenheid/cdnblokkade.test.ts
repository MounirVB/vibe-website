/* ============================================================
   EENHEID — de keten van een CDN-blokkade
   ------------------------------------------------------------
   WAAROM DIT BESTAND BESTAAT.

   De vier-wegclassificatie van een 403 (migratie 0037) is alleen iets
   waard als het BEWIJS de classificatie bereikt. Dat bewijs reist door
   drie lagen:

     bronnen/http.ts        leest server, cf-ray, www-authenticate en de
                            titel uit het antwoord
     bronnen/haal.ts        geeft ze door in BronUitkomst
     pijplijn/verzamelen.ts geeft ze door aan classificeerStoring

   Valt één van die drie regels weg, dan komt elke 403 als
   TOEGANG_ONBEKEND uit en is de hele classificatie dode code — zonder
   dat één bestaande toets omvalt. Dat is precies het soort stille
   regressie waar dit bestand voor staat.

   WAAROM GEEN ECHTE TESTSERVER, EN WAAROM DAT GOED IS

   De eerste opzet startte een http-server op 127.0.0.1 en haalde die op
   via `haalOp`. Dat faalde, en terecht: `schemaEnDoelToegestaan()` is de
   SSRF-poortwachter en staat uitsluitend https toe, dus een
   http-testserver wordt geweigerd met `doel_geweigerd` — waarna de
   classificatie TOEGANG_BEPERKT geeft in plaats van CDN_BLOKKADE. Die
   regel verzwakken om een toets te laten slagen zou de poort opofferen
   voor de meting ervan.

   Daarom hier de twee helften los, elk op ECHTE objecten:

     1. `leesAanwijzingen()` op een echt `Response`-object met echte
        headers. Geen nagebouwde stub die per ongeluk klopt.
     2. een STRUCTURELE grendel op de drie doorgeefregels, want dat is
        precies de regressie die geen gedragstoets zou vangen.

   Het gedrag van de classificatie zelf staat in storingssoort.test.ts.
   ============================================================ */

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { leesAanwijzingen } from "../../src/bronnen/http.ts";
import { classificeerStoring } from "../../src/bronnen/storingssoort.ts";

/** Een echt Response-object, zoals fetch het zou teruggeven. */
function antwoord(status: number, headers: Record<string, string>, body: string): Response {
  return new Response(body, { status, headers });
}

const CLOUDFLARE_PAGINA =
  "<html><head><title>Attention Required! | Cloudflare</title></head><body>blocked</body></html>";

describe("leesAanwijzingen leest ALLEEN wat er staat", () => {
  it("haalt server, CDN-header en titel uit een Cloudflare-blokkade", () => {
    /* Het gemeten productieantwoord van rendogroep.nl vanaf Railway. */
    const a = leesAanwijzingen(
      antwoord(403, { server: "cloudflare", "cf-ray": "a4a2928eaf42150f-PDX" }, CLOUDFLARE_PAGINA),
      CLOUDFLARE_PAGINA,
    );
    assert.equal(a.server, "cloudflare");
    assert.deepEqual([...a.cdnHeaders], ["cf-ray"]);
    assert.equal(a.titel, "Attention Required! | Cloudflare");
    assert.equal(a.wwwAuthenticate, null);
  });

  it("normaliseert de server-header naar kleine letters", () => {
    const a = leesAanwijzingen(antwoord(403, { server: "CloudFlare" }, ""), null);
    assert.equal(a.server, "cloudflare");
  });

  it("ziet een authenticatie-eis", () => {
    const a = leesAanwijzingen(antwoord(403, { "www-authenticate": 'Basic realm="api"' }, ""), null);
    assert.equal(a.wwwAuthenticate, 'Basic realm="api"');
    assert.deepEqual([...a.cdnHeaders], []);
  });

  it("verzint NIETS bij een kaal antwoord van een gewone webserver", () => {
    const a = leesAanwijzingen(antwoord(403, { server: "nginx" }, "Forbidden"), "Forbidden");
    assert.equal(a.server, "nginx");
    assert.deepEqual([...a.cdnHeaders], []);
    assert.equal(a.titel, null, "geen <title> betekent geen titel, niet een verzonnen titel");
    assert.equal(a.wwwAuthenticate, null);
  });

  it("telt `via` en `x-cache` NIET als CDN-bewijs", () => {
    /* Die zetten ook gewone caches en proxies. Zouden ze meetellen, dan
       werd elke gecachete 403 een 'CDN-blokkade'. */
    const a = leesAanwijzingen(antwoord(403, { via: "1.1 varnish", "x-cache": "MISS" }, ""), null);
    assert.deepEqual([...a.cdnHeaders], []);
  });

  it("begrenst de titel en haalt witruimte eruit", () => {
    const lang = `<title>${"a".repeat(300)}</title>`;
    const a = leesAanwijzingen(antwoord(403, {}, lang), lang);
    assert.ok((a.titel ?? "").length <= 120, "een titel mag het detailveld niet opblazen");
    const rommelig = "<title>  Attention\n   Required!  </title>";
    assert.equal(leesAanwijzingen(antwoord(403, {}, rommelig), rommelig).titel, "Attention Required!");
  });
});

describe("de aanwijzingen bereiken de classificatie", () => {
  it("wat leesAanwijzingen oplevert, classificeert als CDN_BLOKKADE", () => {
    /* De twee helften aan elkaar: het echte Response-object gaat door de
       echte lezer en daarna door de echte classificatie. */
    const a = leesAanwijzingen(
      antwoord(403, { server: "cloudflare", "cf-ray": "x-PDX" }, CLOUDFLARE_PAGINA),
      CLOUDFLARE_PAGINA,
    );
    const r = classificeerStoring({
      resultaat: "fout",
      httpStatus: 403,
      foutSoort: "http",
      herhaalbaar: false,
      aantalItems: 0,
      robotsStatus: "toegestaan",
      tdmStatus: "geen_voorbehoud",
      overgeslagenReden: null,
      aanwijzingen: a,
    });
    assert.equal(r.soort, "CDN_BLOKKADE");
    assert.match(r.detail, /server=cloudflare/);
    assert.match(r.detail, /cdn=cf-ray/);
  });

  it("DE DRIE DOORGEEFREGELS STAAN ER NOG", () => {
    /* De regressie die geen gedragstoets vangt: één `aanwijzingen:`-regel
       weghalen maakt de hele classificatie dode code, terwijl alle
       andere toetsen groen blijven omdat ze de classificatie direct
       aanroepen. Daarom een grendel op de BRON. */
    const lees = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

    assert.match(
      lees("../../src/bronnen/http.ts"),
      /aanwijzingen: leesAanwijzingen\(/,
      "bronnen/http.ts geeft de aanwijzingen niet meer mee bij een HTTP-fout",
    );
    assert.match(
      lees("../../src/bronnen/haal.ts"),
      /aanwijzingen: uitkomst\.aanwijzingen/,
      "bronnen/haal.ts geeft de aanwijzingen niet door in BronUitkomst",
    );
    assert.match(
      lees("../../src/pijplijn/verzamelen.ts"),
      /aanwijzingen: uitkomst\.resultaat === "fout"/,
      "pijplijn/verzamelen.ts geeft de aanwijzingen niet door aan classificeerStoring",
    );
  });

  it("de SSRF-poort staat nog op https-only — die is hier niet voor opgeofferd", () => {
    /* Deze toets staat hier omdat de eerste opzet van dit bestand hem
       bijna had verzwakt: een http-testserver vroeg om een uitzondering.
       Die is er niet gekomen. */
    assert.match(
      readFileSync(new URL("../../src/bronnen/http.ts", import.meta.url), "utf8"),
      /u\.protocol !== "https:"/,
      "de https-eis in schemaEnDoelToegestaan is weg",
    );
  });
});
