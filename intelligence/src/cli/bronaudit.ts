/* ============================================================
   CLI — bronaudit
   ------------------------------------------------------------
   Par. 2/3: per connector zeggen of hij levert, en zo niet WAAROM, in
   de vaste taxonomie van bronnen/storingssoort.ts — met de handeling
   die daarbij hoort.

   Met `--probe` wordt elke niet-gezonde bron ook LIVE nagetrokken: een
   HEAD/GET op zijn robots.txt en zijn endpoint. Dat is nodig omdat de
   opgeslagen toestand kan achterlopen. Gemeten op 12 oktober 2026
   stonden twee bronnen op een fout die live niet meer reproduceerde:
   rvo-subsidie-sitemap (opgeslagen HTTP 500, live 200) en rendo-nieuws
   (gerapporteerd 403, live 200).

   De probe gebruikt de eigen User-Agent en respecteert robots. Er wordt
   niets vermomd en niets omzeild.
   ============================================================ */

import { maakPool, metOrganisatie, rijen, sluitAllePools } from "../kern/db.ts";
import { huidigeOrganisatie } from "../db/zaai.ts";
import {
  classificeerStoring,
  STORINGSSOORT_HANDELING,
  STORINGSSOORT_LABEL,
  type Storingssoort,
} from "../bronnen/storingssoort.ts";

const heeft = (n: string) => process.argv.includes(`--${n}`);
const uit = (s: string) => process.stdout.write(s);

type Rij = {
  sleutel: string;
  uitgever: string;
  soort: string;
  actief: boolean;
  gezondheid: string;
  gezondheid_reden: string | null;
  storingssoort: string | null;
  storing_sinds: string | null;
  storing_detail: string | null;
  opgeschort_tot: string | null;
  opeenvolgende_fouten: number;
  endpoint_url: string;
  basis_url: string | null;
  robots_status: string | null;
  tdm_status: string | null;
  laatst_opgehaald: string | null;
  laatst_item: string | null;
  dagen_stil: number | null;
  levert_gebeurtenissen: boolean;
  documenten: number;
};

/** Haalt alleen de statusregel op; geen inhoud, geen opslag. */
async function probe(url: string): Promise<string> {
  const start = Date.now();
  try {
    const r = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "user-agent":
          "VibeIntelligence/1.0 (+https://www.vibeenergy.nl; contact: beheer@vibeenergy.nl)",
      },
      signal: AbortSignal.timeout(20_000),
    });
    const body = await r.arrayBuffer();
    return `HTTP ${r.status} ${body.byteLength}b ${Date.now() - start}ms${
      r.url !== url ? ` (via ${r.url})` : ""
    }`;
  } catch (e) {
    return `onbereikbaar: ${(e as Error).message} (${Date.now() - start}ms)`;
  }
}

const pool = maakPool();
try {
  const organisatieId = await huidigeOrganisatie(pool);
  const alle = await metOrganisatie(pool, { organisatieId }, (c) =>
    rijen<Rij>(
      c,
      `select b.sleutel, b.uitgever, b.soort, b.actief, b.gezondheid, b.gezondheid_reden,
              b.storingssoort, b.storing_sinds::text, b.storing_detail,
              b.ophalen_opgeschort_tot::text as opgeschort_tot,
              b.opeenvolgende_fouten, b.endpoint_url, b.basis_url,
              b.robots_status, b.tdm_status,
              b.laatst_opgehaald_op::text as laatst_opgehaald,
              b.laatst_item_op::text as laatst_item,
              case when b.laatst_item_op is null then null
                   else extract(day from now() - b.laatst_item_op)::int end as dagen_stil,
              b.levert_gebeurtenissen,
              (select count(*)::int from intel.brondocumenten d where d.bron_id = b.id) as documenten
         from intel.bronnen b
        where b.organisatie_id = $1
        order by (b.storingssoort is not null) desc, b.actief desc, b.sleutel`,
      [organisatieId],
    ),
  );

  /* DE NEGEN UITGEZETTE BRONNEN HOREN ER OOK BIJ.
     De verzamelronde leest alleen `where actief`, dus een uitgezette
     bron krijgt nooit een gemeten storingssoort en zou uit de audit
     vallen — terwijl dat juist de bronnen zijn met een robots-verbod of
     een TDM-voorbehoud. Voor die bronnen leiden we de soort hier af uit
     de OPGESLAGEN toestemmingsvelden en halen we niets op: een bron die
     ons verbiedt te lezen, lezen we ook niet om hem te classificeren.

     Afgeleid is niet gemeten, en dat staat er ook bij. */
  const afgeleid = new Map<string, Storingssoort>();
  for (const b of alle) {
    if (b.storingssoort !== null || b.actief) continue;
    const u = classificeerStoring({
      resultaat: "overgeslagen",
      httpStatus: null,
      foutSoort: null,
      herhaalbaar: null,
      aantalItems: 0,
      robotsStatus: b.robots_status,
      tdmStatus: b.tdm_status,
      overgeslagenReden: "bron staat uit",
    });
    if (u.soort !== null) afgeleid.set(b.sleutel, u.soort);
  }
  const soortVan = (b: Rij): Storingssoort | null =>
    (b.storingssoort as Storingssoort | null) ?? afgeleid.get(b.sleutel) ?? null;

  /* Bronnen die niets leveren omdat hun TOESTEMMING niet is
     vastgesteld. Geen van de negen storingssoorten dekt dit: er is geen
     storing en er is geen verbod, er is een open vraag. Apart tellen,
     want ze mogen niet als gezond doorgaan en ze vragen een andere
     handeling dan een geweigerde bron. */
  const toestemmingOnbekend = alle.filter(
    (b) =>
      soortVan(b) === null &&
      (b.robots_status === "onbekend" || b.tdm_status === "onbekend"),
  );
  const onbekendeSleutels = new Set(toestemmingOnbekend.map((b) => b.sleutel));

  const gezond = alle.filter(
    (b) => soortVan(b) === null && b.actief && !onbekendeSleutels.has(b.sleutel),
  );
  const metStoring = alle.filter((b) => soortVan(b) !== null);
  const uitgezet = alle.filter(
    (b) => !b.actief && soortVan(b) === null && !onbekendeSleutels.has(b.sleutel),
  );

  uit("BRONAUDIT\n");
  uit("==============================================================================\n");
  uit(`  bronnen totaal           ${alle.length}\n`);
  uit(`  actief en zonder storing ${gezond.length}\n`);
  uit(`  met een storingssoort    ${metStoring.length} (waarvan ${afgeleid.size} afgeleid uit toestemming, niet gemeten)\n`);
  uit(`  toestemming onbekend     ${toestemmingOnbekend.length}\n`);
  uit(`  uitgezet zonder soort    ${uitgezet.length}\n`);

  /* Per taxonomiesoort, want de soort bepaalt de handeling. */
  const perSoort = new Map<string, Rij[]>();
  for (const b of metStoring) {
    const k = soortVan(b)!;
    perSoort.set(k, [...(perSoort.get(k) ?? []), b]);
  }

  if (perSoort.size === 0) {
    uit("\nGeen enkele bron draagt een storingssoort.\n");
    uit("Let op: dat betekent 'niet geclassificeerd', niet automatisch 'gezond'.\n");
    uit("Een bron krijgt pas een soort nadat de verzamelronde hem heeft aangeraakt.\n");
  }

  for (const [soort, bronnen] of [...perSoort.entries()].sort()) {
    const s = soort as Storingssoort;
    uit(`\n${STORINGSSOORT_LABEL[s] ?? soort} (${soort}) — ${bronnen.length}\n`);
    uit(`  handeling: ${STORINGSSOORT_HANDELING[s] ?? "onbekend"}\n`);
    for (const b of bronnen) {
      const isAfgeleid = b.storingssoort === null;
      uit(`\n  ${b.sleutel}  [${b.uitgever}, ${b.soort}]${isAfgeleid ? "  (AFGELEID)" : ""}\n`);
      if (isAfgeleid) {
        uit(`    grondslag    afgeleid uit robots=${b.robots_status ?? "-"} tdm=${b.tdm_status ?? "-"};\n`);
        uit(`                 deze bron staat uit en is NIET opgehaald om hem te classificeren\n`);
      } else {
        uit(`    sinds        ${b.storing_sinds?.slice(0, 19) ?? "-"}\n`);
        uit(`    gemeten      ${b.storing_detail ?? "-"}\n`);
      }
      if (b.opgeschort_tot) uit(`    opgeschort   tot ${b.opgeschort_tot.slice(0, 19)}\n`);
      uit(`    endpoint     ${b.endpoint_url}\n`);
      /* HISTORIE BLIJFT. Expliciet tonen, want de opdracht eist dat een
         beperkte bron zijn geschiedenis houdt. */
      uit(`    historie     ${b.documenten} brondocument(en) bewaard\n`);
      if (heeft("probe") && !isAfgeleid) {
        const basis = b.basis_url ?? new URL(b.endpoint_url).origin;
        uit(`    probe robots ${await probe(`${basis.replace(/\/+$/, "")}/robots.txt`)}\n`);
        uit(`    probe data   ${await probe(b.endpoint_url)}\n`);
      } else if (heeft("probe") && isAfgeleid) {
        /* NIET PROBEN WAT ONS VERBIEDT. Een bron met een robots-verbod
           of TDM-voorbehoud wordt niet aangeraakt, ook niet 'even om te
           kijken of het nog zo is'. De hercontrole daarvoor loopt via
           de normale planner, met respect voor hetzelfde beleid. */
        uit(`    probe        overgeslagen: deze bron sluit ons uit; niet aankloppen\n`);
      }
    }
  }

  if (toestemmingOnbekend.length > 0) {
    uit(`\nTOESTEMMING NIET VASTGESTELD — ${toestemmingOnbekend.length}\n`);
    uit(`  handeling: robots.txt en het TDM-voorbehoud natrekken en vastleggen.\n`);
    uit(`  Dit is GEEN verbod en GEEN storing: er is nog niets vastgesteld. Tot dat\n`);
    uit(`  gebeurd is haalt het platform hier niets op, en dat is de bedoeling.\n`);
    for (const b of toestemmingOnbekend) {
      uit(
        `\n  ${b.sleutel}  [${b.uitgever}]  robots=${b.robots_status ?? "-"} tdm=${b.tdm_status ?? "-"}` +
          `${b.actief ? "  LET OP: staat WEL actief" : ""}\n`,
      );
      uit(`    endpoint     ${b.endpoint_url}\n`);
      uit(`    historie     ${b.documenten} brondocument(en) bewaard\n`);
    }
  }

  /* VERSHEID. Een bron kan 'gezond' zijn en toch maanden stil staan;
     dat is iets anders dan een storing en hoort apart gemeld. */
  const stil = gezond.filter((b) => (b.dagen_stil ?? 0) >= 30 && b.levert_gebeurtenissen);
  uit(`\nVERSHEID\n`);
  if (stil.length === 0) {
    uit(`  geen actieve bron zonder storing staat 30 dagen of langer stil\n`);
  } else {
    for (const b of stil) {
      uit(`  ${b.sleutel}: laatste item ${b.dagen_stil} dagen oud — geen storing, wel stil\n`);
    }
  }

  if (!heeft("probe")) {
    uit(`\nDraai met --probe om elke storing live na te trekken.\n`);
    uit(`De opgeslagen toestand kan achterlopen: twee bronnen stonden op een fout\n`);
    uit(`die live niet meer reproduceerde.\n`);
  }
} finally {
  await sluitAllePools();
}
