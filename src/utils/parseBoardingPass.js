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
    .replace(/[ ­]/g, ' ')  // non-breaking space + soft hyphen → regular space
    .replace(/[ \t]+/g, ' ')
    .replace(/\bAl(\d)/g, 'AI$1')  // OCR misread: lowercase l → I  (e.g. "Al1851" → "AI1851")
    .toUpperCase();
}

function extractFlightNumber(text) {
  const prefixPattern = AIRLINE_PREFIXES.join('|');

  // Step 1 — labelled context: any ticket that has an explicit "Flight / Flt" label
  // before the code works here — IRCTC, Balmer Lawrie, MMT, Cleartrip, EaseMyTrip, etc.
  // Label variants handled: "Flight", "Flt", "Flight No", "Flight No.", "Flight Number",
  // "Flight #", "Flt No", "Flt No.", "Flt Number".
  // Separator variants: colon, dot, space, or newline (OCR sometimes breaks label & value).
  const labelRe = new RegExp(
    `(?:FLIGHT|FLT)\\.?\\s*(?:NO\\.?|NUMBER|#)?\\s*[:.\\s]\\s*(${prefixPattern})[\\s\\-]?(\\d{3,4})(?!\\d)`,
    'i',
  );
  const labelMatch = text.match(labelRe);
  if (labelMatch) return `${labelMatch[1].toUpperCase()} ${labelMatch[2]}`;

  // Step 2 — unlabelled context: boarding passes (IndiGo, Air India, Vistara, SpiceJet,
  // Akasa, GoFirst…) print the code in a dedicated box with no label.
  // (?<![A-Z]) blocks mid-word matches like "INDIA" where a letter precedes the code.
  // Digits before the code are allowed — OCR often merges a preceding number (e.g. FFN
  // "218032881AI1851") with no space. Transaction IDs are already rejected because they
  // have 5+ digits after the prefix, which fails the \d{3,4}(?!\d) constraint.
  const bareRe = new RegExp(`(?<![A-Z])(${prefixPattern})[\\s\\-]?(\\d{3,4})(?!\\d)`, 'g');
  const bareMatch = bareRe.exec(text);
  if (bareMatch) return `${bareMatch[1]} ${bareMatch[2]}`;

  // Step 3 — OCR misread fallback: on small-font tickets OCR frequently reads the
  // capital letter I as digit 1, turning "AI-633" into "A1-633". toUpperCase() can't
  // fix this because "1" is already a digit, so we catch it explicitly here.
  const a1Match = text.match(/(?<![A-Z])A1[\s\-]?(\d{3,4})(?!\d)/);
  if (a1Match) return `AI ${a1Match[1]}`;

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
  function fmtTime(h, m) {
    const hh = parseInt(h, 10), mm = parseInt(m, 10);
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59)
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    return null;
  }

  // Step 1: departure-related labels — works for any format that labels the field.
  // Labels covered: STD, ETD, DEP, DEPT, DEPARTURE, DEPARTURE TIME, DEPARTS, SCHEDULED.
  // \s*[:\s]\s*\n?\s* allows the time to appear on the NEXT LINE after the label —
  // OCR on table-based tickets (IRCTC, Balmer Lawrie, OTA e-tickets) frequently splits
  // the column header and its value onto separate lines.
  const depRe = /(?:STD|ETD|DEPT?(?:ARTURE)?(?:\s*TIME)?|DEPARTS?|SCHED(?:ULED)?(?:\s*DEP(?:ARTURE)?)?)\s*[:\s]\s*\n?\s*[^\d\n]{0,15}(\d{1,2}):?(\d{2})(?!\d)/;
  const depMatch = text.match(depRe);
  if (depMatch) {
    const t = fmtTime(depMatch[1], depMatch[2]);
    if (t) return t;
  }

  // Step 2: boarding time (lower priority — it's always earlier than departure).
  // "BOARDING" alone is enough; "BOARDING TIME" is also caught.
  const boardRe = /BOARDING\s*(?:TIME)?\s*[:\s]\s*\n?\s*[^\d\n]{0,15}(\d{1,2}):?(\d{2})(?!\d)/;
  const boardMatch = text.match(boardRe);
  if (boardMatch) {
    const t = fmtTime(boardMatch[1], boardMatch[2]);
    if (t) return t;
  }

  // Step 3: fallback — scan every HH:MM in the text and return the first plausible one.
  // Colon is required here: without it, "2026" would match as 20:26, "633" as 6:33, etc.
  // Skip times that immediately follow a date — those are booking/transaction timestamps.
  const all = [...text.matchAll(/\b(\d{1,2}):(\d{2})\b/g)];
  for (const match of all) {
    const t = fmtTime(match[1], match[2]);
    if (!t) continue;
    const before = text.substring(Math.max(0, match.index - 15), match.index);
    if (/\d{2,4}[-\/]\d{2}[-\/]\d{2,4},?\s*$/.test(before)) continue;
    return t;
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
  // Only accept results that are known city names — prevents "Www" (FROM WWW.airindia.com)
  // and "Moca" (TO MOCA'S Passenger Charter) from leaking in as city names.
  const fromMatch = text.match(/(?:FROM|ORIGIN|DEPARTS?)[:\s]+([A-Z]{3,})/);
  const toMatch = text.match(/(?:TO|DEST(?:INATION)?|ARRIVES?)[:\s]+([A-Z]{3,})/);
  if (fromMatch && toMatch) {
    const fromCity = IATA_TO_CITY[fromMatch[1]] || fromMatch[1].charAt(0) + fromMatch[1].slice(1).toLowerCase();
    const toCity = IATA_TO_CITY[toMatch[1]] || toMatch[1].charAt(0) + toMatch[1].slice(1).toLowerCase();
    const knownCities = new Set([
      ...CITY_NAMES,
      ...Object.values(IATA_TO_CITY).map(c => c.toLowerCase()),
    ]);
    if (knownCities.has(fromCity.toLowerCase()) && knownCities.has(toCity.toLowerCase())) {
      return {from: fromCity, to: toCity};
    }
  }

  return {from: null, to: null};
}

function extractArrivalDeparture(text) {
  if (/\bARRIVAL\b/.test(text)) return 'ARRIVAL';
  return 'DEPARTURE'; // boarding passes are departure by default
}

function extractTerminalNumber(text) {
  // Matches "Terminal: 2", "Terminal 2", "Terminal-2", "TERMINAL 1" etc.
  const m = text.match(/\bTERMINAL\s*[:\-]?\s*(\d+)/i);
  return m ? m[1] : null;
}

function extractPassengerCount(text) {
  // Signal 1 — IndiGo/SpiceJet web boarding passes:
  // Each passenger stub: LASTNAME/FIRSTNAME followed by a salutation.
  // pdf-parse sometimes merges the salutation with the next word (e.g. "MADHUK/ARTI MSMUMBAI")
  // so no trailing \b — LASTNAME/FIRSTNAME + space + salutation token is sufficient.
  // Salutations ordered longest-first to prevent MR matching inside MRS.
  const nameSet = new Set();
  for (const m of text.matchAll(/\b([A-Z]+\/[A-Z]+)\s+(?:MRS|MISS|DR|MR|MS)/g)) {
    nameSet.add(m[1]);
  }
  // OCR misread: "/" read as space → "LASTNAME/FIRSTNAME MR" → "LASTNAME FIRSTNAME MR"
  // Both parts need 4+ chars to exclude 3-char airport codes (BOM, DEL, AMD, etc.)
  if (nameSet.size < 2) {
    for (const m of text.matchAll(/\b([A-Z]{4,})[^\S\n]+([A-Z]{4,})[^\S\n]+(?:MRS|MISS|DR|MR|MS)/g)) {
      nameSet.add(m[1] + '/' + m[2]);
    }
  }
  if (nameSet.size >= 2) return nameSet.size;

  // Signal 2 — IndiGo itinerary PDFs (e.g. W8MC5M):
  // Each passenger gets their own printed page starting with "Passenger Information".
  // Stop before T&C section where "passenger" appears many times.
  const termsIdx = text.search(/\bTERMS\s*(?:&|AND)\s*CONDITIONS\b/);
  const body = termsIdx > -1 ? text.substring(0, termsIdx) : text;
  const paxSections = [...body.matchAll(/\bPASSENGER\s+INFORMATION\b/g)];
  if (paxSections.length >= 2) return paxSections.length;

  // Signal 3 — GDS / OTA e-tickets (Balmer Lawrie, IRCTC, MakeMyTrip, etc.):
  // Traveller table rows: pdf-parse merges the Type column directly onto the name
  // (e.g. "MR SUBHAKANTA SAHUADTBOM-IXR..."). Count distinct title+name combos;
  // Set deduplicates if the ticket content is printed twice (Balmer Lawrie PDFs).
  const paxTitles = new Set();
  for (const m of text.matchAll(/\b(MRS?|MS|MISS|DR)\s+([A-Z][A-Z ]+?)(?=ADT|CHD|INF)/g)) {
    paxTitles.add(m[1] + ' ' + m[2].trim());
  }
  if (paxTitles.size >= 2) return paxTitles.size;

  // Signal 4 — camera-scan fallback for "MR FIRSTNAME LASTNAME" format (no slash):
  // Physical boarding passes, Air India e-tickets, and other formats that print names
  // as "MR JOHN SMITH" rather than "SMITH/JOHN MR".
  // [^\S\n]+ (space/tab only, no newline) keeps each match on a single line so that
  // "MS DHANSHREE DAMLE\nMANAGE BOOKING" doesn't produce two different entries.
  // Same name repeated across the pass deduplicates to 1 → single-passenger stays 1.
  // First word allows a single-letter initial (e.g. "MR N JAYASANKAR").
  // Last word requires 3+ letters to avoid matching stray abbreviations.
  // [^\S\n]+ keeps each match on one line so trailing footer words don't bleed in.
  const plainNames = new Set();
  for (const m of text.matchAll(/\b(MRS?|MS|MISS|DR)[^\S\n]+([A-Z]+[^\S\n]+(?:[A-Z]{2,}[^\S\n]+){0,2}[A-Z]{3,})/g)) {
    plainNames.add(m[1] + ' ' + m[2].trim());
  }
  if (plainNames.size >= 2) return plainNames.size;

  return 1;
}

// Scans text for adjacent city-name pairs that appear within windowSize chars of each other.
// Returns an ordered array of {from, to} pairs — index 0 = first route, 1 = second route, etc.
// Used to recover city pairs from the pre-flight header block on table-format e-tickets
// (Air India, IRCTC) where each row lists the route before the flight number column.
function findNearbyPairs(text, windowSize = 150) {
  const lower = text.toLowerCase();
  const occ = [];

  for (const name of CITY_NAMES) {
    let start = 0, idx;
    while ((idx = lower.indexOf(name, start)) !== -1) {
      const canonical = CITY_ALIAS[name] || (name.charAt(0).toUpperCase() + name.slice(1));
      occ.push({city: canonical, idx, end: idx + name.length});
      start = idx + name.length;
    }
  }
  // Also scan CITY_ALIAS keys (multi-word airport name fragments like "indira gandhi")
  for (const [alias, canonical] of Object.entries(CITY_ALIAS)) {
    let start = 0, idx;
    while ((idx = lower.indexOf(alias, start)) !== -1) {
      occ.push({city: canonical, idx, end: idx + alias.length});
      start = idx + alias.length;
    }
  }

  occ.sort((a, b) => a.idx - b.idx);

  // Dedup: if two entries map to the same city and are within 30 chars of each other
  // (e.g. "MUMBAI" at pos 0 and "CHHATRAPATI" at pos 7 both → Mumbai) keep only the first.
  // Without this, a pair like {Mumbai, Delhi} would be emitted twice before {Delhi, Mumbai}.
  const deduped = [];
  for (const entry of occ) {
    const last = deduped[deduped.length - 1];
    if (last && last.city === entry.city && entry.idx - last.end < 30) continue;
    deduped.push(entry);
  }

  const pairs = [];
  const usedIdx = new Set();
  for (let i = 0; i < deduped.length; i++) {
    if (usedIdx.has(i)) continue;
    const o1 = deduped[i];
    for (let j = i + 1; j < deduped.length; j++) {
      if (usedIdx.has(j)) continue;
      const o2 = deduped[j];
      if (o2.idx - o1.end > windowSize) break;
      if (o1.city !== o2.city) {
        pairs.push({from: o1.city, to: o2.city});
        usedIdx.add(i);
        usedIdx.add(j);
        break;
      }
    }
  }
  return pairs;
}

function parseSegment(text) {
  return {
    flightNo: extractFlightNumber(text),
    date: extractDate(text),
    flightTime: extractTime(text),
    ...extractCities(text),
    arrivalDeparture: extractArrivalDeparture(text),
    terminal: extractTerminalNumber(text),
    noOfPassengers: extractPassengerCount(text),
  };
}

/**
 * Parses OCR text and returns ALL flight segments found (e.g. round-trip or
 * connecting-flight e-tickets contain 2+ rows). Always returns at least one item.
 * The scan screen uses this so it can show a flight picker when count > 1.
 *
 * Key insight: many e-ticket formats (Air India, IRCTC) place city names BEFORE
 * the flight number in the OCR stream, while times appear AFTER it. We therefore
 * use two separate chunks per segment:
 *   citiesChunk — text from the previous flight's end up to this flight's start
 *   timesChunk  — text from this flight's end up to the next flight's start
 */
export function parseAllFlights(rawOcrText) {
  const text = normalizeText(rawOcrText);
  const prefixPattern = [...AIRLINE_PREFIXES, 'A1'].join('|');

  // Find every flight-number occurrence in the full text.
  // A1 is included so OCR misreads of "AI" (I→1) are also detected.
  const flightRe = new RegExp(
    `(?<![A-Z])(${prefixPattern})[\\s\\-]?(\\d{3,4})(?!\\d)`,
    'g',
  );
  const allMatches = [...text.matchAll(flightRe)];

  // Deduplicate: boarding passes often repeat the same flight code in stubs,
  // footers, or barcodes. Keep only the FIRST occurrence of each flight number.
  const unique = [];
  const seenFlights = new Set();
  for (const m of allMatches) {
    const prefix = m[1] === 'A1' ? 'AI' : m[1];
    const flightNo = `${prefix} ${m[2]}`;
    if (seenFlights.has(flightNo)) continue;
    seenFlights.add(flightNo);
    unique.push({flightNo, pos: m.index, end: m.index + m[0].length});
  }

  // Nothing found — parse the whole text as one segment.
  if (unique.length === 0) return [parseSegment(text)];

  // Exactly one flight found — use before/after chunks so cities and times come
  // from the correct side of the flight number (same strategy as multi-segment).
  if (unique.length === 1) {
    const {flightNo, pos, end} = unique[0];
    const citiesChunk = text.substring(0, pos);
    const timesChunk  = text.substring(end);
    const cities = extractCities(citiesChunk);
    const finalCities = (cities.from && cities.to) ? cities : extractCities(text);
    return [{
      flightNo,
      date:             extractDate(timesChunk) ?? extractDate(text),
      flightTime:       extractTime(timesChunk),
      ...finalCities,
      arrivalDeparture: extractArrivalDeparture(text),
      terminal:         extractTerminalNumber(citiesChunk) ?? extractTerminalNumber(timesChunk),
      noOfPassengers:   extractPassengerCount(text),
    }];
  }

  // Table-format fallback: some e-tickets (Air India, IRCTC) list ALL flight numbers
  // together, then ALL departure times together (separate OCR columns).
  // Collect times/dates in order from the section after the last flight number,
  // stopping before the ARRIVAL column (which holds arrival times we don't want).
  const afterAll  = text.substring(unique[unique.length - 1].end);
  const arrIdx    = afterAll.search(/\bARRIVAL\b/);
  const depSection = arrIdx > -1 ? afterAll.substring(0, arrIdx) : afterAll;

  const tableTimes = [];
  for (const m of depSection.matchAll(/\b(\d{1,2}):(\d{2})\b/g)) {
    const h = parseInt(m[1], 10), mn = parseInt(m[2], 10);
    if (h >= 0 && h <= 23 && mn >= 0 && mn <= 59)
      tableTimes.push(`${String(h).padStart(2, '0')}:${String(mn).padStart(2, '0')}`);
  }

  const tableDates = [];
  const tdRe = /\b(\d{1,2})[\s\-]*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[\s\-]*(\d{2,4})\b/g;
  for (const m of depSection.matchAll(tdRe)) {
    let yr = m[3];
    if (yr.length === 2) yr = '20' + yr;
    tableDates.push(`${yr}-${MONTH_MAP[m[2]]}-${String(m[1]).padStart(2, '0')}`);
  }

  // Pre-compute city pairs from the header block that precedes all flight numbers.
  // On table-format e-tickets each row lists the route (e.g. MUMBAI ... DELHI) before
  // the flight-number column, so the pre-flight text holds all pairs in route order.
  const preFlight = text.substring(0, unique[0].pos);
  const cityPairs = findNearbyPairs(preFlight);

  // Multi-segment: per segment, cities come BEFORE the flight code and
  // dates/times come AFTER it. Use separate slices for each.
  return unique.map(({flightNo, pos, end}, i) => {
    const prevEnd   = i === 0 ? 0 : unique[i - 1].end;
    const nextStart = unique[i + 1]?.pos ?? text.length;

    const citiesChunk = text.substring(prevEnd, pos);
    const timesChunk  = text.substring(end, nextStart);

    const cities = extractCities(citiesChunk);
    const finalCities = (cities.from && cities.to)
      ? cities
      : (cityPairs[i] ?? {from: null, to: null});

    // Per-chunk extraction (works for standard boarding-pass format)
    let flightTime = extractTime(timesChunk);
    let date       = extractDate(timesChunk);

    // Table fallback: use sequentially collected times/dates when chunks are empty
    if (!flightTime && tableTimes.length >= unique.length) flightTime = tableTimes[i] ?? null;
    if (!date       && tableDates.length >= unique.length) date       = tableDates[i] ?? null;
    date = date ?? extractDate(text);

    const terminal = extractTerminalNumber(citiesChunk) ?? extractTerminalNumber(timesChunk);

    return {
      flightNo,
      date,
      flightTime,
      ...finalCities,
      arrivalDeparture: extractArrivalDeparture(citiesChunk + timesChunk),
      terminal,
      noOfPassengers:   extractPassengerCount(text),
    };
  });
}

/** Backward-compatible single-result parser used by CreateDuty prefill. */
export function parseBoardingPass(rawOcrText) {
  return parseAllFlights(rawOcrText)[0];
}
