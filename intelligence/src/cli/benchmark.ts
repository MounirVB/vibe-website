/* ============================================================
   CLI — prestatiemeting
   ------------------------------------------------------------
     npm run benchmark

   Meet wat §16 vraagt, en meet het ECHT in plaats van het te
   schatten. Elke regel in de uitvoer komt uit een uitgevoerde
   handeling op deze machine.

   WAT DEZE CIJFERS WEL EN NIET ZEGGEN
   Ze zijn gemeten op macOS met een lokale Postgres 17 en een database
   van 2.103 documenten. Ze zeggen dus iets over de VORM van de
   werklast — waar de tijd zit, wat IO-gebonden is, wat lineair
   groeit — en niets over de absolute snelheid van een productiehost.

   Dat onderscheid staat ook in de uitvoer, want een benchmark zonder
   die kwalificatie wordt binnen een week geciteerd als een
   productiebelofte.
   ============================================================ */

import { execFileSync } from "node:child_process";
import { laadEnvBestand, configLezen } from "../kern/config.ts";
import { eenRij, maakPool, metOrganisatie, rijen, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import { maakApp } from "../dashboard/server.ts";

laadEnvBestand();
const config = configLezen();

type Meting = {
  groep: string;
  naam: string;
  waarde: string;
  opmerking?: string;
};

const metingen: Meting[] = [];
const meet = (groep: string, naam: string, waarde: string, opmerking?: string) =>
  metingen.push({ groep, naam, waarde, opmerking });

/** Mediaan in plaats van gemiddelde: één uitschieter vertekent een gemiddelde. */
function mediaan(ms: number[]): number {
  const s = [...ms].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function p95(ms: number[]): number {
  const s = [...ms].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * 0.95))]!;
}

const geheugenStart = process.memoryUsage().rss;
const pool = maakPool();

try {
  const organisatieId = await huidigeOrganisatie(pool);

  /* ---------------- databasequeries ---------------- */
  const queries: { naam: string; sql: string }[] = [
    { naam: "select 1", sql: "select 1" },
    {
      naam: "bronstatus (21 bronnen)",
      sql: "select sleutel, gezondheid, laatst_opgehaald_op from intel.bronnen where organisatie_id = $1",
    },
    {
      naam: "radar: gebeurtenissen met materialiteit",
      sql: `select g.id, g.titel, g.materialiteit from intel.markt_gebeurtenissen g
             where g.organisatie_id = $1 order by g.materialiteit desc limit 50`,
    },
    {
      naam: "kandidaten met hun cluster",
      sql: `select k.id, k.besluit, oc.sleutel from intel.inhoud_kandidaten k
             left join intel.onderwerp_clusters oc on oc.id = k.onderwerp_cluster_id
             where k.organisatie_id = $1 limit 200`,
    },
    {
      naam: "regio-impacts met gebied en gebeurtenis",
      sql: `select ri.id, gb.naam, g.titel from intel.regio_impacts ri
             join intel.geo_bereiken gb on gb.id = ri.geo_bereik_id
             join intel.markt_gebeurtenissen g on g.id = ri.gebeurtenis_id
             where ri.organisatie_id = $1`,
    },
    {
      naam: "volledige tekstzoekactie over 2.103 versies",
      sql: `select bv.id from intel.brondocument_versies bv
             where bv.organisatie_id = $1
               and bv.zoekvector @@ plainto_tsquery('dutch', 'netcongestie') limit 50`,
    },
  ];

  for (const q of queries) {
    const tijden: number[] = [];
    for (let i = 0; i < 20; i += 1) {
      const t0 = performance.now();
      await metOrganisatie(pool, { organisatieId }, (c) =>
        c.query(q.sql, q.sql.includes("$1") ? [organisatieId] : []),
      );
      tijden.push(performance.now() - t0);
    }
    meet(
      "database",
      q.naam,
      `mediaan ${mediaan(tijden).toFixed(1)} ms, p95 ${p95(tijden).toFixed(1)} ms`,
      "20 herhalingen, inclusief het zetten van app.organisatie_id per transactie",
    );
  }

  /* ---------------- dashboard ---------------- */
  {
    const t0 = performance.now();
    const app = maakApp(pool);
    const server = app.listen(0, "127.0.0.1");
    await new Promise((r) => server.once("listening", r));
    const opstart = performance.now() - t0;
    const poort = (server.address() as { port: number }).port;
    const basis = `http://127.0.0.1:${poort}`;

    meet("api", "opstarttijd tot luisterend", `${opstart.toFixed(0)} ms`, "zonder databaseverbinding opwarmen");

    try {
      /* Inloggen zoals een browser, inclusief CSRF. */
      const f = await fetch(`${basis}/inloggen`);
      const csrfKoekje = /vibe_intel_csrf=[^;]+/.exec(f.headers.get("set-cookie") ?? "")?.[0];
      const token = /name="_csrf" value="([^"]+)"/.exec(await f.text())?.[1];
      let sessie: string | null = null;
      if (csrfKoekje && token) {
        const r = await fetch(`${basis}/inloggen`, {
          method: "POST",
          redirect: "manual",
          headers: { "content-type": "application/x-www-form-urlencoded", cookie: csrfKoekje },
          body: new URLSearchParams({
            email: "beheer@vibeenergy.nl",
            wachtwoord: "e2e-beheer-wachtwoord-2026",
            _csrf: token,
          }).toString(),
        });
        sessie = /intel_sessie=[^;]+/.exec(r.headers.get("set-cookie") ?? "")?.[0] ?? null;
      }

      for (const pad of ["/gezond", "/gereed"]) {
        const tijden: number[] = [];
        for (let i = 0; i < 20; i += 1) {
          const t = performance.now();
          await fetch(`${basis}${pad}`);
          tijden.push(performance.now() - t);
        }
        meet("api", `${pad}`, `mediaan ${mediaan(tijden).toFixed(1)} ms, p95 ${p95(tijden).toFixed(1)} ms`);
      }

      if (sessie) {
        for (const pad of ["/", "/radar", "/studio", "/regio", "/signalen", "/prestaties", "/instellingen"]) {
          const tijden: number[] = [];
          for (let i = 0; i < 10; i += 1) {
            const t = performance.now();
            const r = await fetch(`${basis}${pad}`, { headers: { cookie: sessie } });
            await r.text();
            tijden.push(performance.now() - t);
          }
          meet(
            "dashboard",
            pad,
            `mediaan ${mediaan(tijden).toFixed(0)} ms, p95 ${p95(tijden).toFixed(0)} ms`,
            "10 herhalingen, volledige HTML inclusief alle queries",
          );
        }
      } else {
        meet("dashboard", "weergaven", "NIET GEMETEN", "inloggen mislukte; wachtwoord niet gezet");
      }

      /* De inlogbegrenzer meten: hoeveel kost een afgewezen poging? */
      const afgewezen: number[] = [];
      for (let i = 0; i < 10; i += 1) {
        const t = performance.now();
        await fetch(`${basis}/inloggen`, {
          method: "POST",
          redirect: "manual",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: "email=x@y.nl&wachtwoord=fout",
        });
        afgewezen.push(performance.now() - t);
      }
      meet(
        "api",
        "afgewezen inlogpoging (CSRF-grendel)",
        `mediaan ${mediaan(afgewezen).toFixed(1)} ms`,
        "de grendel werkt voordat er een databasevraag of wachtwoordhash aan te pas komt",
      );
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  }

  /* ---------------- wachtrij ---------------- */
  {
    const { zetInWachtrij, pakTaak, rondAf } = await import("../kern/wachtrij.ts");
    const N = 50;
    const t0 = performance.now();
    await metOrganisatie(pool, { organisatieId }, async (c) => {
      for (let i = 0; i < N; i += 1) {
        await zetInWachtrij(c, organisatieId, {
          soort: "benchmark",
          idempotentieSleutel: `bench-${Date.now()}-${i}`,
        });
      }
    });
    const zetMs = performance.now() - t0;

    const t1 = performance.now();
    let gepakt = 0;
    for (;;) {
      const taak = await metOrganisatie(pool, { organisatieId }, (c) =>
        pakTaak(c, organisatieId, "bench", ["benchmark"]),
      );
      if (!taak) break;
      await metOrganisatie(pool, { organisatieId }, (c) => rondAf(c, taak.id, 0));
      gepakt += 1;
    }
    const pakMs = performance.now() - t1;

    meet("wachtrij", "taken in de wachtrij zetten", `${(zetMs / N).toFixed(1)} ms per taak`, `${N} taken`);
    meet(
      "wachtrij",
      "pakken en afronden",
      `${(pakMs / Math.max(1, gepakt)).toFixed(1)} ms per taak, ${Math.round((gepakt / pakMs) * 1000)} per seconde`,
      `${gepakt} taken, inclusief for update skip locked en de lease`,
    );
  }

  /* ---------------- opslag ---------------- */
  {
    /* LET OP: de documenttelling MOET binnen een organisatiecontext.
       De eerste versie vroeg hem rechtstreeks op de pool en kreeg 0
       terug — RLS filterde alles weg omdat app.organisatie_id niet
       gezet was. Dat is de beveiliging die werkt, maar het maakte
       "groei per document" een onzinnig getal (21.813 kB). Een
       benchmark die stil 0 meet is erger dan geen benchmark. */
    const db = await metOrganisatie(pool, { organisatieId }, (c) =>
      eenRij<{ omvang: string; bytes: string }>(
        c,
        "select pg_size_pretty(pg_database_size(current_database())) as omvang, pg_database_size(current_database())::text as bytes",
      ),
    ).catch(() => null);
    const tabellen = await metOrganisatie(pool, { organisatieId }, (c) =>
      rijen<{ tabel: string; omvang: string }>(
        c,
        `select relname as tabel, pg_size_pretty(pg_total_relation_size(c.oid)) as omvang
           from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'intel' and c.relkind = 'r'
          order by pg_total_relation_size(c.oid) desc limit 5`,
      ),
    ).catch(() => []);
    const docs = await metOrganisatie(pool, { organisatieId }, (c) =>
      eenRij<{ n: number }>(c, "select count(*)::int as n from intel.brondocumenten"),
    ).catch(() => null);

    if (db && docs && docs.n > 0) {
      const perDoc = Number(db.bytes) / Math.max(1, docs.n);
      meet("opslag", "databaseomvang", db.omvang, `${docs.n} brondocumenten`);
      meet(
        "opslag",
        "groei per brondocument",
        `${(perDoc / 1024).toFixed(1)} kB`,
        "lineair: de bronlaag domineert en groeit met het aantal documenten",
      );
      meet(
        "opslag",
        "projectie 12 maanden",
        `${((perDoc * docs.n * 12) / 1024 / 1024).toFixed(0)} MB`,
        "ALS het ingesttempo gelijk blijft; dat is een aanname, geen meting",
      );
    } else {
      meet("opslag", "groei per brondocument", "NIET GEMETEN", "geen documenten binnen de organisatiecontext");
    }
    for (const t of tabellen) meet("opslag", `tabel ${t.tabel}`, t.omvang);
  }

  /* ---------------- back-up ---------------- */
  {
    try {
      const uit = execFileSync("node", ["src/cli/backup.ts", "--lijst"], {
        encoding: "utf8",
        maxBuffer: 8 * 1024 * 1024,
      });
      const regel = uit.split("\n").filter((r) => /kB/.test(r)).pop();
      if (regel) meet("backup", "nieuwste back-up", regel.trim());
    } catch {
      meet("backup", "nieuwste back-up", "NIET GEMETEN");
    }
  }

  /* ---------------- geheugen ---------------- */
  {
    const nu = process.memoryUsage();
    meet("geheugen", "rss van dit proces", `${Math.round(nu.rss / 1024 / 1024)} MB`);
    meet("geheugen", "groei tijdens de benchmark", `${Math.round((nu.rss - geheugenStart) / 1024 / 1024)} MB`);
    meet("geheugen", "heap in gebruik", `${Math.round(nu.heapUsed / 1024 / 1024)} MB`);
  }

  /* ---------------- rapport ---------------- */
  console.log("");
  console.log("PRESTATIEMETING");
  console.log("=".repeat(96));
  console.log(`  node ${process.version} op ${process.platform}/${process.arch}`);
  console.log(`  database ${config.databaseUrl.replace(/\/\/[^@]*@/, "//<verborgen>@")}`);
  console.log("");
  let groep = "";
  for (const m of metingen) {
    if (m.groep !== groep) {
      groep = m.groep;
      console.log("");
      console.log(groep.toUpperCase());
    }
    console.log(`  ${m.naam.padEnd(46)} ${m.waarde}`);
    if (m.opmerking) console.log(`  ${" ".repeat(46)} ${m.opmerking}`);
  }
  console.log("");
  console.log("=".repeat(96));
  console.log("WAT DEZE CIJFERS NIET ZIJN");
  console.log("Gemeten op macOS met een lokale Postgres 17 en 2.103 documenten. Ze");
  console.log("zeggen iets over de VORM van de werklast en niets over de absolute");
  console.log("snelheid van een productiehost. Herhaal deze meting daar.");
} finally {
  await sluitAllePools();
}
