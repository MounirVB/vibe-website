/* ============================================================
   TEST — de brug naar de generator van Release 1
   ------------------------------------------------------------
   WAAROM DEZE BRUG BESTAAT.

   De statische generator staat in de repowortel als `.mjs` zonder
   typen; dit platform is TypeScript met `strict`. Een rechtstreekse
   `await import("../../../scripts/seo/genereer-nationaal.mjs")` geeft
   daarom TS7016 ("could not find a declaration file") en laat
   `npm run typecheck` falen.

   Drie wegen, en waarom deze:

     * een `@ts-ignore` bij elke aanroep — zet de typefout uit op de
       plek waar hij juist iets betekent, en moet bij elke nieuwe toets
       opnieuw;
     * een ambient `declare module` met een RELATIEF pad — werkt niet
       betrouwbaar; ambient moduledeclaraties zijn voor bare specifiers;
     * deze brug: één plek die de grens oversteekt, met de vorm van de
       generatorfuncties EXPLICIET opgeschreven.

   Het derde is ook het eerlijkste: de typen hieronder zijn een
   CONTRACT dat wij over de taalgrens aannemen. Verandert de generator
   zijn vorm, dan hoort dit bestand te wijzigen en faalt de toets die
   erop leunt — en dat is precies wat er op b2de0c4 miste.

   HET SPECIFIER IS EEN VARIABELE, en dat is geen slordigheid. Met een
   letterlijk pad zou TypeScript het `.mjs`-bestand alsnog proberen te
   typeren en TS7016 geven. Via een variabele levert `import()` een
   `any` op, die hier één keer naar het opgeschreven contract wordt
   vernauwd.
   ============================================================ */

/** Een sectie zoals sectieHtml() hem verwacht. */
export type GeneratorSectie = {
  readonly soort: string;
  readonly kop?: string;
  readonly alineas?: readonly string[];
};

export type GeneratorBrug = {
  /**
   * Rendert één sectie.
   *
   * WERPT bij een onbekende of ontbrekende `soort` —
   * `default: throw new Error('onbekende sectiesoort: ...')` in
   * scripts/seo/genereer-nationaal.mjs. Dat gedrag is het hele punt van
   * de toets die deze brug gebruikt.
   */
  readonly sectieHtml: (sectie: GeneratorSectie, motor: unknown) => string;
  readonly normaliseerHrefs: (tekst: string, motor: unknown) => string;
};

const PAD = "../../scripts/seo/genereer-nationaal.mjs";

let geladen: GeneratorBrug | null = null;

/** Laadt de generator één keer en geeft hem getypeerd terug. */
export async function generator(): Promise<GeneratorBrug> {
  if (geladen) return geladen;
  const mod = (await import(PAD)) as Record<string, unknown>;
  const sectieHtml = mod["sectieHtml"];
  const normaliseerHrefs = mod["normaliseerHrefs"];
  if (typeof sectieHtml !== "function" || typeof normaliseerHrefs !== "function") {
    throw new Error(
      `scripts/seo/genereer-nationaal.mjs exporteert niet meer wat deze brug verwacht; ` +
        `gevonden: ${Object.keys(mod).join(", ")}`,
    );
  }
  geladen = {
    sectieHtml: sectieHtml as GeneratorBrug["sectieHtml"],
    normaliseerHrefs: normaliseerHrefs as GeneratorBrug["normaliseerHrefs"],
  };
  return geladen;
}
