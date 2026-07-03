// Datenpipeline Stufe 1: Gebäude mit Adresse im Pilotgebiet Bonn-Bad Godesberg
// Quelle: OpenStreetMap via Overpass API — Daten © OpenStreetMap-Mitwirkende (ODbL)
// Aufruf: node pipeline/fetch-buildings.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "data");
const OUT_FILE = join(OUT_DIR, "buildings.geojson");

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const USER_AGENT = "bibelverteilung-demo-pipeline/1.0 (Bibel TV; https://www.bibeltv.de)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const QUERY = `[out:json][timeout:180];
area["name"="Bad Godesberg"]["boundary"="administrative"]->.a;
way["building"]["addr:housenumber"](area.a);
out geom;`;

// Nebengebäude: fliegen aus der Zählbasis (siehe Konzept v2, Abschnitt 8)
const EXCLUDE_TYPES = new Set([
  "garage", "garages", "shed", "carport", "roof", "hut",
  "greenhouse", "garbage_shed", "service", "container", "shelter",
]);

async function fetchOverpass() {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const url of ENDPOINTS) {
      try {
        console.log(`Frage ab: ${url} …`);
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "User-Agent": USER_AGENT,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "data=" + encodeURIComponent(QUERY),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!Array.isArray(json.elements) || json.elements.length === 0) {
          throw new Error("Antwort ohne Elemente");
        }
        console.log(`OK — Datenstand: ${json.osm3s?.timestamp_osm_base}`);
        return json;
      } catch (err) {
        console.warn(`Fehlgeschlagen (${url}): ${err.message}`);
        lastError = err;
        await sleep(5000);
      }
    }
    console.log("Alle Endpunkte fehlgeschlagen — warte 30 s und versuche es erneut …");
    await sleep(30000);
  }
  throw lastError;
}

const round6 = (x) => Math.round(x * 1e6) / 1e6;

// Flächenschwerpunkt (Shoelace); Rückfall auf Punktmittel bei entarteten Ringen
function centroid(ring) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    const f = x1 * y2 - x2 * y1;
    a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f;
  }
  if (Math.abs(a) < 1e-12) {
    const pts = ring.slice(0, -1);
    return [
      round6(pts.reduce((s, p) => s + p[0], 0) / pts.length),
      round6(pts.reduce((s, p) => s + p[1], 0) / pts.length),
    ];
  }
  a *= 0.5;
  return [round6(cx / (6 * a)), round6(cy / (6 * a))];
}

const data = await fetchOverpass();

let excluded = 0, degenerate = 0;
const features = [];
for (const el of data.elements) {
  if (el.type !== "way" || !el.tags || !Array.isArray(el.geometry)) continue;
  const type = el.tags.building || "yes";
  if (EXCLUDE_TYPES.has(type)) { excluded++; continue; }
  if (el.geometry.length < 4) { degenerate++; continue; }

  const ring = el.geometry.map((g) => [round6(g.lon), round6(g.lat)]);
  const [fx, fy] = ring[0];
  const [lx, ly] = ring[ring.length - 1];
  if (fx !== lx || fy !== ly) ring.push([fx, fy]);

  features.push({
    type: "Feature",
    id: el.id,
    geometry: { type: "Polygon", coordinates: [ring] },
    properties: {
      id: el.id,
      street: el.tags["addr:street"] || "",
      hnr: el.tags["addr:housenumber"] || "",
      plz: el.tags["addr:postcode"] || "",
      btype: type,
      c: centroid(ring),
    },
  });
}

const fc = {
  type: "FeatureCollection",
  meta: {
    region: "Bonn-Bad Godesberg",
    source: "OpenStreetMap via Overpass API",
    license: "ODbL 1.0 — © OpenStreetMap-Mitwirkende",
    osm_timestamp: data.osm3s?.timestamp_osm_base,
    generated_at: new Date().toISOString(),
    count: features.length,
  },
  features,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(fc));
console.log(`Geschrieben: ${OUT_FILE}`);
console.log(`Gebäude in Zählbasis: ${features.length} (ausgeschlossene Nebengebäude: ${excluded}, verworfen: ${degenerate})`);
