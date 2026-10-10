# Besluit — één gedeelde intelligencekern met costa-select-dashboard?

**Gemeten op 10 oktober 2026. Besluit: NIET NU CONSOLIDEREN.**
Adapter plus gedocumenteerd migratiepad. De onderbouwing staat hieronder,
met per argument wat er werkelijk is gemeten en wat niet.

De opdracht geeft de voorkeur aan "één gedeelde intelligencekern met
aparte merkconfiguraties", en zegt tegelijk: Vibe Home niet herschrijven
en de lancering van Vibe Energy niet blokkeren voor architectuurzuiverheid.
Die drie eisen zijn hier niet samen te halen, en daarom wint de laatste.

---

## 1. Wat er is gemeten

### costa-select-dashboard (CSD)

Branch bij meting: `siq-ev-businesscase` op `4a714ca7`,
**werkboom vuil: 79 bestanden**.

| meting | uitkomst |
|---|---|
| naam in `package.json` | `costa-select-platform` |
| stack | Next **16.2.2**, React **19.2.4**, `@supabase/supabase-js` ^2.101.1, TypeScript ^5 |
| gevolgde broncode (`git ls-files`) | **1.212** `.ts`/`.tsx`, **168** `.sql` |
| SQL-indeling | losse `supabase-*.sql`-bestanden in de wortel, geen genummerde migratieketen |
| `brondocument` / `tdm_status` / `robots_status` in gevolgde bestanden | **0** |

Op de SEO-branches ligt wél een analyticslaag:

| branch | meting |
|---|---|
| `seo/gsc-ingest` | 33 bestanden met GSC/Search Console; tabellen `public.seo_gsc_run`, `seo_gsc_dag`, `seo_gsc_route_dag`, `seo_gsc_onbekende_url` |
| `release/seo-control-center` | 13 bestanden met GSC/Search Console |

Er zijn **vier** losse SEO/GSC-branches (`marketing/seo-control-center`,
`marketing/seo-release`, `release/seo-control-center`, `seo/gsc-ingest`)
plus bijbehorende worktrees. Ze zijn niet samengevoegd.

### Dit platform (Release 2)

| meting | uitkomst |
|---|---|
| runtime | Node 24 met native type-stripping, **geen buildstap** |
| runtime-dependencies | **twee**: `express`, `pg` |
| database | eigen Postgres-schema `intel` + `intel_priv`, 13 genummerde migraties |
| RLS | `current_setting('app.organisatie_id')`, per transactie gezet |
| rollen | `vibe_intel_app` (nologin, geen superuser, geen BYPASSRLS, bezit niets) |
| framework | geen |

### Waar de overlap écht zit

Niet in de bronlaag, niet in de claimlaag, niet in de besluitmotor — die
bestaan in CSD niet. De overlap is **één bounded vlak: de GSC-ingest.**
CSD heeft `seo_gsc_*`; dit platform heeft zijn eigen analyticstabellen
(migratie 0006).

> **Niet gemeten, en dus niet beweerd:** of de GSC-modellen van CSD en dit
> platform semantisch gelijk zijn. CSD's tabellen zijn alleen op naam
> bekeken, niet op kolomniveau vergeleken. Een consolidatiebesluit over
> juist dat vlak hoort pas na die vergelijking.

---

## 2. Waarom niet consolideren

**a. Twee onverenigbare runtimes.** CSD is een Next 16-applicatie met
React 19; dit platform heeft bewust geen framework, geen buildstap en twee
dependencies. Een gedeelde kern betekent één van beide kiezen. Dit
platform in Next trekken voegt een framework, een buildstap en honderden
transitieve dependencies toe aan een laag die nu in zijn geheel te
overzien is. CSD naar deze vorm trekken is het herschrijven van 1.212
bestanden — precies wat de opdracht verbiedt.

**b. Twee verschillende beveiligingsmodellen.** Dit platform zet RLS op
`app.organisatie_id` en verbindt met `-c role=vibe_intel_app`, een rol die
niets bezit en geen BYPASSRLS heeft. CSD werkt via Supabase met
`anon`/`authenticated`/`service_role`. Die laatste krijgen in Supabase
standaard EXECUTE op nieuwe functies, en een `revoke` op `PUBLIC` haalt dat
er niet af — een eerder gemeten valkuil in dat project. Eén kern betekent
één van deze twee modellen voor beide merken. Dat is geen refactor; dat is
een beveiligingsmigratie op een live dashboard.

**c. Het slechtst mogelijke moment.** De werkboom van CSD is vuil (79
bestanden) en de SEO/GSC-functionaliteit staat verdeeld over vier
branches die niet zijn samengevoegd. Consolideren in een bewegend doel
levert een merge waarvan niemand de basislijn kent. De staande regel op
deze machine is dat werk van een andere sessie niet wordt aangeraakt.

**d. De winst is klein.** De overlap is één vlak (GSC), niet een kern. De
bronlaag, de toestemmingsladder, de claimboekhouding met bewijsplicht, de
besluitmotor en het nieuwskanaal bestaan alleen hier. Een "gedeelde kern"
zou vandaag vooral gedeelde *infrastructuur* zijn zonder gedeelde
*inhoud*.

---

## 3. Wat er in plaats daarvan is gedaan

**Kennis is wél hergebruikt, code niet.** Migratie
`0009_geleende_lessen.sql` neemt de constraints over die in CSD duur zijn
geleerd: vier ogen op een goedkeuring, goedkeuring die aan een
inhoudsafdruk bindt, append-only besluiten, en de default-ACL-les
hierboven. Dat is het hergebruik met de hoogste opbrengst en de laagste
koppeling: de redenen reizen mee, de afhankelijkheid niet.

**De grens is expliciet.** Dit platform raakt CSD op geen enkele manier
aan: geen gedeelde database, geen gedeelde service, geen import. De
merkconfiguratie die de opdracht vraagt bestaat hier al als
`intel.organisaties` plus `app.organisatie_id`; het schema is vanaf
migratie 0001 multi-tenant. Een tweede merk toevoegen is een rij, geen
refactor. Dat is de goedkope helft van "één kern, aparte
merkconfiguraties", en die is binnen.

---

## 4. Migratiepad, als consolidatie later wél gewenst is

In deze orde, met een meetbaar afbreekpunt per stap:

1. **Vergelijk de GSC-modellen op kolomniveau.** `seo_gsc_dag` /
   `seo_gsc_route_dag` tegenover de analyticstabellen hier. Afbreekpunt:
   wijkt de positiebewaring af (dit platform bewaart `positie_som` plus
   `impressies` en nooit een voorgemiddelde positie), dan is één model
   alleen haalbaar als CSD die verandering ook wil.
2. **Trek de GSC-ingest naar één dienst** met twee property-configuraties.
   Dit is het enige vlak waar consolidatie vandaag al verdedigbaar is.
   Afbreekpunt: de ingest draait in CSD als Cloud Run Job omdat Railway
   geen OIDC-identity-token heeft; die beperking geldt hier ook en moet de
   gedeelde dienst dus ook respecteren.
3. **Maak de merkconfiguratie van dit platform expliciet** door de
   site-specifieke aannames (hostnaam, routeregisterpad,
   `CLUSTER_NAAR_ROUTE`, de onderwerptaxonomie) uit de code naar een
   configuratie per organisatie te halen. Nu zijn ze gedeeltelijk
   hardcoded op Vibe Energy.
4. **Pas daarna** de bronlaag en de claimboekhouding, als CSD er dan een
   gebruiker voor heeft. Vandaag heeft het die niet.

Stap 1 en 3 zijn zinvol los van elk consolidatiebesluit. Stap 4 is pas
zinvol als er een tweede afnemer bestaat.

---

## 5. Wat dit besluit níét zegt

- Niet dat consolidatie verkeerd is. Alleen dat vandaag de kosten bekend
  zijn en de opbrengst niet.
- Niet dat de modellen onverenigbaar zijn. Dat is niet gemeten; zie de
  waarschuwing in §1.
- Niet dat dit het besluit van de eigenaar vervangt. Dit is een
  implementatiesessie; de keuze tussen twee ketens en één keten is een
  eigenaarsbesluit. Wat hier staat is de meting eronder.
