/* ============================================================
   DASHBOARD — opmaak
   ------------------------------------------------------------
   Server-gerenderde HTML, geen frontendframework. De site zelf is
   HTML met CSS en een beetje vanilla JS; een buildstap introduceren
   voor een intern dashboard zou daar niet bij passen.

   De kleuren komen uit de gemeten ontwerptaal van de site: accent
   #0052FF (de theme-color van alle 51 pagina's) en Space Grotesk als
   kopletter, met een systeemfont als terugval zodat het dashboard geen
   fontbestand nodig heeft.

   Eén regel die hier overal geldt: een onbekende waarde wordt als
   ONBEKEND getoond, nooit als 0. Een streepje dat op nul lijkt is de
   makkelijkste manier om een dashboard te laten liegen.
   ============================================================ */

export function esc(waarde: unknown): string {
  return String(waarde ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

/** Getal of het woord ONBEKEND. Nooit stilletjes nul. */
export function getalOfOnbekend(waarde: number | null | undefined): string {
  if (waarde === null || waarde === undefined) {
    return '<span class="onbekend">ONBEKEND</span>';
  }
  return esc(waarde.toLocaleString("nl-NL"));
}

const CSS = `
:root {
  --accent: #0052FF;
  --inkt: #0b1420;
  --zacht: #5b6b76;
  --rand: #dfe5ea;
  --vlak: #ffffff;
  --doek: #f6f8fa;
  --ok: #0a7c4a;
  --waarschuwing: #9a6700;
  --fout: #b42318;
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--doek); color: var(--inkt);
  font: 15px/1.55 "Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
header.top {
  background: var(--inkt); color: #fff; padding: 14px 22px;
  display: flex; align-items: center; gap: 22px; flex-wrap: wrap;
}
header.top .merk { font-weight: 700; letter-spacing: .04em; }
header.top .merk span { color: #4d8cff; }
header.top nav { display: flex; gap: 16px; flex-wrap: wrap; }
header.top nav a { color: #c6d2de; font-size: 14px; }
header.top nav a[aria-current="page"] { color: #fff; border-bottom: 2px solid var(--accent); }
header.top .wie { margin-left: auto; font-size: 13px; color: #9fb0c0; }
main { padding: 22px; max-width: 1280px; margin: 0 auto; }
h1 { font-size: 22px; margin: 0 0 4px; }
h2 { font-size: 16px; margin: 26px 0 10px; }
p.uitleg { color: var(--zacht); margin: 0 0 18px; max-width: 70ch; }
.rooster { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
.tegel {
  background: var(--vlak); border: 1px solid var(--rand); border-radius: 8px; padding: 14px;
}
.tegel .label { font-size: 12px; color: var(--zacht); text-transform: uppercase; letter-spacing: .06em; }
.tegel .waarde { font-size: 26px; font-weight: 700; margin-top: 4px; }
.tegel .bij { font-size: 12px; color: var(--zacht); margin-top: 2px; }
table { width: 100%; border-collapse: collapse; background: var(--vlak); font-size: 14px; }
.tabelwrap { overflow-x: auto; border: 1px solid var(--rand); border-radius: 8px; }
th, td { text-align: left; padding: 9px 11px; border-bottom: 1px solid var(--rand); vertical-align: top; }
th { background: #eef2f6; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: var(--zacht); }
tr:last-child td { border-bottom: 0; }
td.num { text-align: right; font-variant-numeric: tabular-nums; }
.vlag {
  display: inline-block; padding: 1px 7px; border-radius: 10px; font-size: 12px;
  border: 1px solid var(--rand); background: #f2f5f8;
}
.vlag.ok { color: var(--ok); border-color: #b7e3cd; background: #eafaf1; }
.vlag.waarschuwing { color: var(--waarschuwing); border-color: #f0dca0; background: #fdf7e3; }
.vlag.fout { color: var(--fout); border-color: #f3c4bf; background: #fdeeec; }
.onbekend { color: var(--zacht); font-size: 12px; letter-spacing: .05em; }
.leeg { padding: 16px; color: var(--zacht); background: var(--vlak); border: 1px dashed var(--rand); border-radius: 8px; }
form.inlog { max-width: 360px; background: var(--vlak); padding: 22px; border: 1px solid var(--rand); border-radius: 8px; }
label { display: block; font-size: 13px; color: var(--zacht); margin: 12px 0 4px; }
input[type=email], input[type=password] {
  width: 100%; padding: 9px 10px; border: 1px solid var(--rand); border-radius: 6px; font: inherit;
}
button {
  margin-top: 16px; padding: 9px 16px; border: 0; border-radius: 6px;
  background: var(--accent); color: #fff; font: inherit; font-weight: 600; cursor: pointer;
}
.melding { padding: 10px 12px; border-radius: 6px; margin-bottom: 14px; font-size: 14px; }
.melding.fout { background: #fdeeec; color: var(--fout); border: 1px solid #f3c4bf; }
.melding.let-op { background: #fdf7e3; color: var(--waarschuwing); border: 1px solid #f0dca0; }
.klein { font-size: 12px; color: var(--zacht); }
details { background: var(--vlak); border: 1px solid var(--rand); border-radius: 8px; padding: 10px 12px; margin-top: 8px; }
summary { cursor: pointer; font-size: 14px; }
code { background: #eef2f6; padding: 1px 5px; border-radius: 4px; font-size: 13px; }
`;

export type NavItem = { pad: string; naam: string; recht: string | null };

export const NAVIGATIE: readonly NavItem[] = [
  { pad: "/", naam: "Overzicht", recht: null },
  { pad: "/radar", naam: "Market Radar", recht: null },
  { pad: "/studio", naam: "Content Studio", recht: "inhoud.lezen" },
  { pad: "/regio", naam: "Regio", recht: "inhoud.lezen" },
  { pad: "/signalen", naam: "Commerciële signalen", recht: "signaal.lezen" },
  { pad: "/distributie", naam: "Distributie", recht: "distributie.concept" },
  { pad: "/prestaties", naam: "Prestaties", recht: "inhoud.lezen" },
  { pad: "/instellingen", naam: "Instellingen", recht: "beleid.beheren" },
];

export function pagina(opties: {
  titel: string;
  huidigPad: string;
  gebruiker: { naam: string; rollen: readonly string[]; rechten: ReadonlySet<string> } | null;
  inhoud: string;
}): string {
  const nav = opties.gebruiker
    ? NAVIGATIE.filter((n) => n.recht === null || opties.gebruiker?.rechten.has(n.recht))
        .map(
          (n) =>
            `<a href="${esc(n.pad)}"${n.pad === opties.huidigPad ? ' aria-current="page"' : ""}>${esc(n.naam)}</a>`,
        )
        .join("")
    : "";

  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(opties.titel)} — Intelligence Center</title>
<style>${CSS}</style>
</head>
<body>
<header class="top">
  <div class="merk">VIBE <span>INTELLIGENCE</span></div>
  <nav>${nav}</nav>
  <div class="wie">${
    opties.gebruiker
      ? `${esc(opties.gebruiker.naam)} · ${esc(opties.gebruiker.rollen.join(", "))} · <a href="/uitloggen">uitloggen</a>`
      : "niet ingelogd"
  }</div>
</header>
<main>
${opties.inhoud}
</main>
</body>
</html>
`;
}

export function tegel(label: string, waarde: string, bij = ""): string {
  return `<div class="tegel"><div class="label">${esc(label)}</div><div class="waarde">${waarde}</div>${
    bij ? `<div class="bij">${esc(bij)}</div>` : ""
  }</div>`;
}

export function tabel(
  koppen: readonly string[],
  rijen: readonly (readonly string[])[],
  legeTekst = "Geen rijen.",
): string {
  if (rijen.length === 0) return `<div class="leeg">${esc(legeTekst)}</div>`;
  return `<div class="tabelwrap"><table>
<thead><tr>${koppen.map((k) => `<th>${esc(k)}</th>`).join("")}</tr></thead>
<tbody>${rijen.map((r) => `<tr>${r.map((cel) => `<td>${cel}</td>`).join("")}</tr>`).join("")}</tbody>
</table></div>`;
}

export function vlag(tekst: string, soort: "ok" | "waarschuwing" | "fout" | "" = ""): string {
  return `<span class="vlag${soort ? ` ${soort}` : ""}">${esc(tekst)}</span>`;
}

export function gezondheidVlag(gezondheid: string): string {
  switch (gezondheid) {
    case "HEALTHY":
      return vlag(gezondheid, "ok");
    case "QUIET":
      return vlag(gezondheid, "");
    case "DEGRADED":
      return vlag(gezondheid, "waarschuwing");
    case "BROKEN":
    case "DISABLED":
      return vlag(gezondheid, "fout");
    default:
      return vlag(gezondheid, "");
  }
}
