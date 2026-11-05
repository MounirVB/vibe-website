/* ============================================================
   PIJPLIJN — de verwoordbaarheidspoort voor NIET-NUMERIEKE claims
   ------------------------------------------------------------
   WAAROM EEN TWEEDE POORT EN GEEN UITBREIDING VAN DE EERSTE

   verwoordbaarheidspoort() in semantiek.ts vraagt een `Uitdrukking` —
   een getal met schaal, eenheid, exactheid en bereik. Zijn controles 5
   tot en met 8b gaan allemaal over dat getal: rijmt de waarde met het
   schaalwoord, past de eenheid bij het fenomeen, heeft het percentage
   een grondtal.

   Een besluit, een verplichting of een aanvraagperiode heeft geen
   getal. Die claims door die poort duwen zou twee dingen tegelijk
   betekenen: de getalcontroles moeten overgeslagen worden, en dat
   overslaan moet voorwaardelijk worden. Elke voorwaardelijke
   overslagtak in een poort is een plek waar later per ongeluk óók een
   getalclaim langs kan. Dat risico neem ik niet in de laag die bepaalt
   wat gepubliceerd mag worden.

   DEZE POORT IS DAAROM NIET MILDER, MAAR ANDERS. Hij neemt elke
   controle van de eerste poort over die niet over een getal gaat —
   bewijs, verificatiestatus, vervanging, houdbaarheid,
   toepassingsgebied, brongebruik, en de eindtoets "komt er echt een
   zin uit" — en voegt er vier toe die alleen voor vormclaims bestaan:

     passage      staat het fragment dat de claim aanwijst er echt?
     toestand     is vastgesteld of het geldt, of alleen aangekondigd?
     modaliteit   is dit vastgesteld, of gevraagd, of verwacht?
     rol          en bij een datum: WAT is deze datum?

   HIJ GEEFT DEZELFDE ZES UITKOMSTEN TERUG als de eerste poort
   (Verwoordbaarheid), zodat er geen nieuwe waarde in
   uitspraken_verwoordbaar bij hoeft en het dashboard niets hoeft te
   weten over het onderscheid.

   ------------------------------------------------------------
   DE REGEL UIT DE OPDRACHT DIE HIER WOONT

     "Een losse datum is niet automatisch een verwoordbare claim."

   LOSSE_DATUM komt nooit voorbij controle 8. Diezelfde regel staat ook
   als CHECK in migratie 0054, want een regel die alleen in een poort
   staat verdwijnt zodra iemand een tweede schrijfweg maakt.

     "Geen claim mag bevestigd worden zonder voldoende bewijs."

   Controle 2 eist verificatie_status 'bevestigd' en die status wordt
   hier niet gezet. Dat gebeurt in uitspraken.ts, onder exact dezelfde
   voorwaarden als voor een getalclaim: magZelfBevestigen(),
   bepaalClaimAard() en steltStukDeClaimVast(). Deze poort kan een claim
   dus nooit bevestigen; hij kan hem alleen afwijzen of doorlaten.
   ============================================================ */

import type { Claimvorm, Tijdstand } from "./claimvorm.ts";
import type { Datumrol } from "./datumrol.ts";
import type { Modaliteit } from "./claimmodaliteit.ts";
import { NOODZAKELIJKE_ZEKERHEID } from "./claimmodaliteit.ts";
import type { Toepassingsgebied } from "./jurisdictie.ts";
import type { Verwoordbaarheid } from "./semantiek.ts";

/** Verhoog dit bij elke wijziging die een uitslag kan veranderen. */
export const VORMPOORT_VERSIE = "vormpoort-v1";

/**
 * De vormen waarbij de TOESTAND de bewering draagt.
 *
 * Bij een besluit, een verplichting, een inwerkingtreding en een
 * subsidievenster is "geldt het al" de belangrijkste vraag die een
 * lezer heeft. Een regel waarvan niet is vastgesteld of hij in werking
 * is, leest als geldend recht — precies het onderscheid "aangekondigd
 * ≠ in werking" dat de opdracht eist.
 *
 * Bij een PROJECTSTATUS, een SPECIFICATIE en een CONGESTIESTATUS zit de
 * toestand al IN de claim ('is in gebruik genomen', 'is vol verklaard'),
 * dus daar is ONBEPAALD geen gat maar een dubbeling.
 */
const TOESTAND_DRAAGT: ReadonlySet<Claimvorm> = new Set<Claimvorm>([
  "BESLUIT",
  "VERPLICHTING",
  "INWERKINGTREDING",
  "SUBSIDIEVENSTER",
]);

export type VormPoortInvoer = {
  /** Een vormclaim, of een datumclaim. Precies één van de twee. */
  readonly vorm: Claimvorm | null;
  readonly datumrol: Datumrol | null;
  /** Wat de datum betreft; alleen voor datumclaims. */
  readonly datumBetreft: string | null;
  readonly passage: string | null;
  readonly tijdstand: Tijdstand | null;
  readonly modaliteit: Modaliteit | null;
  readonly modaliteitZekerheid: number | null;
  readonly verificatieStatus: string;
  readonly heeftBewijs: boolean;
  readonly vervangenDoor: { readonly id: number; readonly soort: string } | null;
  readonly dagenOud: number | null;
  readonly houdbaarheidDagen: number | null;
  readonly magCiteren: boolean;
  readonly toepassingsgebied: Toepassingsgebied;
  readonly toepassingsgebiedGrondslag: string;
  /** Komt er een Nederlandse zin uit deze velden? */
  readonly kanVerwoorden: () => boolean;
};

export type VormPoortUitslag = {
  readonly uitslag: Verwoordbaarheid;
  readonly reden: string;
  readonly controles: readonly {
    readonly naam: string;
    readonly ok: boolean;
    readonly reden: string;
  }[];
  readonly versie: string;
};

export function vormpoort(inv: VormPoortInvoer): VormPoortUitslag {
  const controles: { naam: string; ok: boolean; reden: string }[] = [];
  const voeg = (naam: string, ok: boolean, reden: string) => {
    controles.push({ naam, ok, reden });
    return ok;
  };
  const klaar = (uitslag: Verwoordbaarheid, reden: string): VormPoortUitslag => ({
    uitslag,
    reden,
    controles,
    versie: VORMPOORT_VERSIE,
  });

  /* 1. BEWIJS. Gelijk aan controle 1 van de eerste poort. */
  if (
    !voeg(
      "bewijs",
      inv.heeftBewijs,
      inv.heeftBewijs ? "er is een primaire bronversie" : "er is geen primaire bronversie",
    )
  ) {
    return klaar(
      "VERIFICATIE_NODIG",
      "er hangt geen primaire bronversie aan deze uitspraak, dus er is geen bewijs",
    );
  }

  /* 2. DE PASSAGE. Nieuw, en de kern van de opdracht: "Iedere claim
     moet een concrete bronpassage hebben." Zonder passage is niet na te
     gaan WAAROM deze zin als besluit of als verplichting is gelezen, en
     dan is het oordeel niet na te meten. */
  const passage = (inv.passage ?? "").trim();
  if (!voeg("passage", passage.length >= 10, `passage van ${passage.length} tekens`)) {
    return klaar(
      "VERIFICATIE_NODIG",
      `er is geen concrete bronpassage van minstens tien tekens vastgelegd (nu ` +
        `${passage.length}). Zonder aanwijsbaar fragment is niet na te gaan waarop dit ` +
        `oordeel rust.`,
    );
  }

  /* 3. VERIFICATIESTATUS. Gelijk aan controle 2 van de eerste poort, en
     met dezelfde strengheid: alleen 'bevestigd' gaat door. */
  const bevestigd = inv.verificatieStatus === "bevestigd";
  voeg("verificatie", bevestigd, `verificatie_status '${inv.verificatieStatus}'`);
  if (inv.verificatieStatus === "tegengesproken") {
    return klaar("TEGENSTRIJDIG", "de uitspraak staat als tegengesproken in de database");
  }
  if (inv.verificatieStatus === "ingetrokken") {
    return klaar("VEROUDERD", "de uitspraak is ingetrokken");
  }
  if (!bevestigd) {
    return klaar(
      "VERIFICATIE_NODIG",
      `verificatie_status is '${inv.verificatieStatus}' en niet 'bevestigd'. Een vormclaim ` +
        `bevestigt zichzelf onder exact dezelfde voorwaarden als een getalclaim; deze heeft ` +
        `die niet gehaald.`,
    );
  }

  /* 4. VERVANGEN DOOR IETS NIEUWERS. */
  if (inv.vervangenDoor) {
    voeg(
      "actueel",
      false,
      `vervangen door uitspraak ${inv.vervangenDoor.id} (${inv.vervangenDoor.soort})`,
    );
    return klaar(
      "VEROUDERD",
      `er staat een nieuwere uitspraak die deze vervangt (${inv.vervangenDoor.soort}, ` +
        `uitspraak ${inv.vervangenDoor.id}). De nieuwere geldt.`,
    );
  }
  voeg("actueel", true, "geen nieuwere uitspraak die deze vervangt");

  /* 5. HOUDBAARHEID. */
  if (
    inv.dagenOud !== null &&
    inv.houdbaarheidDagen !== null &&
    inv.dagenOud > inv.houdbaarheidDagen
  ) {
    voeg(
      "houdbaarheid",
      false,
      `${inv.dagenOud} dagen oud, houdbaarheid ${inv.houdbaarheidDagen}`,
    );
    return klaar(
      "VEROUDERD",
      `de bron is ${inv.dagenOud} dagen oud terwijl dit soort uitspraak ` +
        `${inv.houdbaarheidDagen} dagen houdbaar is. Opnieuw verifieren voor gebruik.`,
    );
  }
  voeg(
    "houdbaarheid",
    true,
    inv.dagenOud === null ? "geen brondatum" : `${inv.dagenOud} dagen oud`,
  );

  /* 6. TOEPASSINGSGEBIED. Woordelijk dezelfde regel als controle 9b van
     de eerste poort: NEDERLAND en EU gaan door, BELGIE en ONBEKEND
     niet. Een leeg gebied is geen bewijs van Nederlandse herkomst. */
  if (inv.toepassingsgebied !== "NEDERLAND" && inv.toepassingsgebied !== "EU") {
    voeg("toepassingsgebied", false, `toepassingsgebied '${inv.toepassingsgebied}'`);
    return klaar(
      "BUITEN_TOEPASSINGSGEBIED",
      inv.toepassingsgebied === "BELGIE"
        ? `deze uitspraak gaat over Belgie en niet over Nederland. Grondslag: ` +
            `${inv.toepassingsgebiedGrondslag}. Een Vlaamse verplichting of een Belgisch ` +
            `besluit betekent hier niets, en een lezer kan dat aan de verwoorde zin niet zien.`
        : `het toepassingsgebied van deze uitspraak is niet vastgesteld. Grondslag: ` +
            `${inv.toepassingsgebiedGrondslag || "geen enkel gebiedssignaal in de bronzin"}. ` +
            `Een leeg gebied is geen bewijs dat het feit over Nederland gaat.`,
    );
  }
  voeg("toepassingsgebied", true, `toepassingsgebied '${inv.toepassingsgebied}'`);

  /* 7. DE MODALITEIT. "Kan ≠ zal", "voornemen ≠ vastgesteld besluit" en
     "verwacht ≠ gerealiseerd" uit de opdracht.

     Een VOORSTEL of een VERWACHTING mag in een artikel staan, maar dan
     benoemd als voorstel of verwachting. Als CLAIM over de
     werkelijkheid draagt alleen een vaststelling, en alleen met
     voldoende zekerheid. Dezelfde grens als draagbaarAlsFeit in
     claimmodaliteit.ts; er is geen tweede drempel bijgekomen en geen
     bestaande verlaagd. */
  if (inv.modaliteit !== "VASTGESTELD") {
    voeg("modaliteit", false, `modaliteit '${inv.modaliteit ?? "niet bepaald"}'`);
    return klaar(
      "CONTEXT_ONVOLLEDIG",
      `de modaliteit is '${inv.modaliteit ?? "niet bepaald"}' en niet VASTGESTELD. ` +
        `Een voorstel of verwachting is geen feit over de werkelijkheid: 'kan' is niet 'zal' ` +
        `en een voornemen is geen vastgesteld besluit.`,
    );
  }
  const zekerheid = inv.modaliteitZekerheid ?? 0;
  if (
    !voeg(
      "zekerheid",
      zekerheid >= NOODZAKELIJKE_ZEKERHEID,
      `modaliteitszekerheid ${zekerheid.toFixed(2)}`,
    )
  ) {
    return klaar(
      "CONTEXT_ONVOLLEDIG",
      `de modaliteit is VASTGESTELD maar met zekerheid ${zekerheid.toFixed(2)}, onder de ` +
        `grens van ${NOODZAKELIJKE_ZEKERHEID}. Dan is de vaststelling geraden en niet ` +
        `gelezen, en hoort de claim geen feit te worden.`,
    );
  }

  /* 8. EN DAN DE VORM- OF DATUMSPECIFIEKE CONTROLE. */
  if (inv.datumrol !== null) {
    /* DE REGEL UIT DE OPDRACHT, LETTERLIJK. */
    if (!voeg("datumrol", inv.datumrol !== "LOSSE_DATUM", `datumrol '${inv.datumrol}'`)) {
      return klaar(
        "CONTEXT_ONVOLLEDIG",
        `de bron noemt deze datum zonder te zeggen wat hij is: geen aanvraagperiode, geen ` +
          `ingang, geen einde, geen publicatiedatum en geen verwachting. Een losse datum is ` +
          `niet automatisch een verwoordbare claim.`,
      );
    }
    /* EEN DATUM ZONDER ONDERWERP IS GEEN BEWERING. '1 juli 2027' zegt
       niets; 'de SDE++-regeling sluit op 1 juli 2027' wel. Het
       onderwerp komt uit het BETREFT-vocabulaire en wordt niet
       verzonnen — ontbreekt het, dan is er geen zin te maken die zeker
       klopt. */
    if (
      !voeg(
        "onderwerp",
        inv.datumBetreft !== null,
        `betreft '${inv.datumBetreft ?? "niet herkend"}'`,
      )
    ) {
      return klaar(
        "CONTEXT_ONVOLLEDIG",
        `de rol van de datum is '${inv.datumrol}', maar WAT er op die datum gebeurt staat ` +
          `niet in de vastgelegde velden. Het vocabulaire herkende geen onderwerp in de ` +
          `bronzin, en een onderwerp erbij verzinnen zou de bewering breder maken dan de ` +
          `bron hem doet.`,
      );
    }
    /* EEN PUBLICATIEDATUM IS WAAR EN ZELDEN NIEUWS, maar hij is wel een
       geldige claim: hij hoort alleen niet als ingangsdatum gelezen te
       worden. Die verwarring is nu uitgesloten omdat de rol vastligt,
       dus hij gaat door naar de redactie met zijn eigen label. */
  } else if (inv.vorm !== null) {
    const toestandNodig = TOESTAND_DRAAGT.has(inv.vorm);
    const toestandBekend = inv.tijdstand !== null && inv.tijdstand !== "ONBEPAALD";
    if (
      !voeg(
        "toestand",
        !toestandNodig || toestandBekend,
        `vorm '${inv.vorm}' met tijdstand '${inv.tijdstand ?? "niet bepaald"}'`,
      )
    ) {
      return klaar(
        "CONTEXT_ONVOLLEDIG",
        `bij een ${inv.vorm} is de vraag "geldt het al" de bewering zelf, en de bronzin ` +
          `geeft geen tijdsignaal. Zonder die toestand leest een aangekondigde regel als ` +
          `geldend recht, en dat is een andere bewering dan de bron doet.`,
      );
    }
    voeg("toestand", true, `tijdstand '${inv.tijdstand ?? "niet nodig voor deze vorm"}'`);
  } else {
    voeg("vorm", false, "geen claimvorm en geen datumrol");
    return klaar(
      "VERIFICATIE_NODIG",
      "deze uitspraak heeft noch een claimvorm noch een datumrol, dus deze poort heeft " +
        "er niets over te zeggen. Dat is een aanroepfout en geen oordeel over de claim.",
    );
  }

  /* 9. BRONGEBRUIK. Gelijk aan controle 9 van de eerste poort, met één
     verschil dat uit de aard van een vormclaim volgt: een vormclaim
     leunt op een PASSAGE uit de bron, dus bij mag_citeren=false is de
     vraag scherper. De verwoorder gebruikt de passage niet in de zin —
     hij benoemt de vorm in eigen woorden — en daarom is dit ook hier
     een registratie en geen blokkade. */
  voeg("brongebruik", true, `mag_citeren=${inv.magCiteren}; de passage wordt niet geciteerd`);

  /* 10. KOMT ER ECHT EEN ZIN UIT? De eindtoets, net als in de eerste
     poort: wie dit overslaat kan VERWOORDBAAR teruggeven voor een
     combinatie waarvoor de verwoorder geen tak heeft. En
     uitspraken_verwoordbaar_heeft_zin eist er een van 25 tekens, dus
     zonder deze controle zou de database de rij weigeren. */
  if (!voeg("verwoording", inv.kanVerwoorden(), "de verwoorder maakt hier een zin van")) {
    return klaar(
      "CONTEXT_ONVOLLEDIG",
      `alle inhoudelijke controles zijn gehaald, maar de verwoorder kan van deze combinatie ` +
        `geen Nederlandse zin maken (vorm '${inv.vorm ?? inv.datumrol}'). Dat is een gat in ` +
        `de verwoorder, niet in het bewijs.`,
    );
  }

  return klaar(
    "VERWOORDBAAR",
    `alle tien de controles gehaald. ${
      inv.datumrol !== null
        ? `Datumrol '${inv.datumrol}' over ${inv.datumBetreft}`
        : `Vorm '${inv.vorm}', tijdstand '${inv.tijdstand}'`
    }. Modaliteit VASTGESTELD met zekerheid ${zekerheid.toFixed(2)}.`,
  );
}
