// Maps IATA airport codes to city names used in the duty form
const IATA_TO_CITY = {
  BOM: 'Mumbai',  BLR: 'Bangalore', DEL: 'Delhi',   MAA: 'Chennai',
  HYD: 'Hyderabad', CCU: 'Kolkata', PNQ: 'Pune',    AMD: 'Ahmedabad',
  JAI: 'Jaipur',  STV: 'Surat',    LKO: 'Lucknow', IXD: 'Agra',
  NAG: 'Nagpur',  IDR: 'Indore',   BHO: 'Bhopal',  PAT: 'Patna',
  BDQ: 'Vadodara', VNS: 'Varanasi', RPR: 'Raipur',  JDH: 'Jodhpur',
  UDR: 'Udaipur', GOI: 'Goa',      IXB: 'Siliguri', GAU: 'Guwahati',
  COK: 'Kochi',   TRV: 'Thiruvananthapuram', IXM: 'Madurai', IXC: 'Chandigarh',
  ATQ: 'Amritsar', SXR: 'Srinagar', IXR: 'Ranchi',  VGA: 'Vijayawada',
  CJB: 'Coimbatore', BBI: 'Bhubaneswar',
};

// All Indian city names used in the form (lowercase for matching)
const CITY_NAMES = [
  'mumbai', 'delhi', 'bangalore', 'bengaluru', 'chennai', 'hyderabad',
  'kolkata', 'calcutta', 'pune', 'ahmedabad', 'jaipur', 'surat', 'lucknow',
  'kanpur', 'nagpur', 'indore', 'bhopal', 'patna', 'vadodara', 'baroda',
  'ghaziabad', 'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut',
  'rajkot', 'varanasi', 'banaras', 'goa', 'kochi', 'cochin', 'chandigarh',
  'amritsar', 'srinagar', 'ranchi', 'guwahati', 'coimbatore', 'madurai',
  'bhubaneswar', 'raipur', 'siliguri', 'thiruvananthapuram',
];

// Map common alternate names to CITIES array values
const CITY_ALIAS = {
  bengaluru: 'Bangalore', calcutta: 'Kolkata', baroda: 'Vadodara',
  banaras: 'Varanasi', cochin: 'Kochi', 'new delhi': 'Delhi',
  'indira gandhi': 'Delhi', 'chhatrapati': 'Mumbai', 'chatrapati': 'Mumbai',
  'kempegowda': 'Bangalore', 'rajiv gandhi': 'Hyderabad',
  'netaji subhas': 'Kolkata', 'lok nayak': 'Patna',
};

const AIRLINE_PREFIXES = ['6E', 'AI', 'UK', 'SG', 'QP', 'G8', 'I5', 'IX', '9I', '2T'];

const MONTH_MAP = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

function normalizeText(raw) {
  return raw
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .toUpperCase();
}

function extractFlightNumber(text) {
  const prefixPattern = AIRLINE_PREFIXES.join('|');
  // Matches: "6E 2341", "6E-2341", "6E2341", "AI 302"
  const re = new RegExp(`\\b(${prefixPattern})[\\s\\-]?(\\d{3,4})\\b`, 'g');
  const match = re.exec(text);
  if (match) return `${match[1]} ${match[2]}`;
  return null;
}

function extractDate(text) {
  // "28 APR 2025" or "28APR25" or "28-APR-2025" or "28/04/2025" or "28-04-25"
  const patterns = [
    // 28 APR 2025 / 28APR2025 / 28-APR-2025 (dash or space separator)
    /\b(\d{1,2})[\s\-]*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[\s\-]*(\d{2,4})\b/,
    // APR 28 2025
    /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(\d{1,2})\s*(\d{2,4})/,
    // 28/04/2025 or 28-04-2025
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;

    let day, month, year;

    if (re === patterns[0]) {
      [, day, month, year] = m;
      month = MONTH_MAP[month];
    } else if (re === patterns[1]) {
      [, month, day, year] = m;
      month = MONTH_MAP[month];
    } else {
      [, day, month, year] = m;
    }

    if (year.length === 2) year = '20' + year;
    const d = String(day).padStart(2, '0');
    const mo = String(month).padStart(2, '0');
    return `${year}-${mo}-${d}`;
  }
  return null;
}

function extractTime(text) {
  // Priority 1: STD / DEP / DEPARTURE / DEPARTURE TIME / SCHEDULED
  // Use [^\d\n]{0,20} to avoid crossing line boundaries or consuming too much text.
  // Supports both "09:15" and "0915" (no-colon) formats via :? in the capture.
  const depRe = /(?:STD|DEP(?:ARTURE)?(?:\s*TIME)?|SCHED(?:ULED)?)[^\d\n]{0,20}(\d{1,2}):?(\d{2})/;
  const depMatch = text.match(depRe);
  if (depMatch) {
    const h = parseInt(depMatch[1], 10);
    const m = parseInt(depMatch[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  // Priority 2: BOARDING TIME (lower priority than departure labels)
  const boardingRe = /BOARDING\s*TIME[^\d\n]{0,20}(\d{1,2}):?(\d{2})/;
  const boardingMatch = text.match(boardingRe);
  if (boardingMatch) {
    const h = parseInt(boardingMatch[1], 10);
    const m = parseInt(boardingMatch[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  // Fallback: scan all HH:MM patterns, return the first plausible one.
  // E-tickets (IRCTC, Balmer Laurie) list departure before arrival in their tables.
  // Skip times that immediately follow a date (DD/MM/YYYY or YYYY-MM-DD) — those are
  // booking/transaction timestamps, not flight times.
  const all = [...text.matchAll(/\b(\d{1,2}):(\d{2})\b/g)];
  for (let i = 0; i < all.length; i++) {
    const h = parseInt(all[i][1], 10);
    const m = parseInt(all[i][2], 10);
    if (h < 0 || h > 23 || m < 0 || m > 59) continue;
    const before = text.substring(Math.max(0, all[i].index - 15), all[i].index);
    if (/\d{2,4}[-\/]\d{2}[-\/]\d{2,4},?\s*$/.test(before)) continue;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return null;
}

function extractCities(text) {
  // Step 1: try IATA codes (most reliable)
  const foundIATA = [];
  for (const [code, city] of Object.entries(IATA_TO_CITY)) {
    // Must be surrounded by word boundaries or spaces, not part of a longer word
    const re = new RegExp(`\\b${code}\\b`);
    if (re.test(text)) foundIATA.push({code, city, idx: text.indexOf(code)});
  }
  if (foundIATA.length >= 2) {
    foundIATA.sort((a, b) => a.idx - b.idx);
    return {from: foundIATA[0].city, to: foundIATA[1].city};
  }

  // Step 2: try city/airport name keywords
  const lower = text.toLowerCase();
  const found = [];
  for (const city of CITY_NAMES) {
    const idx = lower.indexOf(city);
    if (idx !== -1) {
      // Resolve alias to canonical form
      const canonical = CITY_ALIAS[city] || (city.charAt(0).toUpperCase() + city.slice(1));
      found.push({city: canonical, idx});
    }
  }

  if (found.length >= 2) {
    found.sort((a, b) => a.idx - b.idx);
    const seen = new Set();
    const unique = found.filter(f => {
      if (seen.has(f.city)) return false;
      seen.add(f.city);
      return true;
    });
    if (unique.length >= 2) {
      return {from: unique[0].city, to: unique[1].city};
    }
  }

  // Step 3: look for FROM/TO or ORIGIN/DESTINATION labels
  const fromMatch = text.match(/(?:FROM|ORIGIN|DEPARTS?)[:\s]+([A-Z]{3,})/);
  const toMatch = text.match(/(?:TO|DEST(?:INATION)?|ARRIVES?)[:\s]+([A-Z]{3,})/);
  if (fromMatch && toMatch) {
    const fromCity = IATA_TO_CITY[fromMatch[1]] || fromMatch[1].charAt(0) + fromMatch[1].slice(1).toLowerCase();
    const toCity = IATA_TO_CITY[toMatch[1]] || toMatch[1].charAt(0) + toMatch[1].slice(1).toLowerCase();
    return {from: fromCity, to: toCity};
  }

  return {from: null, to: null};
}

function extractArrivalDeparture(text) {
  if (/\bARRIVAL\b/.test(text)) return 'ARRIVAL';
  return 'DEPARTURE'; // boarding passes are departure by default
}

/**
 * Parses OCR text from a boarding pass into duty form fields.
 * Handles IndiGo (6E), Air India (AI), Vistara (UK), SpiceJet (SG), Akasa (QP), etc.
 */
export function parseBoardingPass(rawOcrText) {
  const text = normalizeText(rawOcrText);

  const flightNo = extractFlightNumber(text);
  const date = extractDate(text);
  const flightTime = extractTime(text);
  const {from, to} = extractCities(text);
  const arrivalDeparture = extractArrivalDeparture(text);

  return {flightNo, date, flightTime, from, to, arrivalDeparture};
}
