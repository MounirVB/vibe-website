/* ============================================================================
   VIBE ENERGY — MINIMALE PUNT-IN-VLAK
   ----------------------------------------------------------------------------
   Genoeg geometrie om een gemeente aan een netbeheergebied te koppelen, zonder
   een GIS-afhankelijkheid binnen te halen. Werkt op GeoJSON Polygon en
   MultiPolygon in graden (EPSG:4326).

   De ringen worden één keer voorbewerkt tot {ring, bbox}. Zonder die
   bbox-voorfilter is 342 gemeenten x honderden steekproefpunten x zes
   netbeheerders met duizenden coördinaten te traag.
   ============================================================================ */

/** Bouwt een testbaar vlak uit een GeoJSON-geometrie. */
export function bereidVoor(geometry) {
  const polys = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
  return polys.map((poly) => {
    const buiten = poly[0];
    const gaten = poly.slice(1);
    return { buiten, gaten, bbox: bbox(buiten) };
  });
}

export function bbox(ring) {
  let xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity;
  for (const [x, y] of ring) {
    if (x < xmin) xmin = x;
    if (x > xmax) xmax = x;
    if (y < ymin) ymin = y;
    if (y > ymax) ymax = y;
  }
  return [xmin, ymin, xmax, ymax];
}

/** Ray casting op één ring. */
function inRing(x, y, ring) {
  let binnen = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) binnen = !binnen;
  }
  return binnen;
}

/** Ligt het punt in een voorbewerkt vlak? Gaten worden afgetrokken. */
export function inVlak(x, y, vlakken) {
  for (const v of vlakken) {
    const [xmin, ymin, xmax, ymax] = v.bbox;
    if (x < xmin || x > xmax || y < ymin || y > ymax) continue;
    if (!inRing(x, y, v.buiten)) continue;
    let inGat = false;
    for (const g of v.gaten) if (inRing(x, y, g)) { inGat = true; break; }
    if (!inGat) return true;
  }
  return false;
}

/**
 * Steekproefpunten BINNEN een vlak, op een regelmatig raster.
 * Begint grof en verfijnt tot er minstens `minimaal` punten binnen liggen —
 * een kleine gemeente heeft anders te weinig punten om een splitsing te zien.
 */
export function rasterpunten(vlakken, { minimaal = 40, maxStappen = 160 } = {}) {
  let xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity;
  for (const v of vlakken) {
    xmin = Math.min(xmin, v.bbox[0]);
    ymin = Math.min(ymin, v.bbox[1]);
    xmax = Math.max(xmax, v.bbox[2]);
    ymax = Math.max(ymax, v.bbox[3]);
  }
  for (let n = 12; n <= maxStappen; n *= 2) {
    const punten = [];
    const dx = (xmax - xmin) / n;
    const dy = (ymax - ymin) / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = xmin + (i + 0.5) * dx;
        const y = ymin + (j + 0.5) * dy;
        if (inVlak(x, y, vlakken)) punten.push([x, y]);
      }
    }
    if (punten.length >= minimaal || n * 2 > maxStappen) return { punten, raster: n };
  }
  return { punten: [], raster: 0 };
}
