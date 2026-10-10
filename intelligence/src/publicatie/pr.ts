/* ============================================================
   PUBLICATIE — de gecontroleerde pull request
   ------------------------------------------------------------
   De publicatieketen eindigt niet in een push naar `main`. Hij
   eindigt in een PULL REQUEST, en een mens merget die.

   WAAROM DAT GEEN FORMALITEIT IS
   Deze repository publiceert www.vibeenergy.nl bij elke push naar
   `main`: railpack met provider staticfile, de repowortel is de
   webroot, geen buildcommando, lege watchPatterns. Een push IS dus de
   deploy. Een proces dat naar main mag pushen is een proces dat
   zonder tussenkomst de site kan veranderen.

   DE ZEVEN GRENDELS, ELK MET EEN EIGEN FAALGEVAL

   1 GEEN MAIN. De branchnaam wordt hier gemaakt en begint altijd met
     `publicatie/`. Een poging om naar main te schrijven wordt
     geweigerd, niet "vermeden".
   2 DE AFDRUK OPNIEUW. De goedkeuring bond aan een inhoudsafdruk.
     Vlak voor het schrijven wordt die afdruk OPNIEUW berekend uit de
     huidige inhoud en vergeleken. Is de tekst na de goedkeuring
     gewijzigd, dan is de goedkeuring niet meer van deze tekst.
   3 ALLEEN HET TOEGESTANE PAD. Dit platform AUTEURT precies één
     bestand: data/inhoud/nieuws/<slug>.json. Alles andere in de
     commit moet GEGENEREERD zijn.
   4 DE GENERATOR MOET HET EENS ZIJN. Na het schrijven draait de keten
     van Release 1 en daarna moet `git status` precies de verwachte
     bestanden tonen. Een handgeschreven sitemapregel of een met de
     hand aangepaste HTML valt hier door de mand, want de generator
     zou hem overschrijven.
   5 ROUTE-EIGENDOM EN SLUGBOTSING. De route moet van dit platform
     zijn en mag niet al bestaan.
   6 GEEN STILLE PROMOTIE. Het aantal regionale PENDING-routes voor en
     na moet gelijk zijn. Een publicatie die en passant 4.587
     regiopagina's live zet is de ergste denkbare uitkomst.
   7 IDEMPOTENT. Dezelfde inhoudsversie levert dezelfde branchnaam en
     werkt de bestaande PR bij in plaats van een tweede te openen.

   WAT ER IN HET AUDITSPOOR KOMT
   De PR-URL, de commit-SHA en de uitkomst. Een mislukte deploy wordt
   NOOIT 'gepubliceerd' in de database: de status volgt de
   werkelijkheid en niet de bedoeling.
   ============================================================ */

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import type pg from "pg";
import { eenRij, rijen } from "../kern/db.ts";
import { maakLogger } from "../kern/log.ts";
import { inhoudAfdruk } from "../inhoud/concept.ts";
import { slugVanPad, NIEUWS_MAP } from "../site/nieuwsregister.ts";

const uitvoeren = promisify(execFile);
const log = maakLogger("publicatie-pr");

/** Het ENIGE pad dat dit platform mag auteuren. */
export const TOEGESTAAN_AUTEURSPAD = /^data\/inhoud\/nieuws\/[a-z0-9][a-z0-9-]*\.json$/;

/**
 * Bestanden die de GENERATOR mag aanraken. Niet geauteurd door dit
 * platform, maar wel verwacht in de commit, omdat de gegenereerde
 * uitvoer in deze repository gecommit staat.
 */
export const TOEGESTAAN_GEGENEREERD = [
  /^data\/seo\/routes\.json$/,
  /^data\/seo\/gegenereerd\.json$/,
  /^sitemap\.xml$/,
  /^robots\.txt$/,
  /^nieuws\.html$/,
  /^nieuws\/[a-z0-9][a-z0-9-]*\.html$/,
  // De noscript-navigatie krijgt de /nieuws-link zodra de hub INDEX is,
  // en dat raakt elke gegenereerde en bestaande pagina.
  /^[a-z0-9][a-z0-9.-]*\.html$/,
  /^(regios|kennis|sectoren|toepassingen|subsidies|vibe)\/.*\.html$/,
];

export type PrGrendel = { naam: string; ok: boolean; meting: string };

export type PrUitkomst = {
  readonly geslaagd: boolean;
  readonly branch: string | null;
  readonly commit: string | null;
  readonly prUrl: string | null;
  readonly grendels: readonly PrGrendel[];
  readonly reden: string;
};

export type GitUitvoerder = (args: readonly string[]) => Promise<string>;

/** Een git-uitvoerder voor een bepaalde werkboom. */
export function maakGit(wortel: string): GitUitvoerder {
  return async (args) => {
    const { stdout } = await uitvoeren("git", [...args], {
      cwd: wortel,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    return stdout;
  };
}

/** De branchnaam. Deterministisch, dus idempotent. */
export function branchVoor(slug: string, inhoudVersieId: number): string {
  return `publicatie/${slug}-v${inhoudVersieId}`;
}

type VersieRij = {
  id: number;
  pad: string;
  titel: string;
  direct_antwoord: string | null;
  body_markdown: string;
  structured_data: unknown;
  status: string;
  inhoud_afdruk: string | null;
  goedgekeurde_afdruk: string | null;
  goedkeurder: string | null;
};

/**
 * Bereidt een publicatie-PR voor en voert hem uit.
 *
 * `droog` doet alles behalve committen, pushen en de PR openen. Dat is
 * de stand waarin dit in deze release wordt opgeleverd: de keten is
 * bewezen, het daadwerkelijk openen van een PR naar de publieke
 * repository is een handeling met goedkeuring.
 */
export async function maakPublicatiePr(
  c: pg.PoolClient,
  organisatieId: number,
  inhoudVersieId: number,
  opties: {
    siteWortel: string;
    droog?: boolean;
    git?: GitUitvoerder;
    basisBranch?: string;
    /** Open een echte GitHub-PR. Vereist `gh` en autorisatie. */
    openPr?: boolean;
    /** Pool waarmee publiceer() mag schrijven. */
    pool: import("../kern/db.ts").Pool;
  },
): Promise<PrUitkomst> {
  const poolVoorPubliceer = opties.pool;
  const git = opties.git ?? maakGit(opties.siteWortel);
  const basis = opties.basisBranch ?? "origin/main";
  const grendels: PrGrendel[] = [];
  const voeg = (naam: string, ok: boolean, meting: string) => {
    grendels.push({ naam, ok, meting });
    return ok;
  };

  const v = await eenRij<VersieRij>(
    c,
    `select v.id, v.pad, v.titel, v.direct_antwoord, v.body_markdown, v.structured_data,
            v.status, v.inhoud_afdruk, v.goedgekeurde_afdruk, g.email as goedkeurder
       from intel.inhoud_versies v
       left join intel.gebruikers g on g.id = v.goedgekeurd_door
      where v.organisatie_id = $1 and v.id = $2`,
    [organisatieId, inhoudVersieId],
  );
  if (!v) {
    return {
      geslaagd: false,
      branch: null,
      commit: null,
      prUrl: null,
      grendels,
      reden: `inhoudsversie ${inhoudVersieId} bestaat niet`,
    };
  }

  /* ---------------- grendel 1: menselijke goedkeuring ---------------- */
  if (
    !voeg(
      "menselijke goedkeuring",
      v.status === "goedgekeurd" && !!v.goedkeurder,
      v.status === "goedgekeurd"
        ? `goedgekeurd door ${v.goedkeurder ?? "ONBEKEND"}`
        : `status is '${v.status}'`,
    )
  ) {
    return afbreken(grendels, "zonder menselijke goedkeuring gaat er geen PR open");
  }

  /* ---------------- grendel 2: de afdruk opnieuw ---------------- */
  const nu = inhoudAfdruk({
    titel: v.titel,
    directAntwoord: v.direct_antwoord ?? "",
    bodyMarkdown: v.body_markdown,
    structuredData: v.structured_data,
  });
  const afdrukKlopt = v.goedgekeurde_afdruk !== null && v.goedgekeurde_afdruk === nu;
  if (
    !voeg(
      "de goedgekeurde afdruk klopt met de huidige inhoud",
      afdrukKlopt,
      afdrukKlopt
        ? `afdruk ${nu.slice(0, 16)} ongewijzigd sinds de goedkeuring`
        : `goedgekeurd op ${String(v.goedgekeurde_afdruk).slice(0, 16)} maar de inhoud is nu ${nu.slice(0, 16)}`,
    )
  ) {
    return afbreken(
      grendels,
      "de tekst is na de goedkeuring gewijzigd; de goedkeuring is niet meer van deze tekst",
    );
  }

  /* ---------------- grendel 3: het toegestane pad ---------------- */
  const slug = slugVanPad(v.pad);
  const relpad = slug ? join(NIEUWS_MAP, `${slug}.json`) : "";
  if (
    !voeg(
      "het pad valt binnen data/inhoud/nieuws/",
      slug !== null && TOEGESTAAN_AUTEURSPAD.test(relpad),
      slug ? relpad : `pad '${v.pad}' is geen nieuwsroute`,
    )
  ) {
    return afbreken(grendels, "dit platform auteurt alleen onder data/inhoud/nieuws/");
  }

  /* ---------------- grendel 4: geen slugbotsing ---------------- */
  const registerPad = join(opties.siteWortel, "data", "seo", "routes.json");
  const register = JSON.parse(await readFile(registerPad, "utf8")) as {
    routes: { route: string; soort: string; staat: string; subsoort: string }[];
  };
  const bestaat = register.routes.some((r) => r.route === `nieuws/${slug}`);
  const bestaandBestand = existsSync(join(opties.siteWortel, relpad));
  if (
    !voeg(
      "geen botsende slug",
      !bestaat || bestaandBestand,
      bestaat
        ? bestaandBestand
          ? `route nieuws/${slug} bestaat al en hoort bij dit record (bijwerken)`
          : `route nieuws/${slug} bestaat al met een ANDER record`
        : `route nieuws/${slug} is vrij`,
    )
  ) {
    return afbreken(grendels, "de slug is al in gebruik door een ander record");
  }

  const regioPendingVoor = register.routes.filter(
    (r) => r.soort === "regio" && r.staat === "PENDING",
  ).length;

  /* ---------------- de branch ---------------- */
  const branch = branchVoor(slug!, v.id);
  if (!voeg("de branch is geen main", !/^(main|master)$/.test(branch), branch)) {
    return afbreken(grendels, "publiceren naar main is uitgesloten");
  }

  /* ---------------- grendel 5: schone werkboom ---------------- */
  const statusVoor = (await git(["status", "--porcelain"])).trim();
  if (
    !voeg(
      "de werkboom is schoon voordat er iets gebeurt",
      statusVoor === "",
      statusVoor === "" ? "schoon" : `${statusVoor.split("\n").length} gewijzigd bestand(en)`,
    )
  ) {
    return afbreken(
      grendels,
      "een publicatie-PR wordt nooit op een vuile werkboom gemaakt: dan komt andermans werk mee",
    );
  }

  if (opties.droog) {
    voeg("DROOG: niets geschreven, niets gecommit, geen PR", true, "alleen de grendels getoetst");
    return {
      geslaagd: true,
      branch,
      commit: null,
      prUrl: null,
      grendels,
      reden: "droog gedraaid; alle grendels stonden open",
    };
  }

  /* ---------------- schrijven op een eigen branch ---------------- */
  await git(["checkout", "-B", branch, basis]);

  /* Het record wordt door publiceer() geschreven en niet hier opnieuw
     opgebouwd. Die functie is al getoetst, doet de boekhouding in de
     database en weigert zelf een niet-goedgekeurde versie, een
     gewijzigde afdruk en elk pad buiten data/inhoud/nieuws/. Een
     tweede implementatie zou een tweede waarheid zijn. */
  const { publiceer, draaiTerug } = await import("../inhoud/publiceer.ts");
  const gepubliceerd = await publiceer(poolVoorPubliceer, organisatieId, v.id);
  if (!gepubliceerd.geschreven) {
    await git(["checkout", "--", "."]);
    voeg("publiceer() schreef het registerrecord", false, gepubliceerd.reden);
    return afbreken(grendels, `publiceer() weigerde: ${gepubliceerd.reden}`);
  }
  voeg("publiceer() schreef het registerrecord", true, gepubliceerd.bestandspad);

  /* ---------------- grendel 6: de generator is de enige andere auteur ---------------- */
  await uitvoeren("node", [join(opties.siteWortel, "scripts", "seo", "bouw.mjs"), "--offline"], {
    cwd: opties.siteWortel,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });

  const gewijzigd = (await git(["status", "--porcelain"]))
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((r) => r.slice(3).trim());

  const onverwacht = gewijzigd.filter(
    (p) =>
      !TOEGESTAAN_AUTEURSPAD.test(p) && !TOEGESTAAN_GEGENEREERD.some((re) => re.test(p)),
  );
  if (
    !voeg(
      "alleen het eigen record en gegenereerde uitvoer zijn gewijzigd",
      onverwacht.length === 0,
      onverwacht.length === 0
        ? `${gewijzigd.length} bestand(en), allemaal verwacht`
        : `onverwacht: ${onverwacht.slice(0, 5).join(", ")}`,
    )
  ) {
    /* De publicatie is al in de database geboekt, dus die moet terug.
       Een mislukte deploy mag NOOIT 'gepubliceerd' blijven. */
    if (gepubliceerd.publicatieId) {
      await draaiTerug(poolVoorPubliceer, organisatieId, gepubliceerd.publicatieId);
    }
    await git(["checkout", "--", "."]);
    await git(["clean", "-fd", "--", "data/inhoud/nieuws"]);
    return afbreken(grendels, "er zijn bestanden gewijzigd die dit platform niet mag aanraken");
  }

  /* ---------------- grendel 7: geen stille regionale promotie ---------------- */
  const registerNa = JSON.parse(await readFile(registerPad, "utf8")) as {
    routes: { soort: string; staat: string }[];
  };
  const regioPendingNa = registerNa.routes.filter(
    (r) => r.soort === "regio" && r.staat === "PENDING",
  ).length;
  if (
    !voeg(
      "geen regionale route stil gepromoveerd",
      regioPendingNa === regioPendingVoor,
      `${regioPendingVoor} PENDING voor, ${regioPendingNa} na`,
    )
  ) {
    if (gepubliceerd.publicatieId) {
      await draaiTerug(poolVoorPubliceer, organisatieId, gepubliceerd.publicatieId);
    }
    await git(["checkout", "--", "."]);
    await git(["clean", "-fd", "--", "data/inhoud/nieuws"]);
    return afbreken(grendels, "deze publicatie veranderde de regionale publicatiestand");
  }

  /* ---------------- committen op de branch ---------------- */
  await git(["add", "-A"]);
  await git([
    "-c",
    "user.name=vibe-intelligence",
    "-c",
    "user.email=intelligence@vibeenergy.nl",
    "commit",
    "-m",
    `publicatie: nieuws/${slug}\n\n` +
      `Inhoudsversie ${v.id}, goedgekeurd door ${v.goedkeurder}.\n` +
      `Inhoudsafdruk ${nu}.\n\n` +
      `Geauteurd door het intelligenceplatform: ${relpad}\n` +
      `Al het andere in deze commit is gegenereerd door scripts/seo/bouw.mjs.\n`,
  ]);
  const commit = (await git(["rev-parse", "HEAD"])).trim();
  voeg("commit op de publicatiebranch", true, `${commit.slice(0, 12)} op ${branch}`);

  let prUrl: string | null = null;
  if (opties.openPr) {
    await git(["push", "--set-upstream", "origin", branch]);
    const { stdout } = await uitvoeren(
      "gh",
      [
        "pr",
        "create",
        "--base",
        "main",
        "--head",
        branch,
        "--title",
        `publicatie: nieuws/${slug}`,
        "--body",
        prBeschrijving(v, slug!, nu, grendels),
      ],
      { cwd: opties.siteWortel, encoding: "utf8" },
    );
    prUrl = stdout.trim().split("\n").pop() ?? null;
    voeg("pull request geopend", !!prUrl, prUrl ?? "geen URL terug");
  } else {
    voeg(
      "pull request NIET geopend",
      true,
      "openPr staat uit; pushen naar de publieke repository vraagt goedkeuring",
    );
  }

  /* ---------------- het auditspoor ---------------- */
  await c.query(
    `insert into intel.publicatiebesluiten
       (organisatie_id, inhoud_versie_id, besluit, actor_soort, motivatie)
     values ($1,$2,'ingediend','systeem',$3)`,
    [
      organisatieId,
      v.id,
      `publicatiebranch ${branch}, commit ${commit}` + (prUrl ? `, PR ${prUrl}` : ", geen PR geopend"),
    ],
  );

  log.info("publicatie-PR voorbereid", { versie: v.id, branch, commit, pr: prUrl });

  return {
    geslaagd: true,
    branch,
    commit,
    prUrl,
    grendels,
    reden: prUrl
      ? `PR geopend: ${prUrl}`
      : `commit ${commit.slice(0, 12)} staat op ${branch}; de PR openen is een menselijke handeling`,
  };
}

function afbreken(grendels: PrGrendel[], reden: string): PrUitkomst {
  log.waarschuwing("publicatie-PR geweigerd", { reden });
  return { geslaagd: false, branch: null, commit: null, prUrl: null, grendels, reden };
}

function prBeschrijving(
  v: VersieRij,
  slug: string,
  afdruk: string,
  grendels: readonly PrGrendel[],
): string {
  return [
    `## Publicatie: \`nieuws/${slug}\``,
    "",
    `**Inhoudsversie** ${v.id}`,
    `**Goedgekeurd door** ${v.goedkeurder}`,
    `**Inhoudsafdruk** \`${afdruk}\``,
    "",
    "### Wat dit platform heeft geauteurd",
    "",
    `Precies één bestand: \`data/inhoud/nieuws/${slug}.json\`.`,
    "Al het andere in deze PR is gegenereerd door `scripts/seo/bouw.mjs`.",
    "Draai die keten opnieuw en `git status` hoort leeg te zijn.",
    "",
    "### Grendels",
    "",
    ...grendels.map((g) => `- ${g.ok ? "PASS" : "FAIL"} ${g.naam} — ${g.meting}`),
    "",
    "### Voor de reviewer",
    "",
    "- De route is zelfverwijzend canoniek en leent zijn commerciële intentie van de onderwerp-eigenaar.",
    "- Elk cijfer in de tekst moet een claim met bron-URL en brondatum hebben; poort 10 en 16 toetsen dat.",
    "- De regionale PENDING-stand is ongewijzigd.",
  ].join("\n");
}
