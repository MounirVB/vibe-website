/* ============================================================
   CLI — droge simulatie van de herclassificatie naar documentsoort-v2
   ------------------------------------------------------------
   WAT DIT IS. De procedure uit eis 7, uitgevoerd als SIMULATIE. Hij
   leest een read-only export van de productiedatabase, laat de ECHTE
   v2-motor erop lopen en rapporteert wat er zou veranderen. Hij schrijft
   niets, nergens, en maakt geen verbinding met welke database ook.

   WAAROM DE ECHTE MOTOR EN GEEN KOPIE. De verleiding is om de
   classificatielogica in dit script na te bouwen, dan hoef je geen
   export te maken. Maar dan meet je je kopie en niet je motor, en die
   twee lopen uiteen op precies de gevallen waar het om gaat. Dit script
   importeert `bepaalDocumentsoort` en `classificeerVersie` uit de
   pijplijn zelf, dus wat hier uit komt is wat de taak zou doen.

   WAT HET NIET DOET, en dat is de kern van 'droog':
     · geen verbinding met de productiedatabase;
     · geen enkele UPDATE, INSERT of DELETE;
     · geen bevestiging of opwaardering van een claim;
     · geen aanroep van de herbeoordelingstaak.

   De uitslag is een rapport. Of die herclassificatie daarna in
   productie mag, is een afzonderlijk besluit met een afzonderlijk
   akkoord — precies zoals fase C en D van de R3-release.

   GEBRUIK
     node src/cli/droogloop-v2.ts <pad-naar-export.json>

   De export maak je read-only met een select op
   intel.brondocument_versies, intel.uitspraken en intel.bronnen; zie
   het acceptatierapport voor het exacte script.
   ============================================================ */

import { readFileSync } from "node:fs";

import { classificeerVersie } from "../pijplijn/documentclassificatie.ts";
import { herkenOnderwerpen } from "../pijplijn/onderwerpen.ts";
import { bepaalClaimAard } from "../pijplijn/claimaard.ts";
import { vormKanVaststellen, type Documentvorm } from "../pijplijn/documentvorm.ts";
import { steltStukDeClaimVast, VASTSTELLING_VERSIE } from "../pijplijn/vaststelling.ts";
import { EIGEN_GEZAG_NAMEN } from "../pijplijn/documentsoort.ts";
import type { Modaliteit } from "../pijplijn/claimmodaliteit.ts";
import { extraheerUitspraken } from "../pijplijn/uitspraken.ts";
import { classificeer } from "../pijplijn/relevantie.ts";
import {
  bewijskrachtPlafond,
  magZelfBevestigen,
  NIET_DRAGENDE_DOCUMENTSOORTEN,
  DOCUMENTSOORT_VERSIE,
  type Documentsoort,
  type Gezag,
} from "../pijplijn/documentsoort.ts";

type ExportVersie = {
  readonly id: string | number;
  readonly titel: string;
  readonly ruwe_tekst: string | null;
  readonly canonieke_url: string | null;
  readonly bron_sleutel: string;
  readonly injectie_verdacht: boolean;
  readonly documentsoort: string | null;
  readonly documentsoort_gezag: string | null;
  readonly documentsoort_versie: string | null;
  readonly beschrijft_besluit_van: string | null;
};

type ExportClaim = {
  readonly id: string | number;
  readonly verificatie_status: string;
  readonly bewijs_kwaliteit: number;
  readonly modaliteit: string | null;
  readonly modaliteit_zekerheid: string | null;
  readonly waarde_numeriek: string | null;
  readonly eenheid: string | null;
  readonly soort: string;
  readonly onderwerp: string;
  readonly tekst: string;
  readonly oordeel_bron: string | null;
  readonly interpretatie_door: string | null;
  readonly bewijskracht_plafond: number | null;
  readonly primaire_versie_id: string | number | null;
};

type ExportBron = {
  readonly sleutel: string;
  readonly betrouwbaarheid: number;
  readonly is_primaire_bron: boolean;
};

const pad = process.argv[2];
if (pad === undefined) {
  console.error("gebruik: node src/cli/droogloop-v2.ts <pad-naar-export.json>");
  process.exit(2);
}

const data = JSON.parse(readFileSync(pad, "utf8")) as {
  versies: ExportVersie[];
  claims: ExportClaim[];
  bronnen: ExportBron[];
};

const bronOp = new Map(data.bronnen.map((b) => [b.sleutel, b]));

/* ------------------------------------------------------------------
   1 · HERCLASSIFICATIE — wat zou v2 van elke versie maken
   ------------------------------------------------------------------ */

type Nieuw = {
  readonly soort: Documentsoort;
  readonly gezag: Gezag;
  readonly vorm: Documentvorm;
  readonly plafond: number;
  readonly magZelf: boolean;
  readonly beschrijftBesluitVan: string | null;
};

const nieuwOp = new Map<string, Nieuw>();
const vanNaar = new Map<string, number>();
const perVorm: Record<string, number> = {};
const perSoortOud: Record<string, number> = {};
const perSoortNieuw: Record<string, number> = {};

for (const v of data.versies) {
  const u = classificeerVersie({
    versieId: Number(v.id),
    titel: v.titel,
    tekst: v.ruwe_tekst ?? "",
    canoniekeUrl: v.canonieke_url,
    bronSleutel: v.bron_sleutel,
    injectieVerdacht: v.injectie_verdacht,
  });
  const n: Nieuw = {
    soort: u.soort,
    gezag: u.gezag,
    vorm: u.vorm,
    plafond: bewijskrachtPlafond(u.soort, u.gezag),
    magZelf: magZelfBevestigen(u.soort, u.gezag),
    beschrijftBesluitVan: u.beschrijftBesluitVan,
  };
  nieuwOp.set(String(v.id), n);

  const oud = v.documentsoort ?? "(niet geclassificeerd)";
  perSoortOud[oud] = (perSoortOud[oud] ?? 0) + 1;
  perSoortNieuw[u.soort] = (perSoortNieuw[u.soort] ?? 0) + 1;
  perVorm[u.vorm] = (perVorm[u.vorm] ?? 0) + 1;
  if (oud !== u.soort) {
    const k = `${oud} -> ${u.soort}`;
    vanNaar.set(k, (vanNaar.get(k) ?? 0) + 1);
  }
}

/* ------------------------------------------------------------------
   2 · HERBEOORDELING — wat betekent dat voor de claims

   De regel die hier wordt nagerekend is dezelfde die uitspraken.ts
   gebruikt bij het schrijven:

     magBevestigen = isPrimaireBron && betrouwbaarheid >= 4
                     && magZelfBevestigen(soort, gezag)
     bewijs_kwaliteit = min(min(5, max(1, betrouwbaarheid)), plafond)

   EEN CLAIM KAN HIER ALLEEN DALEN OF GELIJK BLIJVEN, nooit stijgen.
   Dat is geen eigenschap van dit script maar van de herbeoordeling:
   een bestaande bevestiging wordt niet opnieuw verleend op grond van
   een nieuwe documentsoort. Zie eis 7 en 8. Het script MEET of die
   bewering klopt in plaats van hem aan te nemen.
   ------------------------------------------------------------------ */

type ClaimGevolg = {
  readonly id: string;
  readonly oudeStatus: string;
  readonly nieuweStatus: string;
  readonly oudeBk: number;
  readonly nieuweBk: number;
  readonly oudeSoort: string;
  readonly nieuweSoort: string;
  readonly menselijk: boolean;
};

const gevolgen: ClaimGevolg[] = [];
let zonderPrimair = 0;

for (const c of data.claims) {
  if (c.primaire_versie_id === null) {
    zonderPrimair += 1;
    continue;
  }
  const versie = data.versies.find((v) => String(v.id) === String(c.primaire_versie_id));
  const n = nieuwOp.get(String(c.primaire_versie_id));
  if (versie === undefined || n === undefined) {
    zonderPrimair += 1;
    continue;
  }
  const bron = bronOp.get(versie.bron_sleutel);
  const betrouwbaarheid = bron?.betrouwbaarheid ?? 1;
  const isPrimair = bron?.is_primaire_bron ?? false;

  const magBevestigen = isPrimair && betrouwbaarheid >= 4 && n.magZelf;
  const nieuweBk = Math.min(Math.min(5, Math.max(1, betrouwbaarheid)), n.plafond);

  /* EEN MENSELIJK OORDEEL WORDT NOOIT OVERSCHREVEN. Dat is dezelfde
     regel als in herbeoordeling.ts; hier alleen om hem in de
     simulatie niet stil te overtreden. */
  const menselijk = c.oordeel_bron === "mens" || c.interpretatie_door !== null;

  let nieuweStatus = c.verificatie_status;
  if (!menselijk) {
    if (c.verificatie_status === "bevestigd" && !magBevestigen) nieuweStatus = "ongeverifieerd";
    /* GEEN NIEUWE BEVESTIGING. Een claim die nu ongeverifieerd is
       wordt hier niet bevestigd, ook niet als v2 zijn document naar
       een hogere soort tilt. Opwaarderen gebeurt alleen door een
       nieuwe extractie of door bronverificatie, met een eigen
       besluit. */
  }

  gevolgen.push({
    id: String(c.id),
    oudeStatus: c.verificatie_status,
    nieuweStatus,
    oudeBk: c.bewijs_kwaliteit,
    nieuweBk: menselijk ? c.bewijs_kwaliteit : Math.min(c.bewijs_kwaliteit, nieuweBk),
    oudeSoort: versie.documentsoort ?? "(geen)",
    nieuweSoort: n.soort,
    menselijk,
  });
}

/* ------------------------------------------------------------------
   3 · PRIMAIRE-BRONVERIFICATIE — hoeveel ankers komen er bij

   bronverificatie.ts eist dat het ORIGINEEL
   `documentsoort in (OFFICIEEL_BESLUIT, OFFICIELE_REGELGEVING)` heeft
   EN `beschrijft_besluit_van is null`. Onder v1 waren er nul van die
   documenten, waardoor de hele verificatie inert was. Dit telt hoeveel
   er onder v2 bij komen — en hoeveel daarvan ook een GROOTHEID
   vaststellen, want zonder getal valt er niets aan te ankeren.
   ------------------------------------------------------------------ */

let ankersV1 = 0;
let ankersV2 = 0;
for (const v of data.versies) {
  const n = nieuwOp.get(String(v.id))!;
  if (
    (v.documentsoort === "OFFICIEEL_BESLUIT" || v.documentsoort === "OFFICIELE_REGELGEVING") &&
    v.beschrijft_besluit_van === null
  ) {
    ankersV1 += 1;
  }
  if (
    (n.soort === "OFFICIEEL_BESLUIT" || n.soort === "OFFICIELE_REGELGEVING") &&
    n.beschrijftBesluitVan === null
  ) {
    ankersV2 += 1;
  }
}

/* ------------------------------------------------------------------
   RAPPORT
   ------------------------------------------------------------------ */

const sorteer = (r: Record<string, number>) =>
  Object.entries(r).sort((a, b) => b[1] - a[1]);

console.log(`\nDROGE SIMULATIE — ${DOCUMENTSOORT_VERSIE}`);
console.log(`export: ${pad}`);
console.log(`versies: ${data.versies.length}   claims: ${data.claims.length}\n`);

console.log("1 · DOCUMENTVORM (nieuw in v2)");
for (const [k, n] of sorteer(perVorm)) console.log(`     ${k.padEnd(16)} ${String(n).padStart(5)}`);

console.log("\n2 · DOCUMENTSOORT — voor en na");
const alle = new Set([...Object.keys(perSoortOud), ...Object.keys(perSoortNieuw)]);
for (const s of [...alle].sort()) {
  const v1 = perSoortOud[s] ?? 0;
  const v2 = perSoortNieuw[s] ?? 0;
  const d = v2 - v1;
  console.log(
    `     ${s.padEnd(28)} v1 ${String(v1).padStart(5)}   v2 ${String(v2).padStart(5)}   ${
      d === 0 ? "" : d > 0 ? `+${d}` : String(d)
    }`,
  );
}

console.log("\n3 · VERSCHUIVINGEN (alleen waar de soort verandert)");
const sv = [...vanNaar.entries()].sort((a, b) => b[1] - a[1]);
if (sv.length === 0) console.log("     geen");
for (const [k, n] of sv) console.log(`     ${String(n).padStart(5)}  ${k}`);
const totaalVerschoven = sv.reduce((a, [, n]) => a + n, 0);
console.log(`     ----- ${totaalVerschoven} van ${data.versies.length} versies verschuiven`);

console.log("\n4 · BEWIJSKRACHTPLAFONDS");
const plafondV2: Record<string, number> = {};
for (const v of data.versies) {
  const n = nieuwOp.get(String(v.id))!;
  plafondV2[String(n.plafond)] = (plafondV2[String(n.plafond)] ?? 0) + 1;
}
for (const [k, n] of Object.entries(plafondV2).sort()) {
  console.log(`     plafond ${k}: ${String(n).padStart(5)} versies`);
}
const magZelfN = data.versies.filter((v) => nieuwOp.get(String(v.id))!.magZelf).length;
console.log(`     mag zelf bevestigen: ${magZelfN} van ${data.versies.length}`);

console.log("\n5 · PRIMAIRE-BRONANKERS (vaststellend, geen navertelling)");
console.log(`     v1: ${ankersV1}`);
console.log(`     v2: ${ankersV2}`);

console.log("\n6 · CLAIMS");
const ingetrokken = gevolgen.filter(
  (g) => g.oudeStatus === "bevestigd" && g.nieuweStatus !== "bevestigd",
);
const nieuwBevestigd = gevolgen.filter(
  (g) => g.oudeStatus !== "bevestigd" && g.nieuweStatus === "bevestigd",
);
const gedaald = gevolgen.filter((g) => g.nieuweBk < g.oudeBk);
const gestegen = gevolgen.filter((g) => g.nieuweBk > g.oudeBk);
console.log(`     beoordeeld: ${gevolgen.length}   zonder primaire binding: ${zonderPrimair}`);
console.log(`     bevestiging ingetrokken: ${ingetrokken.length}`);
console.log(`     NIEUWE bevestiging:      ${nieuwBevestigd.length}   (hoort 0 te zijn)`);
console.log(`     bewijskracht gedaald:    ${gedaald.length}`);
console.log(`     bewijskracht GESTEGEN:   ${gestegen.length}   (hoort 0 te zijn)`);
console.log(`     menselijke oordelen ongemoeid: ${gevolgen.filter((g) => g.menselijk).length}`);
const somOud = gevolgen.reduce((a, g) => a + g.oudeBk, 0);
const somNieuw = gevolgen.reduce((a, g) => a + g.nieuweBk, 0);
console.log(`     som bewijskracht: ${somOud} -> ${somNieuw}`);

console.log("\n6b · DE JURIDISCHE CLAIMPOORT (claimaard-v1)");
/* Hoeveel van de bestaande claims zijn JURIDISCHE vaststellingen, en
   hoeveel daarvan zouden zonder authentieke grondslag zijn bevestigd?
   Dit is de impactanalyse van de poort in uitspraken.ts. Hij werkt
   alleen bij het SCHRIJVEN van nieuwe claims; bestaande rijen worden er
   niet door geraakt. Deze telling zegt dus wat er met dezelfde oogst
   zou zijn gebeurd als de poort er vanaf het begin had gestaan. */
let juridisch = 0;
let juridischBevestigd = 0;
let juridischZonderGrondslag = 0;
for (const c of data.claims) {
  const aard = bepaalClaimAard(c.tekst);
  if (!aard.juridisch) continue;
  juridisch += 1;
  if (c.verificatie_status === "bevestigd") juridischBevestigd += 1;
  const versie = data.versies.find((v) => String(v.id) === String(c.primaire_versie_id));
  const n = versie === undefined ? undefined : nieuwOp.get(String(versie.id));
  const authentiek =
    n !== undefined && n.gezag === "BEVOEGD_GEZAG" && vormKanVaststellen(n.vorm);
  if (!authentiek) juridischZonderGrondslag += 1;
}
console.log(`     juridische claims:                    ${juridisch} van ${data.claims.length}`);
console.log(`     daarvan nu BEVESTIGD:                 ${juridischBevestigd}`);
console.log(`     zonder authentieke grondslag:         ${juridischZonderGrondslag}`);
console.log(`     -> zouden onder de poort niet zelf bevestigen`);

console.log(`\n6c · DE VASTSTELLINGSTOETS (${VASTSTELLING_VERSIE})`);
/* 6b vraagt of het DOCUMENT authentiek is. Dat was precies de te
   zwakke vraag: een concentratiebesluit van bevoegd gezag in
   bekendmakingsvorm bevestigde een tariefzin die het niet vaststelde.
   Deze sectie meet de laag die daar bovenop zit — stelt dit stuk DEZE
   claim vast — zodat het releasebesluit niet op een simulatie rust die
   de reparatie mist.

   TWEE TELLINGEN, want ze beantwoorden verschillende vragen:
     · over de BESTAANDE claims: verandert de uitkomst?
     · over alle juridische zinnen in de 19 vaststellende versies: wat
       zou de poort doen zodra de full-textlaag er claims uit haalt? */
const perUitslag = new Map<string, number>();
let nieuweUitkomstAnders = 0;
for (const c of data.claims) {
  const aard = bepaalClaimAard(c.tekst);
  if (!aard.juridisch) continue;
  const versie = data.versies.find((v) => String(v.id) === String(c.primaire_versie_id));
  const n = versie === undefined ? undefined : nieuwOp.get(String(versie.id));
  if (versie === undefined || n === undefined) continue;
  const oudAuthentiek = n.gezag === "BEVOEGD_GEZAG" && vormKanVaststellen(n.vorm);
  const vs = steltStukDeClaimVast({
    claimTekst: c.tekst,
    documentTitel: versie.titel ?? "",
    documentTekst: versie.ruwe_tekst ?? "",
    documentsoort: n.soort,
    gezag: n.gezag,
    documentvorm: n.vorm,
    modaliteit: (c.modaliteit as Modaliteit | null) ?? "VASTGESTELD",
    eigenGezagNamen: EIGEN_GEZAG_NAMEN[versie.bron_sleutel] ?? [],
  });
  perUitslag.set(vs.uitslag, (perUitslag.get(vs.uitslag) ?? 0) + 1);
  if (oudAuthentiek !== vs.steltVast) nieuweUitkomstAnders += 1;
}
console.log(`     bestaande juridische claims opnieuw gewogen: ${juridisch}`);
console.log(`     uitkomst anders dan onder de oude poort:     ${nieuweUitkomstAnders}   (hoort 0 te zijn op deze voorraad)`);
for (const [k, n] of [...perUitslag].sort((a, b) => b[1] - a[1])) {
  console.log(`       ${k.padEnd(32)} ${n}`);
}

/* En de vooruitblik: de 19 vaststellende versies dragen vandaag nul
   claims, dus de poort is op deze voorraad inert. Zodra de
   full-textlaag draait verandert dat, en dan telt wat hij dan doet. */
let vaststellendeVersies = 0;
let juridischeZinnenDaarin = 0;
let zouZelfBevestigen = 0;
for (const v of data.versies) {
  const n = nieuwOp.get(String(v.id));
  if (n === undefined) continue;
  if (!(n.gezag === "BEVOEGD_GEZAG" && vormKanVaststellen(n.vorm))) continue;
  vaststellendeVersies += 1;
  for (const z of extraheerUitspraken(v.titel ?? "", v.ruwe_tekst ?? "")) {
    if (!bepaalClaimAard(z.tekst).juridisch) continue;
    juridischeZinnenDaarin += 1;
    const vs = steltStukDeClaimVast({
      claimTekst: z.tekst,
      documentTitel: v.titel ?? "",
      documentTekst: v.ruwe_tekst ?? "",
      documentsoort: n.soort,
      gezag: n.gezag,
      documentvorm: n.vorm,
      modaliteit: "VASTGESTELD",
      eigenGezagNamen: EIGEN_GEZAG_NAMEN[v.bron_sleutel] ?? [],
    });
    if (vs.steltVast) zouZelfBevestigen += 1;
  }
}
console.log(`     versies met authentieke grondslag:           ${vaststellendeVersies}`);
console.log(`     juridische zinnen daarin:                    ${juridischeZinnenDaarin}`);
console.log(`     daarvan zou zelfbevestigen:                  ${zouZelfBevestigen}`);
console.log(`     tegengehouden door de vaststellingstoets:    ${juridischeZinnenDaarin - zouZelfBevestigen}`);

console.log("\n7 · DRAAGVERMOGEN — voor en na");
const nietDragendV1 = data.versies.filter((v) =>
  NIET_DRAGENDE_DOCUMENTSOORTEN.includes(v.documentsoort ?? "ONVOLDOENDE_VERIFIEERBAAR"),
).length;
const nietDragendV2 = data.versies.filter((v) =>
  NIET_DRAGENDE_DOCUMENTSOORTEN.includes(nieuwOp.get(String(v.id))!.soort),
).length;
console.log(`     dragen niets  v1 ${nietDragendV1}   v2 ${nietDragendV2}   (van ${data.versies.length})`);

console.log("\n8 · NIEUWSSELECTIE EN SEO/GEO — de verschoven versies");
/* De vraag is of de verschuiving ook iets doet voor de SELECTIE. Die
   leunt niet op de documentsoort maar op `herkenOnderwerpen` en
   `bedrijfsrelevantie`; een zwaarder document dat geen energie-onderwerp
   raakt komt nooit in een kandidaat terecht. Dit meet dat apart, want
   anders wordt een stijging in bewijskracht gelezen als een stijging in
   vindbaarheid. */
let metOnderwerp = 0;
let relevant = 0;
const verschovenIds = data.versies.filter(
  (v) => (v.documentsoort ?? "(niet geclassificeerd)") !== nieuwOp.get(String(v.id))!.soort,
);
for (const v of verschovenIds) {
  const tekst = v.ruwe_tekst ?? "";
  const ond = herkenOnderwerpen(v.titel, tekst);
  const rel = classificeer({ titel: v.titel, tekst, onderwerpen: ond });
  if (ond.length > 0) metOnderwerp += 1;
  if (rel.bedrijfsrelevantie > 0) relevant += 1;
}
console.log(`     verschoven versies: ${verschovenIds.length}`);
console.log(`     daarvan met een herkend energie-onderwerp: ${metOnderwerp}`);
console.log(`     daarvan met bedrijfsrelevantie > 0:        ${relevant}`);

if (ingetrokken.length > 0) {
  console.log("\n9 · INGETROKKEN BEVESTIGINGEN, per claim");
  for (const g of ingetrokken) {
    console.log(
      `     claim ${g.id.padStart(4)}  bk ${g.oudeBk} -> ${g.nieuweBk}  ${g.oudeSoort} -> ${g.nieuweSoort}`,
    );
  }
}

const fout = nieuwBevestigd.length > 0 || gestegen.length > 0;
console.log(`\nEINDOORDEEL SIMULATIE = ${fout ? "FAIL — er wordt opgewaardeerd" : "PASS"}`);
process.exit(fout ? 1 : 0);
