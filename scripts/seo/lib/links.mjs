/* ============================================================================
   VIBE ENERGY — INTERNE LINKMOTOR
   ----------------------------------------------------------------------------
   Deterministisch: dezelfde invoer geeft dezelfde links, in dezelfde volgorde.
   Drie harde regels, die de poort ook controleert:

   1 · NOOIT naar een PENDING-route. Een link naar een pagina die niet bestaat
       is een 404 voor de bezoeker en verspilde crawlbudget.
   2 · NOOIT een sitewide blok met duizenden regiolinks. De regiolinks op een
       pagina zijn de regio's die bij díe pagina horen: de eigen provincie,
       de eigen familie, de eigen buren — niet de hele lijst.
   3 · GEEN verweesde gepubliceerde route. Elke INDEX-route moet van minstens
       één andere INDEX-route een link krijgen.

   De keten die de opdracht vraagt loopt in beide richtingen:
     nationale oplossing -> sector -> toepassing -> kennis -> provincie ->
     gemeente -> project -> conversie
   ============================================================================ */

export class Linkmotor {
  /** @param {Map<string,object>} register route -> registerregel */
  constructor(register) {
    this.register = register;
    this.inkomend = new Map();
  }

  isIndex(route) {
    const r = this.register.get(String(route).replace(/^\/+/, ''));
    return !!r && r.staat === 'INDEX';
  }

  /** Filtert een lijst routes op bestaande, publiceerbare routes. */
  filter(routes) {
    const uit = [];
    const gezien = new Set();
    for (const r of routes) {
      if (!r) continue;
      const k = String(r.route ?? r).replace(/^\/+/, '');
      if (gezien.has(k) || !this.isIndex(k)) continue;
      gezien.add(k);
      uit.push(typeof r === 'string' ? { route: k, naam: k } : { ...r, route: k });
    }
    return uit;
  }

  /** Legt vast dat `van` naar `naar` linkt, zodat weespagina's meetbaar zijn. */
  tel(van, items) {
    for (const i of items) {
      if (!this.inkomend.has(i.route)) this.inkomend.set(i.route, new Set());
      this.inkomend.get(i.route).add(van);
    }
  }

  /** Alle INDEX-routes zonder inkomende link van een andere INDEX-route. */
  wezen({ negeer = [] } = {}) {
    const uit = [];
    const negeerSet = new Set(negeer);
    for (const [route, r] of this.register) {
      if (r.staat !== 'INDEX' || negeerSet.has(route)) continue;
      const bron = this.inkomend.get(route);
      const vanAnderen = bron ? [...bron].filter((b) => b !== route) : [];
      if (!vanAnderen.length) uit.push(route);
    }
    return uit;
  }
}

/** De vaste nationale namen, zodat elke link dezelfde ankertekst krijgt. */
export const NAAM = {
  '': 'Home',
  'systeem-energieopslag': 'Energieopslag',
  'systeem-zonnepanelen': 'Zonne-energie',
  'systeem-laadpalen': 'Laadinfrastructuur',
  'vibe-control': 'VIBE.CONTROL',
  microgrids: 'Microgrids',
  'energy-hubs': 'Energy Hubs',
  netcongestie: 'Netcongestie',
  laadplein: 'Laadplein',
  energieadvies: 'Energieadvies',
  'verduurzaming-bedrijfspanden': 'Verduurzaming bedrijfspanden',
  projecten: 'Projecten',
  'over-ons': 'Over Vibe',
  contact: 'Plan een gesprek',
  kennis: 'Kennisbank',
  sectoren: 'Sectoren',
  toepassingen: 'Toepassingen',
  subsidies: 'Subsidies en regelingen',
  regios: "Regio's",
  'industrie-logistiek': 'Logistiek',
  'industrie-vastgoed': 'Kantoren en vastgoed',
  'industrie-vve': "VvE's en wooncomplexen",
  'industrie-recreatie': 'Recreatie',
  'industrie-residentieel': 'Woningportefeuilles',
};

export function naamVan(route, terugval) {
  return NAAM[String(route).replace(/^\/+/, '')] || terugval || route;
}
