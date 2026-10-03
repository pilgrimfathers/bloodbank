// Rebuilds shared/hospitals.ts from OpenStreetMap: every hospital and blood
// bank in Kerala, placed in its district by boundary, minus places that can't
// transfuse and OSM noise. Run with `node scripts/build-hospitals.mjs`, then
// review the diff before committing.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OVERPASS = 'https://overpass-api.de/api/interpreter';
const OUT = fileURLToPath(new URL('../shared/hospitals.ts', import.meta.url));
const KERALA = 'area["name"="Kerala"]["admin_level"="4"]->.k;';

const DISTRICTS = [
  'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha', 'Kottayam', 'Idukki', 'Ernakulam',
  'Thrissur', 'Palakkad', 'Malappuram', 'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod',
];

// A name must look like a hospital or blood bank...
const WANT = /hosp|hopital|medical college|medicity|medical cent(re|er)|medical mission|medical trust|institute of|\bchc\b|community health|blood|\bmims\b|\baster\b|kims|lisie|amrita|lakeshore|cancer|research cent/i;
// ...and not be a small facility that doesn't transfuse,
const SMALL = /primary health|family health|\bphc\b|\bfhc\b|sub ?cent(re|er)|\bsc\b|dispensary|laborator|\blab\b|scan|diagnostic|pharmac|medicals\b|nursing college|college of nursing|department|room$|ward$|clinic$|palliative|dental|\beye\b/i;
// a part of a hospital mapped separately,
const PART = /entrance|(?<!co-)\bop\b|\bopd\b|o\.p\.|\b(old|new|east|west|cancer|casuality|casualty) block\b|block, |wing\b|parking|\bgate\b|emergency (services|department|ward)|annex|building|proposed|under construction/i;
// a non-allopathic or veterinary hospital (OSM spellings vary a lot),
const ALT = /\bvet[ei]?[a-z]*nar|\bvetin|\bvetenary|\bveterinary|\bayur|\bpanchakarma|arya vaidya|vaidyar\b|\bmarma|homoeo|homeo|siddha|unani|naturo/i;
// or a name too generic to pick out without a place.
const GENERIC = /^(blood bank|blood storage cent(re|er))$|^(govt\.?|government)?\s*(taluk|district|general|w&c|women.*children|mission|community|cooperative|co-operative)?\s*(head ?quarters?)?\s*(hospital|health centre)$/i;

// Overpass turns queries away when busy (429/504), so retry with backoff.
async function overpass(query) {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(OVERPASS, {
      method: 'POST',
      headers: { 'User-Agent': 'bloodbank-kerala/1.0', Accept: 'application/json' },
      body: new URLSearchParams({ data: `[out:json][timeout:180];${KERALA}${query}` }),
    });
    if (response.ok) return (await response.json()).elements;
    if (attempt === 4 || ![429, 504].includes(response.status)) {
      throw new Error(`Overpass ${response.status}: ${await response.text()}`);
    }
    console.log(`Overpass busy (${response.status}), retrying...`);
    await new Promise(resolve => setTimeout(resolve, attempt * 20_000));
  }
}

// Even-odd ray cast over all outer boundary segments; they needn't be stitched into rings.
function inside(segments, lat, lon) {
  let hit = false;
  for (const [a, b] of segments) {
    if ((a.lat > lat) !== (b.lat > lat) && lon < ((b.lon - a.lon) * (lat - a.lat)) / (b.lat - a.lat) + a.lon) hit = !hit;
  }
  return hit;
}

function tidy(name) {
  let n = name.replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').replace(/\.(?=\S)/g, '. ').replace(/;.*/, '').trim();
  if (n === n.toLowerCase() || n === n.toUpperCase()) {
    n = n.toLowerCase().replace(/(^|[\s()\/-])[a-z]/g, c => c.toUpperCase()).replace(/\b(Chc|Kims|Mims)\b/g, m => m.toUpperCase());
  }
  return n;
}

// Collapses spelling variants of the same place, e.g. "CHC X" / "Community Health Center X".
const sameKey = name => name.toLowerCase()
  .replace(/\bchc\b/g, 'community health centre').replace(/center/g, 'centre').replace(/hopital/g, 'hospital')
  .replace(/[^a-z0-9]/g, '');

// One query at a time: Overpass rate-limits parallel requests.
const places = await overpass('(nwr["amenity"="hospital"](area.k);nwr["healthcare"="hospital"](area.k);nwr["healthcare"="blood_bank"](area.k);nwr["healthcare"="blood_donation"](area.k););out center tags;');
const boundaries = await overpass('rel["boundary"="administrative"]["admin_level"="5"](area.k);out geom;');

const districts = boundaries.map(relation => ({
  name: relation.tags.name,
  segments: relation.members
    .filter(member => member.type === 'way' && member.role !== 'inner' && member.geometry)
    .flatMap(member => member.geometry.slice(1).map((point, i) => [member.geometry[i], point])),
}));
const missing = DISTRICTS.filter(name => !districts.some(d => d.name === name));
if (missing.length) throw new Error(`No OSM boundary for: ${missing.join(', ')}`);

const byDistrict = Object.fromEntries(DISTRICTS.map(name => [name, new Map()]));
for (const place of places) {
  if (!place.tags?.name) continue;
  const name = tidy(place.tags.name);
  if (!WANT.test(name) || SMALL.test(name) || PART.test(name) || ALT.test(name) || GENERIC.test(name)) continue;
  const lat = place.lat ?? place.center?.lat;
  const lon = place.lon ?? place.center?.lon;
  const district = districts.find(d => inside(d.segments, lat, lon))?.name;
  if (!byDistrict[district]) continue;
  // Keep the fullest spelling among variants of one place.
  const names = byDistrict[district];
  const key = sameKey(name);
  const previous = names.get(key);
  if (!previous || (/\bCHC\b/.test(previous) && !/\bCHC\b/.test(name)) || name.length > previous.length) names.set(key, name);
}

const today = new Date().toISOString().slice(0, 10);
const body = DISTRICTS.map(district => {
  const names = [...byDistrict[district].values()].sort((a, b) => a.localeCompare(b));
  console.log(`${district}: ${names.length}`);
  return `  ${district}: [\n${names.map(name => `    ${JSON.stringify(name)},`).join('\n')}\n  ],`;
}).join('\n');

writeFileSync(OUT, `import type { KERALA_DISTRICTS } from './constants';

// Hospitals and blood banks per district, offered as suggestions on the
// request forms. Generated by scripts/build-hospitals.mjs from OpenStreetMap
// (© OpenStreetMap contributors, ODbL) on ${today}, keeping places that can
// transfuse: clinics, PHCs, family health centres and non-allopathic or
// veterinary hospitals are left out. Requesters can still type any name, so
// gaps here never block a request.
export const HOSPITALS: Record<(typeof KERALA_DISTRICTS)[number], readonly string[]> = {
${body}
};
`);
console.log(`Wrote ${OUT}`);
