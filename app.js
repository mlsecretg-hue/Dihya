/* Dihya: offline-first PWA for women-led rural cooperatives.
 * Pages: home, products (batches + signed QR passports), market (pooled lots, direct orders, payout split),
 * safety (heat-stress plan, transport check, check-in, ergonomics), tools (shared equipment).
 * Everything is stored locally (localStorage); the passport is self-contained in the QR link and signed with ECDSA P-256. */
'use strict';

const STORE_KEY = 'rabta.v2';
const LOCATIONS = {
  siliana: { name: 'Siliana', lat: 36.08, lon: 9.37 },
  sidibouzid: { name: 'Sidi Bouzid', lat: 35.04, lon: 9.48 },
  kairouan: { name: 'Kairouan', lat: 35.68, lon: 10.10 },
  kasserine: { name: 'Kasserine', lat: 35.17, lon: 8.83 },
  sfax: { name: 'Sfax', lat: 34.74, lon: 10.76 },
  jendouba: { name: 'Jendouba', lat: 36.50, lon: 8.78 }
};

let state = load();
let ui = { tab: 'home', view: 'coop', modal: null, weather: null, weatherLive: false, selected: new Set(), tamper: false };
ui.landing = !location.hash || location.hash === '#/welcome'; // first visit opens on the landing page

// ---------- storage ----------
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* private mode or blocked storage: fall back to seed */ }
  return seed();
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}
function uid(p) { return p + Math.random().toString(36).slice(2, 8).toUpperCase(); }
function today() { return new Date().toISOString().slice(0, 10); }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }

function seed() {
  const members = [
    { id: 'M1', name: 'Fatma', village: 'Bargou', craft: 'olive_oil', since: 2014 },
    { id: 'M2', name: 'Mabrouka', village: 'Bargou', craft: 'olive_oil', since: 2016 },
    { id: 'M3', name: 'Najet', village: 'Kesra', craft: 'essential_oil', since: 2012 },
    { id: 'M4', name: 'Saida', village: 'Kesra', craft: 'textile', since: 2011 },
    { id: 'M5', name: 'Hedia', village: 'Makthar', craft: 'agrofood', since: 2018 }
  ];
  const batches = [
    { id: 'B-OL01', type: 'olive_oil', memberId: 'M1', qty: 120, date: daysAgo(20), village: 'Bargou', steps: PRODUCTS.olive_oil.steps, quality: 'Acidity 0.4% (lab test)', status: 'listed', lotId: 'L-1' },
    { id: 'B-OL02', type: 'olive_oil', memberId: 'M2', qty: 80, date: daysAgo(18), village: 'Bargou', steps: PRODUCTS.olive_oil.steps, quality: 'Acidity 0.5% (lab test)', status: 'listed', lotId: 'L-1' },
    { id: 'B-OL03', type: 'olive_oil', memberId: 'M5', qty: 60, date: daysAgo(10), village: 'Makthar', steps: PRODUCTS.olive_oil.steps, quality: '', status: 'stock' },
    { id: 'B-EO01', type: 'essential_oil', memberId: 'M3', qty: 500, date: daysAgo(7), village: 'Kesra', steps: PRODUCTS.essential_oil.steps, quality: 'Rosmarinus officinalis, 1st fraction',
      still: { n: 31, maxT: 101.2, minutes: 150 }, status: 'stock' },
    { id: 'B-TX01', type: 'textile', memberId: 'M4', qty: 3, date: daysAgo(30), village: 'Kesra', steps: PRODUCTS.textile.steps, quality: '120 x 180 cm, natural wool dyes', status: 'stock' },
    { id: 'B-EO00', type: 'essential_oil', memberId: 'M3', qty: 300, date: daysAgo(160), village: 'Kesra', steps: PRODUCTS.essential_oil.steps, quality: 'Rosmarinus officinalis', status: 'sold', lotId: 'L-0' },
    { id: 'B-TX00', type: 'textile', memberId: 'M4', qty: 2, date: daysAgo(130), village: 'Kesra', steps: PRODUCTS.textile.steps, quality: '100 x 150 cm', status: 'sold', lotId: 'L-00' },
    { id: 'B-AF00', type: 'agrofood', memberId: 'M5', qty: 60, date: daysAgo(100), village: 'Makthar', steps: PRODUCTS.agrofood.steps, quality: 'Durum wheat', status: 'sold', lotId: 'L-000' },
    { id: 'B-AF01', type: 'agrofood', memberId: 'M5', qty: 40, date: daysAgo(4), village: 'Makthar', steps: PRODUCTS.agrofood.steps, quality: 'Durum wheat, no additives', status: 'stock' }
  ];
  const lots = [
    { id: 'L-1', type: 'olive_oil', batchIds: ['B-OL01', 'B-OL02'], price: 18, middleman: 11, created: daysAgo(15) },
    { id: 'L-0', type: 'essential_oil', batchIds: ['B-EO00'], price: 0.35, middleman: 0.15, created: daysAgo(155) },
    { id: 'L-00', type: 'textile', batchIds: ['B-TX00'], price: 320, middleman: 180, created: daysAgo(125) },
    { id: 'L-000', type: 'agrofood', batchIds: ['B-AF00'], price: 10, middleman: 6, created: daysAgo(95) }
  ];
  const orders = [
    { id: 'O-01', lotId: 'L-0', buyer: 'Cosmetics workshop, Sousse', qty: 300, status: 'delivered', date: daysAgo(150), pay: 'payBank', del: 'delCourier' },
    { id: 'O-02', lotId: 'L-00', buyer: 'Concept store, Sidi Bou Said', qty: 2, status: 'delivered', date: daysAgo(118), pay: 'payD17', del: 'delCourier' },
    { id: 'O-03', lotId: 'L-000', buyer: 'Organic shop, La Marsa', qty: 60, status: 'delivered', date: daysAgo(88), pay: 'payCash', del: 'delCoop' },
    { id: 'O-04', lotId: 'L-1', buyer: 'Guesthouse, Dougga', qty: 40, status: 'delivered', date: daysAgo(35), pay: 'payCash', del: 'delPickup' },
    { id: 'O-1', lotId: 'L-1', buyer: 'Épicerie fine, Tunis', qty: 60, status: 'delivered', date: daysAgo(9), pay: 'payFlouci', del: 'delCourier' },
    { id: 'O-2', lotId: 'L-1', buyer: 'Hotel restaurant, Hammamet', qty: 50, status: 'pending', date: daysAgo(1), pay: 'payBank', del: 'delCoop' }
  ];
  const tools = [
    { id: 'T1', icon: '🪮', name: { en: 'Electric olive comb (battery)', fr: 'Peigne électrique à olives', ar: 'مشط زيتون كهربائي' }, hoursSaved: 4, bookings: [{ date: daysAgo(3), memberId: 'M1' }, { date: daysAgo(2), memberId: 'M2' }] },
    { id: 'T2', icon: '🕸️', name: { en: 'Harvest nets (set of 6)', fr: 'Filets de récolte (6)', ar: 'شباك الجني (6)' }, hoursSaved: 2, bookings: [{ date: daysAgo(3), memberId: 'M1' }] },
    { id: 'T3', icon: '⚗️', name: { en: 'Stainless still + temperature sensor', fr: 'Alambic inox + capteur', ar: 'جهاز تقطير مع مستشعر' }, hoursSaved: 3, bookings: [{ date: daysAgo(7), memberId: 'M3' }] },
    { id: 'T4', icon: '🛒', name: { en: 'Wheeled crate trolley', fr: 'Chariot à caisses', ar: 'عربة صناديق' }, hoursSaved: 1, bookings: [] }
  ];
  return {
    lang: 'ar',
    onboarded: false, role: 'lead',
    coop: { name: 'GDAF Al Amal (demo)', region: 'Siliana', location: 'siliana', phone: '21600000000', lead: 'Fatma',
      story: { en: 'Twenty-three women from three villages of Siliana who pick, press, distil, weave and roll together, and sell under their own name.',
               fr: 'Vingt-trois femmes de trois villages de Siliana qui récoltent, pressent, distillent, tissent et roulent ensemble, et vendent sous leur propre nom.',
               ar: 'ثلاث وعشرون امرأة من ثلاث قرى في سليانة، يجنين ويعصرن ويقطّرن وينسجن ويفتلن معا، ويبعن باسمهن.' } },
    members, batches, lots, orders, tools,
    reviews: [
      { name: 'Sonia, Tunis', stars: 5, text: 'The passport QR convinced our customers. Excellent oil.', date: daysAgo(6) },
      { name: 'Karim, Hammamet', stars: 4, text: 'Great couscous, delivery took two days.', date: daysAgo(80) },
      { name: 'Atelier Sousse', stars: 5, text: 'Rosemary oil with its distillation log: exactly what we needed.', date: daysAgo(140) }
    ],
    stats: { passports: 7 },
    trips: [{ date: daysAgo(12), plate: '204 TU 1180', vtype: 'pickup', seats: 3, pax: 12, ok: false }, { date: daysAgo(11), plate: '187 TU 5521', vtype: 'minibus', seats: 9, pax: 8, ok: true }],
    checkins: [], activity: [{ t: Date.now() - 86400000, text: 'O-2: order received from Hotel restaurant, Hammamet' }]
  };
}

// ---------- helpers ----------
const t = (k) => (I18N[state.lang] && I18N[state.lang][k]) || I18N.en[k] || k;
const L = (obj) => obj[state.lang] || obj.en;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Display names in the reader's language. Proper names (people, villages, towns) keep their sound and are
// written in Arabic letters for Arabic; ordinary words are translated. What people type is stored as typed.
const NAMES = {
  'GDAF': { ar: 'مجمع التنمية الفلاحية النسائية' }, 'Al Amal': { ar: 'الأمل' }, '(demo)': { ar: '(تجريبي)', fr: '(démo)' },
  'Fatma': { ar: 'فاطمة' }, 'Mabrouka': { ar: 'مبروكة' }, 'Najet': { ar: 'نجاة' }, 'Saida': { ar: 'سعيدة' }, 'Hedia': { ar: 'هدية' },
  'Sonia': { ar: 'سنية' }, 'Karim': { ar: 'كريم' }, 'Demo': { ar: 'تجريبي', fr: 'Démo' },
  'Bargou': { ar: 'برقو' }, 'Kesra': { ar: 'كسرى' }, 'Makthar': { ar: 'مكثر' }, 'Siliana': { ar: 'سليانة' },
  'Sidi Bouzid': { ar: 'سيدي بوزيد' }, 'Kairouan': { ar: 'القيروان' }, 'Kasserine': { ar: 'القصرين' }, 'Sfax': { ar: 'صفاقس' },
  'Jendouba': { ar: 'جندوبة' }, 'Tunis': { ar: 'تونس' }, 'Hammamet': { ar: 'الحمامات' }, 'Sousse': { ar: 'سوسة' },
  'Atelier Sousse': { ar: 'ورشة سوسة', en: 'Sousse workshop' }, 'Atelier': { ar: 'ورشة', en: 'Workshop' }, 'Hotel restaurant': { ar: 'مطعم نزل', fr: 'Restaurant d\'hôtel' },
  'The passport QR convinced our customers. Excellent oil.': { ar: 'رمز جواز المنتوج أقنع حرفاءنا. زيت ممتاز.', fr: 'Le QR du passeport a convaincu nos clients. Huile excellente.' },
  'Great couscous, delivery took two days.': { ar: 'كسكسي رائع، التوصيل أخذ يومين.', fr: 'Excellent couscous, la livraison a pris deux jours.' },
  'Rosemary oil with its distillation log: exactly what we needed.': { ar: 'زيت إكليل مع سجل التقطير متاعو: بالضبط اللي نحتاجوه.', fr: 'Huile de romarin avec son journal de distillation : exactement ce qu\'il nous fallait.' },
  'order received from': { ar: 'طلبية وصلت من', fr: 'commande reçue de' }
};
let NAME_RE;
function buildNameRe() { NAME_RE = new RegExp(Object.keys(NAMES).sort((a, b) => b.length - a.length)
  .map((k) => (/^\w/.test(k) ? '\\b' : '') + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + (/\w$/.test(k) ? '\\b' : '')).join('|'), 'g'); }
// Names of women who signed up on this phone, so lists show them in the reader's script too.
function addName(lat, ar) { if (!lat || !ar) return; NAMES[lat] = { ar }; buildNameRe(); }
try { (JSON.parse(localStorage.getItem('dihya.accounts')) || []).forEach((u) => { if (u.nameLat && u.nameAr) NAMES[u.nameLat] = { ar: u.nameAr }; }); } catch (e) { /* storage blocked */ }
buildNameRe();
window.addName = addName;
const UNITS = { L: { ar: 'ل' }, mL: { ar: 'مل' }, kg: { ar: 'كغ' }, pcs: { ar: 'قطعة', fr: 'pièces' }, TND: { ar: 'د.ت' } };
const un = (u) => (UNITS[u] && UNITS[u][state.lang]) || u;
const nm = (s) => String(s ?? '').replace(NAME_RE, (m) => NAMES[m][state.lang] || m);
const fmt = (n, d = 0) => Number(n).toLocaleString(state.lang === 'ar' ? 'ar-TN' : state.lang === 'fr' ? 'fr-TN' : 'en-GB', { maximumFractionDigits: d, minimumFractionDigits: d });
const bdi = (s) => `<bdi>${s}</bdi>`;
const member = (id) => state.members.find((m) => m.id === id) || { name: '?' };
const lotBatches = (lot) => lot.batchIds.map((id) => state.batches.find((b) => b.id === id)).filter(Boolean);
const lotQty = (lot) => lotBatches(lot).reduce((s, b) => s + b.qty, 0);
const lotOrdered = (lot) => state.orders.filter((o) => o.lotId === lot.id).reduce((s, o) => s + o.qty, 0);
function log(text) { state.activity.unshift({ t: Date.now(), text }); state.activity = state.activity.slice(0, 30); }

function extraIncome() {
  return state.orders.filter((o) => o.status === 'delivered').reduce((s, o) => {
    const lot = state.lots.find((l) => l.id === o.lotId);
    return lot ? s + o.qty * (lot.price - lot.middleman) : s;
  }, 0);
}

// Payout split: each delivered order is shared between producers in proportion to the quantity each contributed to the lot.
function payouts(lot) {
  const delivered = state.orders.filter((o) => o.lotId === lot.id && o.status === 'delivered').reduce((s, o) => s + o.qty, 0);
  const total = lotQty(lot);
  const byMember = {};
  for (const b of lotBatches(lot)) {
    const share = total ? b.qty / total : 0;
    byMember[b.memberId] = (byMember[b.memberId] || 0) + share * delivered;
  }
  return Object.entries(byMember).map(([id, q]) => ({ name: member(id).name, qty: q, direct: q * lot.price, middleman: q * lot.middleman }));
}

// ---------- crypto: signed passports ----------
const enc = new TextEncoder();
function b64u(bytes) {
  let s = ''; bytes = new Uint8Array(bytes);
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64u(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function fingerprint(rawPub) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', rawPub));
  return Array.from(h.slice(0, 8)).map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase().match(/.{4}/g).join('-');
}
async function ensureKeys() {
  if (state.coop.priv && state.coop.pub) return;
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  state.coop.priv = await crypto.subtle.exportKey('jwk', kp.privateKey);
  const raw = await crypto.subtle.exportKey('raw', kp.publicKey);
  state.coop.pub = b64u(raw);
  state.coop.fp = await fingerprint(raw);
  save();
}
function passportPayload(b) {
  // Only the producer's first name is published, never phone numbers or exact plots.
  const p = { v: 1, id: b.id, t: b.type, q: b.qty, d: b.date, m: member(b.memberId).name, vl: b.village, c: state.coop.name, r: state.coop.region, s: b.steps, k: b.quality || '' };
  if (b.still) p.st = b.still;
  return p;
}
async function signBatch(b) {
  await ensureKeys();
  state.stats.passports = (state.stats.passports || 0) + 1; save();
  const key = await crypto.subtle.importKey('jwk', state.coop.priv, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const payload = b64u(enc.encode(JSON.stringify(passportPayload(b))));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(payload));
  return `${location.href.split('#')[0]}#/p/${payload}.${b64u(sig)}.${state.coop.pub}`;
}
async function verifyPassport(token) {
  const [payload, sig, pub] = token.split('.');
  const data = JSON.parse(new TextDecoder().decode(unb64u(payload)));
  const raw = unb64u(pub);
  const key = await crypto.subtle.importKey('raw', raw, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, unb64u(sig), enc.encode(payload));
  const fp = await fingerprint(raw);
  return { data, ok, fp, registered: fp === state.coop.fp };
}
function qrSvg(text) {
  const qr = qrcode(0, 'M'); qr.addData(text); qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
}

// ---------- heat stress ----------
// Simplified WBGT (Australian Bureau of Meteorology): WBGT = 0.567 Ta + 0.393 e + 3.94, e = vapour pressure in hPa.
// It assumes moderate sun and light wind; phase 2 replaces it with the Liljegren et al. (2008) model.
function wbgt(ta, rh) {
  const e = (rh / 100) * 6.105 * Math.exp((17.27 * ta) / (237.7 + ta));
  return 0.567 * ta + 0.393 * e + 3.94;
}
// Indicative thresholds for moderate work by acclimatised workers (after ISO 7243 reference values).
function riskLevel(w) { return w < 25 ? 0 : w < 28 ? 1 : w < 30 ? 2 : w < 32 ? 3 : 4; }
// Offline fallback: a typical clear day for the current month in central Tunisia (approximate monthly mean max temperatures).
const MONTH_TMAX = [16, 18, 21, 24, 29, 34, 37, 37, 32, 27, 21, 17];
function typicalDay() {
  const m = new Date().getMonth();
  const tmax = MONTH_TMAX[m], tmin = tmax - 12, rhMid = m >= 5 && m <= 8 ? 40 : 60;
  const hours = [];
  for (let h = 0; h < 24; h++) {
    const c = Math.cos(((h - 3) / 24) * 2 * Math.PI); // coolest near dawn, hottest mid-afternoon
    hours.push({ h, temp: (tmax + tmin) / 2 - ((tmax - tmin) / 2) * c, rh: rhMid + 20 * c });
  }
  return hours;
}
async function loadWeather() {
  if (ui.weatherLoading) return;
  ui.weatherLoading = true;
  const loc = LOCATIONS[state.coop.location] || LOCATIONS.siliana;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&hourly=temperature_2m,relative_humidity_2m&forecast_days=1&timezone=Africa%2FTunis`;
    const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(r.status);
    const j = await r.json();
    ui.weather = j.hourly.time.map((tm, i) => ({ h: new Date(tm).getHours(), temp: j.hourly.temperature_2m[i], rh: j.hourly.relative_humidity_2m[i] }));
    ui.weatherLive = true;
  } catch (e) {
    ui.weather = typicalDay(); ui.weatherLive = false;
  }
  ui.weatherLoading = false;
  render();
}
function heatPlan() {
  const hours = (ui.weather || typicalDay()).map((x) => ({ ...x, w: wbgt(x.temp, x.rh) })).map((x) => ({ ...x, r: riskLevel(x.w) }));
  const day = hours.filter((x) => x.h >= 5 && x.h <= 19);
  const maxR = Math.max(...day.map((x) => x.r));
  // best window: longest run of daylight hours at the lowest risk reached during the day
  const minR = Math.min(...day.map((x) => x.r));
  let best = null, cur = null;
  for (const x of day) {
    if (x.r === minR) { cur = cur ? { ...cur, end: x.h } : { start: x.h, end: x.h }; if (!best || cur.end - cur.start > best.end - best.start) best = cur; }
    else cur = null;
  }
  return { hours, maxR, best };
}

// ---------- voice ----------
// Choose the most natural installed voice: same dialect first (Edge offers "Microsoft Reem Online (Natural) - Arabic (Tunisia)"),
// then neural/online voices, then female voices, since the users are women and asked for a voice like theirs.
const FEMALE = /reem|zariyah|salma|hoda|laila|layla|amina|amal|mouna|fatima|sana|iman|zahra|female|woman|denise|vivienne|eloise|sonia|libby|jenny|aria|samantha|amelie|audrey/i;
function pickVoice(lang) {
  if (!('speechSynthesis' in window)) return null;
  const base = lang.slice(0, 2);
  const score = (v) => (v.lang === lang || v.lang.replace('_', '-') === lang ? 100 : v.lang.toLowerCase().startsWith(base) ? 50 : -1000)
    + (/natural|online|neural|premium|enhanced/i.test(v.name) ? 30 : 0) + (FEMALE.test(v.name) ? 10 : 0) + (/google/i.test(v.name) ? 5 : 0);
  const vs = speechSynthesis.getVoices().map((v) => [score(v), v]).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]);
  return vs.length ? vs[0][1] : null;
}
if ('speechSynthesis' in window) speechSynthesis.getVoices();
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = state.lang === 'ar' ? 'ar-TN' : state.lang === 'fr' ? 'fr-FR' : 'en-GB';
  u.rate = 0.9;
  const v = pickVoice(u.lang); if (v) u.voice = v;
  speechSynthesis.speak(u);
}
function readScreen() {
  const parts = Array.from(document.querySelectorAll('[data-say]')).map((el) => el.textContent.trim()).filter(Boolean);
  speak(parts.join('. '));
}
function dictate(target) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('Voice input is not supported on this browser.'); return; }
  const rec = new SR();
  rec.lang = state.lang === 'ar' ? 'ar-TN' : state.lang === 'fr' ? 'fr-FR' : 'en-GB';
  target.placeholder = t('listening');
  rec.onresult = (e) => { target.value = (target.value ? target.value + ' ' : '') + e.results[0][0].transcript; };
  rec.start();
}

// ---------- still sensor CSV ----------
// Accepts "seconds,temp_c[,pressure_kpa]" with or without a header row (format written by firmware/still_monitor.ino).
function parseStillCsv(text) {
  const rows = text.trim().split(/\r?\n/).map((l) => l.split(',').map((v) => parseFloat(v))).filter((r) => r.length >= 2 && !isNaN(r[0]) && !isNaN(r[1]));
  if (!rows.length) return null;
  const maxT = Math.max(...rows.map((r) => r[1]));
  const minutes = Math.round((rows[rows.length - 1][0] - rows[0][0]) / 60);
  return { n: rows.length, maxT: Math.round(maxT * 10) / 10, minutes };
}

// ---------- derived figures ----------
function deliveredOrders() { return state.orders.filter((o) => o.status === 'delivered'); }
function salesTotals() {
  let direct = 0, mid = 0;
  for (const o of deliveredOrders()) {
    const lot = state.lots.find((l) => l.id === o.lotId);
    if (lot) { direct += o.qty * lot.price; mid += o.qty * lot.middleman; }
  }
  return { direct, mid, gainPct: mid ? Math.round(((direct - mid) / mid) * 100) : 0 };
}
function womenPaid() {
  const ids = new Set();
  for (const o of deliveredOrders()) {
    const lot = state.lots.find((l) => l.id === o.lotId);
    if (lot) lotBatches(lot).forEach((b) => ids.add(b.memberId));
  }
  return ids.size;
}
function monthlySeries() {
  const now = new Date(), out = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleDateString(state.lang === 'ar' ? 'ar-TN' : state.lang, { month: 'short' }), direct: 0, mid: 0 });
  }
  for (const o of deliveredOrders()) {
    const lot = state.lots.find((l) => l.id === o.lotId);
    const m = out.find((x) => x.key === o.date.slice(0, 7));
    if (lot && m) { m.direct += o.qty * lot.price; m.mid += o.qty * lot.middleman; }
  }
  return out;
}
const avgRating = () => state.reviews.length ? state.reviews.reduce((s, r) => s + r.stars, 0) / state.reviews.length : 0;
const stars = (n) => '★★★★★'.slice(0, Math.round(n)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(n));
const hoursSaved = () => state.tools.reduce((s, tl) => s + tl.bookings.length * tl.hoursSaved, 0);
const waLink = (text) => `https://wa.me/${String(state.coop.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
const baseUrl = () => location.href.split('#')[0];

// ---------- rendering ----------
const app = () => document.getElementById('app');

function render() {
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
  // Animate only when the screen changes (route or tab), not on every small re-render.
  const viewKey = location.hash + '|' + ui.tab + '|' + ui.landing;
  if (viewKey !== ui.viewKey) {
    ui.viewKey = viewKey;
    requestAnimationFrame(() => { const el = app(); el.classList.remove('view-enter'); void el.offsetWidth; el.classList.add('view-enter'); });
  }
  if (location.hash === '#/welcome' || (ui.landing && !location.hash)) { renderLanding(); return; }
  const route = location.hash.match(/^#\/p\/(.+)$/);
  if (route) { renderPassport(route[1]); return; }
  if (location.hash === '#/shop') { renderShop(); return; }
  if (!currentUser()) { renderAuth(); return; }
  const tabs = [['home', '⌂'], ['products', '🫒'], ['market', '🤝'], ['safety', '⛑'], ['tools', '🛠']];
  app().innerHTML = `
    <header class="top">
      <div class="brand"><div><a class="brand-home" href="#/welcome" title="Dihya home"><strong>Dihya</strong></a><small data-say>${t('appTagline')}</small></div></div>
      <nav class="rail" aria-label="Sections">${tabs.map(([k]) => `<button class="${ui.tab === k ? 'on' : ''}" data-tab="${k}">${t('nav' + k[0].toUpperCase() + k.slice(1))}</button>`).join('')}</nav>
      <div class="top-actions">
        <button class="icon" data-act="listen" aria-label="${t('listen')}" title="${t('listen')}">🔊</button>
        ${langSelect()}
        <button class="icon avatar-btn" data-act="settings" aria-label="${at('account')}" title="${at('account')}">${userInitial()}</button>
      </div>
    </header>
    <div class="demo">${t('demoBanner')}</div>
    <main class="page">${({ home: viewHome, products: viewProducts, market: viewMarket, safety: viewSafety, tools: viewTools })[ui.tab]()}</main>
    <nav class="bottom">
      ${tabs.map(([k, ic]) => `<button class="${ui.tab === k ? 'on' : ''}" data-tab="${k}"><span aria-hidden="true">${ic}</span>${t('nav' + k[0].toUpperCase() + k.slice(1))}</button>`).join('')}
    </nav>
    ${ui.modal ? `<div class="modal" role="dialog" aria-modal="true"><div class="sheet">${ui.modal}</div></div>` : ''}`;
}
function langSelect() {
  const L3 = [['ar', 'ع', 'العربية'], ['fr', 'FR', 'Français'], ['en', 'EN', 'English']];
  const i = Math.max(0, L3.findIndex(([l]) => l === state.lang));
  return `<div class="lang-switch" role="radiogroup" aria-label="Language" style="--i:${i}"><span class="lang-pill" aria-hidden="true"></span>${L3.map(([l, short, full]) => `<button type="button" role="radio" data-act="setLang" data-lang="${l}" lang="${l}" aria-checked="${l === state.lang}" title="${full}">${short}</button>`).join('')}</div>`;
}

function onboardingModal() {
  return `<div class="onboard">
    
    <h2>${t('welcomeTitle')}</h2><p class="muted">${t('appTagline')}</p>
    <h3>${t('chooseLang')}</h3>
    <div class="seg wide">${['ar', 'fr', 'en'].map((l) => `<button class="${l === state.lang ? 'on' : ''}" data-act="obLang" data-l="${l}">${{ ar: 'العربية', fr: 'Français', en: 'English' }[l]}</button>`).join('')}</div>
    <h3>${t('iam')}</h3>
    <div class="roles">
      <button data-act="role" data-r="producer"><span>👩‍🌾</span>${t('roleProducer')}</button>
      <button data-act="role" data-r="lead"><span>🧭</span>${t('roleLead')}</button>
      <button data-act="role" data-r="buyer"><span>🛍</span>${t('roleBuyer')}</button>
    </div></div>`;
}
function settingsModal() {
  return `${accountBlock()}<h2>${t('settings')}</h2>
    <form data-form="settings" class="form">
      <label>${t('coopName')}<input name="name" value="${esc(state.coop.name)}" required></label>
      <div class="two"><label>${t('region')}<input name="region" value="${esc(state.coop.region)}"></label>
      <label>${t('leadName')}<input name="lead" value="${esc(state.coop.lead)}"></label></div>
      <label>${t('whatsapp')}<input name="phone" value="${esc(state.coop.phone)}" inputmode="tel" pattern="[0-9]{8,15}"></label>
      <div class="row-end"><button type="button" class="ghost" data-act="reset">↺ Reset demo</button><button type="button" data-act="closeModal">${t('cancel')}</button><button class="primary">${t('save')}</button></div>
    </form>`;
}

function impactChart() {
  const data = monthlySeries();
  const max = Math.max(1, ...data.map((d) => Math.max(d.direct, d.mid)));
  const W = 560, H = 180, pad = 28, bw = (W - pad * 2) / data.length;
  const y = (v) => H - 24 - (v / max) * (H - 48);
  return `<figure class="chart">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('impact')}">
      <line x1="${pad}" x2="${W - pad}" y1="${H - 24}" y2="${H - 24}" class="axis"/>
      ${data.map((d, i) => {
        const x = pad + i * bw + bw * 0.18, w = bw * 0.3;
        return `<rect class="s-mid" x="${x}" y="${y(d.mid)}" width="${w}" height="${H - 24 - y(d.mid)}" rx="3"><title>${d.label}: ${fmt(d.mid)} ${un('TND')}</title></rect>
          <rect class="s-direct" x="${x + w + 3}" y="${y(d.direct)}" width="${w}" height="${H - 24 - y(d.direct)}" rx="3"><title>${d.label}: ${fmt(d.direct)} ${un('TND')}</title></rect>
          <text x="${pad + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${esc(d.label)}</text>`;
      }).join('')}
    </svg>
    <figcaption><span class="key s-direct"></span>${t('directIncome')} <span class="key s-mid"></span>${t('viaMiddleman')} · ${un('TND')} · ${t('months')}</figcaption>
  </figure>`;
}

function viewHome() {
  const plan = heatPlan(), tot = salesTotals();
  const open = state.orders.filter((o) => o.status !== 'delivered').length;
  return `
    <section class="hero">
      <div>
        <p class="eyebrow">${esc(nm(state.coop.name))} · ${esc(nm(state.coop.region))}</p>
        <h1 data-say>${t('hello')}</h1>
        <p class="hero-big" data-say>${bdi('+' + fmt(tot.direct - tot.mid) + ' ' + un('TND'))}</p>
        <p class="muted" data-say>${t('extraIncome')} · ${bdi('+' + tot.gainPct + '%')}</p>
      </div>
      <div class="hero-actions">
        <button class="primary" data-act="newBatchGo">＋ ${t('newBatch')}</button>
        <a class="btn" href="#/shop">🛍 ${t('viewShop')}</a>
      </div>
    </section>
    <section class="stats">
      <div class="stat"><b>${bdi(fmt(womenPaid()))}</b><small>${t('womenPaid')}</small></div>
      <div class="stat"><b>${bdi(fmt(state.stats.passports || 0))}</b><small>${t('passportsIssued')}</small></div>
      <div class="stat"><b>${bdi(fmt(open))}</b><small>${t('openOrders')}</small></div>
      <div class="stat"><b>${bdi(fmt(state.trips.filter((x) => !x.ok).length))}</b><small>${t('unsafeRefused')}</small></div>
      <div class="stat"><b>${bdi(fmt(hoursSaved()) + ' h')}</b><small>${t('savedHours')}</small></div>
      <button class="stat risk r${plan.maxR}" data-tab="safety"><b data-say>${t('risk' + plan.maxR)}</b><small data-say>${t('heatToday')}</small></button>
    </section>
    <div class="grid2">
      <section class="card"><h2>${t('impact')}</h2>${impactChart()}</section>
      <section class="card"><h2>${t('recentActivity')}</h2>
        <ul class="list">${state.activity.slice(0, 6).map((a) => `<li><span dir="auto">${esc(nm(a.text))}</span><small>${new Date(a.t).toLocaleDateString()}</small></li>`).join('') || `<li>${t('noActivity')}</li>`}</ul>
      </section>
    </div>`;
}

function viewProducts() {
  const f = ui.filter || 'all', q = (ui.q || '').toLowerCase();
  const list = state.batches.filter((b) => (f === 'all' || b.type === f) &&
    (!q || [b.id, member(b.memberId).name, b.village, L(PRODUCTS[b.type])].join(' ').toLowerCase().includes(q)));
  return `
    <div class="row-between"><h1 data-say>${t('navProducts')}</h1><button class="primary" data-act="newBatch">＋ ${t('newBatch')}</button></div>
    <div class="toolbar">
      <div class="chips">${['all', ...Object.keys(PRODUCTS)].map((k) => `<button class="chip ${f === k ? 'on' : ''}" data-act="filter" data-f="${k}">${k === 'all' ? t('all') : PRODUCTS[k].icon + ' ' + esc(L(PRODUCTS[k]))}</button>`).join('')}</div>
      <input type="search" data-act="search" placeholder="${t('search')}" value="${esc(ui.q || '')}" aria-label="${t('search')}">
    </div>
    <div class="cards">
      ${list.map((b) => {
        const P = PRODUCTS[b.type];
        return `<article class="card product">
          <div class="card-h"><span class="pic" aria-hidden="true">${P.icon}</span><div><b>${esc(L(P))}</b><small>${esc(b.id)} · ${esc(nm(member(b.memberId).name))} · ${esc(nm(b.village))}</small></div><span class="pill s-${b.status}">${t(b.status)}</span></div>
          <div class="kv"><span>${t('quantity')}</span><b>${bdi(fmt(b.qty) + ' ' + un(P.unit))}</b></div>
          <div class="kv"><span>${t('date')}</span><b>${esc(b.date)}</b></div>
          ${b.still ? `<div class="kv"><span>${t('stillSummary')}</span><b>${t('maxTemp')} ${bdi(b.still.maxT + '°C')} · ${bdi(b.still.minutes)} ${t('minutes')}</b></div>` : ''}
          <button class="wide-btn" data-act="passport" data-id="${b.id}">▦ ${t('passport')}</button>
        </article>`;
      }).join('') || `<p>${t('noBatches')}</p>`}
    </div>`;
}

function batchForm(pre = {}) {
  return `<h2>${t('newBatch')}</h2>
    <form data-form="batch" class="form">
      <label>${t('product')}<select name="type">${Object.entries(PRODUCTS).map(([k, P]) => `<option value="${k}"${pre.type === k ? ' selected' : ''}>${P.icon} ${esc(L(P))}</option>`).join('')}</select></label>
      <label>${t('member')}<select name="memberId">${state.members.map((m) => `<option value="${m.id}">${esc(nm(m.name))} (${esc(nm(m.village))})</option>`).join('')}</select></label>
      <div class="two"><label>${t('quantity')}<input name="qty" type="number" min="1" step="any" required inputmode="decimal" value="${esc(pre.qty || '')}"></label>
      <label>${t('date')}<input name="date" type="date" value="${today()}" required></label></div>
      <label>${t('village')}<input name="village" required></label>
      <label>${t('quality')}<div class="with-btn"><input name="quality" id="qnote"><button type="button" data-act="dictate" aria-label="${t('voiceNote')}">🎤</button></div></label>
      <label>${t('stillLog')}<input name="still" type="file" accept=".csv,text/csv"></label>
      <div class="row-end"><button type="button" data-act="closeModal">${t('cancel')}</button><button class="primary">${t('save')}</button></div>
    </form>`;
}

async function passportModal(id) {
  const b = state.batches.find((x) => x.id === id);
  const url = await signBatch(b);
  const P = PRODUCTS[b.type];
  ui.modal = `<div class="label-print">
      <h2>${t('passportTitle')}</h2>
      <div class="label">
        <div class="qr">${qrSvg(url)}</div>
        <div class="label-text"><b>${P.icon} ${esc(L(P))}</b><span>${esc(nm(member(b.memberId).name))} · ${esc(nm(b.village))}</span><span>${esc(nm(state.coop.name))}</span><span class="mono">${esc(b.id)} · ${esc(b.date)}</span></div>
      </div>
      <p class="muted center">${t('scanHint')}</p>
      <p class="muted center mono">${t('keyFp')}: ${state.coop.fp}</p>
    </div>
    <div class="row-end no-print"><button data-act="copy" data-url="${esc(url)}">${t('copyLink')}</button>
    <button data-act="print">🖨 ${t('printLabel')}</button>
    <a class="btn" href="${esc(url)}" target="_blank" rel="noopener">${t('openPassport')}</a>
    <button class="primary" data-act="closeModal">${t('close')}</button></div>`;
  render();
}

function viewMarket() {
  return `
    <div class="row-between"><h1 data-say>${t('navMarket')}</h1><a class="btn" href="#/shop">🛍 ${t('viewShop')}</a></div>
    <section class="card">
      <h2>${t('priceBoard')}</h2>
      <table class="tbl board"><thead><tr><th>${t('product')}</th><th>${t('refMiddleman')}</th><th>${t('refDirect')}</th><th>${t('gap')}</th></tr></thead><tbody>
      ${Object.entries(PRODUCTS).map(([k, P]) => {
        const lots = state.lots.filter((l) => l.type === k);
        if (!lots.length) return '';
        const d = lots.reduce((s, l) => s + l.price, 0) / lots.length, m = lots.reduce((s, l) => s + l.middleman, 0) / lots.length;
        return `<tr><td>${P.icon} ${esc(L(P))}</td><td>${bdi(fmt(m, 2) + ' / ' + un(P.unit))}</td><td><b>${bdi(fmt(d, 2) + ' / ' + un(P.unit))}</b></td><td class="gain">${bdi('+' + Math.round((d - m) / m * 100) + '%')}</td></tr>`;
      }).join('')}</tbody></table>
    </section>
    <div class="grid2">
      <section class="card">
        <h2>${t('makeLot')}</h2><p class="muted">${t('selectBatches')}</p>
        <form data-form="lot" class="form">
          <div class="checks">${state.batches.filter((b) => b.status === 'stock').map((b) => `<label class="check"><input type="checkbox" name="b" value="${b.id}"> ${PRODUCTS[b.type].icon} ${esc(b.id)} · ${esc(nm(member(b.memberId).name))} · ${bdi(fmt(b.qty) + ' ' + un(PRODUCTS[b.type].unit))}</label>`).join('') || `<p>${t('noBatches')}</p>`}</div>
          <div class="two"><label>${t('lotPrice')}<input name="price" type="number" step="0.01" min="0" required></label>
          <label>${t('middlemanPrice')}<input name="middleman" type="number" step="0.01" min="0" required></label></div>
          <div class="row-end"><button class="primary">${t('createLot')}</button></div>
        </form>
      </section>
      <section>
        <h2>${t('pooledLots')}</h2>
        <div class="cards one">${state.lots.filter((l) => lotQty(l) - lotOrdered(l) > 0 || state.orders.some((o) => o.lotId === l.id && o.status !== 'delivered')).map(coopLotCard).join('') || `<p>${t('noLots')}</p>`}</div>
      </section>
    </div>`;
}

function coopLotCard(lot) {
  const P = PRODUCTS[lot.type];
  const avail = lotQty(lot) - lotOrdered(lot);
  return `<article class="card">
    <div class="card-h"><span class="pic">${P.icon}</span><div><b>${esc(L(P))}</b><small>${esc(lot.id)} · ${lotBatches(lot).map((b) => esc(nm(member(b.memberId).name))).join(', ')}</small></div></div>
    <div class="kv"><span>${t('lotPrice')}</span><b>${bdi(fmt(lot.price, 2) + ' / ' + un(P.unit))}</b></div>
    <div class="kv"><span>${t('middlemanPrice')}</span><b>${bdi(fmt(lot.middleman, 2))} → <span class="gain">${bdi('+' + fmt(lot.price - lot.middleman, 2))}</span></b></div>
    <div class="kv"><span>${t('available')}</span><b>${bdi(fmt(avail) + ' ' + un(P.unit))}</b></div>
    <details><summary>${t('payout')}</summary><table class="tbl"><tbody>${payouts(lot).map((p) => `<tr><td>${esc(nm(p.name))}</td><td>${bdi(fmt(p.qty, 1) + ' ' + un(P.unit))}</td><td>${bdi(fmt(p.direct) + ' ' + un('TND'))}</td><td class="gain">${bdi('+' + fmt(p.direct - p.middleman))}</td></tr>`).join('')}</tbody></table></details>
    <h3>${t('orders')}</h3>
    <ul class="list">${state.orders.filter((o) => o.lotId === lot.id).map((o) => `<li><span><bdi>${esc(o.buyer)}</bdi> · ${bdi(fmt(o.qty) + ' ' + un(P.unit))}<small class="block">${o.pay ? t(o.pay) : ''}${o.del ? ' · ' + t(o.del) : ''} · <i>${t(o.status)}</i></small></span>
      ${o.status === 'pending' ? `<button class="primary sm" data-act="confirmOrder" data-id="${o.id}">${t('confirm')}</button>` : o.status === 'confirmed' ? `<button class="primary sm" data-act="deliverOrder" data-id="${o.id}">${t('ship')}</button>` : '<span class="gain">✓</span>'}</li>`).join('')}</ul>
  </article>`;
}

function viewSafety() {
  if (!ui.weather) loadWeather();
  const plan = heatPlan();
  const nowH = new Date().getHours();
  const taskKey = ui.task || 'olive';
  return `
    <h1 data-say>${t('navSafety')}</h1>
    <section class="sos">
      <div><h2 data-say>🆘 ${t('sos')}</h2><p data-say>${t('sosHelp')}</p></div>
      <div class="sos-actions">
        <button class="danger" data-act="sos">${ui.sosMsg || t('sosSend')}</button>
        <a class="btn" href="tel:190">📞 ${t('call190')}</a><a class="btn" href="tel:198">📞 ${t('call198')}</a>
      </div>
    </section>
    <div class="grid2">
    <section class="card">
      <div class="row-between"><h2>${t('forecast')}</h2>
        <select data-act="loc" aria-label="${t('location')}" class="auto">${Object.entries(LOCATIONS).map(([k, l]) => `<option value="${k}" ${k === state.coop.location ? 'selected' : ''}>${esc(nm(l.name))}</option>`).join('')}</select></div>
      <p class="muted">${ui.weatherLive ? t('liveData') : t('offlineData')}</p>
      <div class="bars" role="img" aria-label="${t('forecast')}">
        ${plan.hours.filter((x) => x.h >= 5 && x.h <= 20).map((x) => `<div class="bar r${x.r} ${x.h === nowH ? 'now' : ''}" style="--v:${Math.max(8, Math.min(100, (x.w - 10) * 3.5))}%" title="${x.h}h · WBGT ${x.w.toFixed(1)}°C · ${x.temp.toFixed(1)}°C ${Math.round(x.rh)}%"><span>${x.h}</span></div>`).join('')}
      </div>
      <div class="kv"><span data-say>${t('bestWindow')}</span><b data-say>${plan.best ? bdi(`${plan.best.start}:00 – ${plan.best.end + 1}:00`) : '–'}</b></div>
      <div class="advice r${plan.maxR}"><b data-say>${t('risk' + plan.maxR)}</b> <span data-say>${t('plan' + plan.maxR)}</span></div>
    </section>
    <section class="card">
      <h2>${t('transport')}</h2>
      <form data-form="trip" class="form">
        <div class="two"><label>${t('plate')}<input name="plate" required placeholder="123 TU 4567"></label>
        <label>${t('vehicleType')}<select name="vtype"><option value="minibus">Minibus / louage</option><option value="car">Car</option><option value="pickup">Pickup (open bed)</option><option value="truck">Truck / tractor trailer</option></select></label></div>
        <div class="two"><label>${t('seats')}<input name="seats" type="number" min="1" required></label>
        <label>${t('passengers')}<input name="pax" type="number" min="1" required></label></div>
        <div class="row-end"><button class="primary">${t('checkTrip')}</button></div>
      </form>
      ${ui.tripMsg ? `<div class="advice ${ui.tripMsg.ok ? 'r0' : 'r4'}" data-say>${ui.tripMsg.ok ? t('tripOk') : t('tripBad')}</div>` : ''}
    </section>
    <section class="card">
      <h2>${t('checkin')}</h2><p class="muted">${t('symptoms')}</p>
      <div class="faces">${[['😀', 'good'], ['😐', 'tired'], ['🤕', 'pain'], ['🥵', 'heat']].map(([f, k]) => `<button data-act="checkin" data-k="${k}" aria-label="${k}">${f}</button>`).join('')}</div>
      ${state.checkins.length ? `<p class="muted">✓ ${state.checkins.length} · ${esc(state.checkins[0].date)}</p>` : ''}
    </section>
    <section class="card">
      <div class="row-between"><h2>${t('ergonomics')}</h2>
      <select data-act="task" aria-label="${t('task')}" class="auto">${Object.entries(TASKS).map(([k, T]) => `<option value="${k}" ${k === taskKey ? 'selected' : ''}>${esc(L(T))}</option>`).join('')}</select></div>
      <ol class="tips">${L(TASKS[taskKey].tips).map((x) => `<li data-say>${esc(x)}</li>`).join('')}</ol>
    </section>
    </div>`;
}

function nextDays(n) { return Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d.toISOString().slice(0, 10); }); }
function viewTools() {
  const days = nextDays(7), sel = ui.day || days[0];
  return `
    <div class="row-between"><h1 data-say>${t('sharedTools')}</h1><div class="stat inline"><b data-say>${bdi(fmt(hoursSaved()) + ' h')}</b><small data-say>${t('savedHours')}</small></div></div>
    <div class="chips days">${days.map((d) => `<button class="chip ${d === sel ? 'on' : ''}" data-act="day" data-d="${d}">${new Date(d + 'T12:00').toLocaleDateString(state.lang === 'ar' ? 'ar-TN' : state.lang, { weekday: 'short', day: 'numeric' })}</button>`).join('')}</div>
    <div class="cards">${state.tools.map((tl) => {
      const b = tl.bookings.find((x) => x.date === sel);
      return `<article class="card"><div class="card-h"><span class="pic">${tl.icon}</span><div><b>${esc(L(tl.name))}</b><small>${bdi('−' + tl.hoursSaved + ' h')} · ${tl.bookings.length}×</small></div></div>
        ${b ? `<div class="pill">${t('bookedBy')} ${esc(nm(member(b.memberId).name))}</div>` :
        `<form data-form="book" data-id="${tl.id}" data-d="${sel}" class="with-btn"><select name="memberId">${state.members.map((m) => `<option value="${m.id}">${esc(nm(m.name))}</option>`).join('')}</select><button class="primary">${t('book')}</button></form>`}
      </article>`;
    }).join('')}</div>`;
}

// ---------- public shop (inspired by maker storefronts and WhatsApp Business catalogs) ----------
function renderShop() {
  const lots = state.lots.filter((l) => lotQty(l) - lotOrdered(l) > 0);
  const shopUrl = baseUrl() + '#/shop';
  const r = avgRating();
  app().innerHTML = `
    <header class="top shop-top">
      <div class="brand"><div><strong>${esc(nm(state.coop.name))}</strong><small>${t('verifiedSeller')} · ${esc(nm(state.coop.region))}</small></div></div>
      <div class="top-actions"><button class="icon" data-act="listen" aria-label="${t('listen')}">🔊</button>${langSelect()}<a class="btn ghost" href="#">${t('backToApp')}</a></div>
    </header>
    <main class="page">
      <section class="hero shop-hero">
        <div>
          <p class="eyebrow">${t('women')} · ${bdi(state.members.length)} 👩</p>
          <h1 data-say>${t('story')}</h1>
          <p class="lead" data-say>${esc(L(state.coop.story))}</p>
          <p class="rating"><span class="stars">${stars(r)}</span> ${bdi(fmt(r, 1))} · ${bdi(state.reviews.length)} ${t('reviews').toLowerCase()}</p>
        </div>
        <div class="qr small">${qrSvg(shopUrl)}<small>${t('shareShop')}</small></div>
      </section>
      <h2>${t('ourProducts')}</h2>
      <div class="cards">${lots.map((lot) => {
        const P = PRODUCTS[lot.type], avail = lotQty(lot) - lotOrdered(lot);
        const makers = [...new Set(lotBatches(lot).map((b) => nm(member(b.memberId).name)))].join(', ');
        const msg = `Dihya · ${state.coop.name}\n${L(P)} (${lot.id})\n${t('quantity')}: \n${t('yourName')}: `;
        return `<article class="card product shop-card">
          <div class="shop-pic" aria-hidden="true">${P.icon}</div>
          <b class="title">${esc(L(P))}</b>
          <small class="muted">${esc(makers)} · ${lot.batchIds.map(esc).join(', ')}</small>
          <div class="price">${bdi(fmt(lot.price, 2) + ' ' + un('TND') + ' / ' + un(P.unit))}</div>
          <div class="pill ok">✓ ${t('traceable')} · ${bdi(fmt(avail) + ' ' + un(P.unit))} ${t('available')}</div>
          <details><summary>${t('orderHere')}</summary>
            <form data-form="order" data-lot="${lot.id}" class="form tight">
              <input name="buyer" placeholder="${t('buyerName')}" required>
              <div class="two"><input name="phone" placeholder="${t('phone')}" inputmode="tel" required><input name="qty" type="number" min="1" max="${avail}" placeholder="${t('orderQty')} (${un(P.unit)})" required></div>
              <div class="two"><select name="pay" aria-label="${t('payment')}">${['payCash', 'payD17', 'payFlouci', 'payBank'].map((k) => `<option value="${k}">${t(k)}</option>`).join('')}</select>
              <select name="del" aria-label="${t('delivery')}">${['delPickup', 'delCourier', 'delCoop'].map((k) => `<option value="${k}">${t(k)}</option>`).join('')}</select></div>
              <button class="primary">${t('placeOrder')}</button>
            </form></details>
          <a class="btn wa" href="${esc(waLink(msg))}" target="_blank" rel="noopener">🟢 ${t('orderWhatsapp')}</a>
        </article>`;
      }).join('') || `<p>${t('noLots')}</p>`}</div>
      ${ui.orderMsg ? `<div class="advice r0" role="status">${t('orderSent')}</div>` : ''}
      <h2>${t('makers')}</h2>
      <div class="makers">${state.members.map((m) => `<div class="maker"><span class="avatar" aria-hidden="true">${esc(nm(m.name)[0])}</span><b>${esc(nm(m.name))}</b><small>${PRODUCTS[m.craft] ? PRODUCTS[m.craft].icon + ' ' + esc(L(PRODUCTS[m.craft])) : ''}</small><small class="muted">${esc(nm(m.village))} · ${bdi(m.since || '')}</small></div>`).join('')}</div>
      <div class="grid2">
        <section><h2>${t('reviews')}</h2>
          <div class="cards one">${state.reviews.map((rv) => `<article class="card review"><div class="row-between"><b dir="auto">${esc(nm(rv.name))}</b><span class="stars">${stars(rv.stars)}</span></div><p dir="auto">${esc(nm(rv.text))}</p><small class="muted">${esc(rv.date)}</small></article>`).join('')}</div>
        </section>
        <section class="card"><h2>${t('leaveReview')}</h2>
          <form data-form="review" class="form">
            <input name="name" placeholder="${t('yourName')}" required>
            <div class="star-pick" role="radiogroup" aria-label="${t('rating')}">${[5, 4, 3, 2, 1].map((n) => `<input type="radio" id="st${n}" name="stars" value="${n}" ${n === 5 ? 'checked' : ''}><label for="st${n}" title="${n}">★</label>`).join('')}</div>
            <textarea name="text" rows="3" placeholder="${t('comment')}" required></textarea>
            <div class="row-end"><button class="primary">${t('send')}</button></div>
          </form></section>
      </div>
    </main>`;
}

async function renderPassport(token) {
  let res;
  try {
    if (ui.tamper) {
      const [p, s, k] = token.split('.');
      const d = JSON.parse(new TextDecoder().decode(unb64u(p))); d.q = d.q * 2;
      token = [b64u(enc.encode(JSON.stringify(d))), s, k].join('.');
    }
    res = await verifyPassport(token);
  } catch (e) { res = { ok: false, data: null }; }
  const d = res.data;
  const P = d && PRODUCTS[d.t];
  app().innerHTML = `<main class="page passport">
    <div class="seal ${res.ok ? 'ok' : 'bad'}" data-say>${res.ok ? '✓ ' + t('verified') : '✗ ' + t('notVerified')}</div>
    ${d && P ? `<section class="hero center-hero"><span class="pic big">${P.icon}</span><h1 data-say>${esc(L(P))}</h1>
      <p data-say>${t('producedBy')} <b>${bdi(esc(nm(d.m)))}</b> ${t('in')} ${bdi(esc(nm(d.vl)) + ', ' + esc(nm(d.r)))}</p>
      <p class="muted">${bdi(esc(nm(d.c)))} · ${t('women')}</p></section>
    <section class="card">
      <div class="kv"><span>ID</span><b class="mono">${esc(d.id)}</b></div>
      <div class="kv"><span>${t('quantity')}</span><b>${bdi(fmt(d.q) + ' ' + un(P.unit))}</b></div>
      <div class="kv"><span>${t('harvested')}</span><b>${esc(d.d)}</b></div>
      ${d.k ? `<div class="kv"><span>${t('quality')}</span><b>${esc(d.k)}</b></div>` : ''}
      ${d.st ? `<div class="kv"><span>${t('stillSummary')}</span><b>${t('maxTemp')} ${bdi(d.st.maxT + '°C')} · ${bdi(d.st.minutes)} ${t('minutes')} · ${bdi(d.st.n)} ${t('readings')}</b></div>` : ''}
      <h3>${t('steps')}</h3><ol class="timeline">${(d.s || []).map((s) => `<li>${esc(STEPS[s] ? L(STEPS[s]) : s)}</li>`).join('')}</ol>
      <p class="muted mono">${t('keyFp')}: ${res.fp}${res.registered ? ' · ' + t('registered') : ''}</p>
    </section>` : ''}
    <div class="row-end">
      <button data-act="tamper">${ui.tamper ? '↺' : '⚠ ' + t('simulateTamper')}</button>
      <button data-act="listen">🔊 ${t('listen')}</button>
      <a class="btn" href="#/shop">🛍 ${t('viewShop')}</a>
      <a class="btn primary" href="#">${t('back')}</a>
    </div></main>`;
}

// ---------- events ----------
document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-tab],[data-act]');
  if (!el || el.tagName === 'SELECT' || el.tagName === 'INPUT') return;
  if (el.dataset.tab) { if (location.hash) history.replaceState(null, '', baseUrl()); ui.tab = el.dataset.tab; ui.modal = null; render(); window.scrollTo(0, 0); return; }
  const act = el.dataset.act;
  if (act === 'setLang') { if (el.dataset.lang !== state.lang) { state.lang = el.dataset.lang; save(); render(); if (window.renderAssistant) renderAssistant(); } return; }
  if (act === 'enter') { ui.landing = false; if (location.hash) history.replaceState(null, '', baseUrl()); render(); window.scrollTo(0, 0); return; }
  if (act === 'listen') readScreen();
  else if (act === 'newBatch') { ui.modal = batchForm(); render(); }
  else if (act === 'newBatchGo') { ui.tab = 'products'; ui.modal = batchForm(); render(); }
  else if (act === 'closeModal') { ui.modal = null; render(); }
  else if (act === 'settings') { ui.modal = settingsModal(); render(); }
  else if (act === 'passport') await passportModal(el.dataset.id);
  else if (act === 'dictate') dictate(document.getElementById('qnote'));
  else if (act === 'print') window.print();
  else if (act === 'filter') { ui.filter = el.dataset.f; render(); }
  else if (act === 'day') { ui.day = el.dataset.d; render(); }
  else if (act === 'obLang') { state.lang = el.dataset.l; save(); ui.modal = onboardingModal(); render(); }
  else if (act === 'role') {
    state.role = el.dataset.r; state.onboarded = true; save(); ui.modal = null;
    if (state.role === 'buyer') location.hash = '#/shop';
    else { ui.tab = state.role === 'producer' ? 'products' : 'home'; render(); }
  }
  else if (act === 'copy') { try { await navigator.clipboard.writeText(el.dataset.url); el.textContent = '✓'; } catch (err) { prompt('URL', el.dataset.url); } }
  else if (act === 'tamper') { ui.tamper = !ui.tamper; render(); }
  else if (act === 'reset') { if (confirm('Reset demo data?')) { state = seed(); save(); ui = { tab: 'home', modal: null, weather: null }; render(); } }
  else if (act === 'sos') {
    const send = (pos) => {
      const where = pos ? `https://maps.google.com/?q=${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}` : '';
      log('SOS sent' + (where ? ' with location' : ''));
      save(); ui.sosMsg = null; render();
      window.open(waLink(`SOS · ${state.coop.name}: I need help. ${where}`), '_blank', 'noopener');
    };
    ui.sosMsg = t('locating'); render();
    if ('geolocation' in navigator) navigator.geolocation.getCurrentPosition(send, () => send(null), { timeout: 8000 });
    else send(null);
  }
  else if (act === 'confirmOrder' || act === 'deliverOrder') {
    const o = state.orders.find((x) => x.id === el.dataset.id);
    o.status = act === 'confirmOrder' ? 'confirmed' : 'delivered';
    if (o.status === 'delivered') o.date = today();
    log(`${o.id}: ${o.status} (${o.buyer})`);
    const lot = state.lots.find((l) => l.id === o.lotId);
    if (lot && lotOrdered(lot) >= lotQty(lot) && state.orders.filter((x) => x.lotId === lot.id).every((x) => x.status === 'delivered')) {
      lotBatches(lot).forEach((b) => { b.status = 'sold'; });
    }
    save(); render();
  } else if (act === 'checkin') {
    state.checkins.unshift({ date: today(), k: el.dataset.k });
    log(`Health check-in: ${el.dataset.k}`);
    save(); render();
    if (el.dataset.k === 'heat') speak(t('plan3'));
  }
});

document.addEventListener('change', (e) => {
  const act = e.target.dataset.act;
  if (act === 'lang') { state.lang = e.target.value; save(); render(); }
  else if (act === 'loc') { state.coop.location = e.target.value; save(); ui.weather = null; render(); }
  else if (act === 'task') { ui.task = e.target.value; render(); }
});
document.addEventListener('input', (e) => {
  if (e.target.dataset.act !== 'search') return;
  ui.q = e.target.value; render();
  const box = document.querySelector('[data-act=search]'); box.focus(); box.setSelectionRange(box.value.length, box.value.length);
});

document.addEventListener('submit', async (e) => {
  const f = e.target; const kind = f.dataset.form;
  if (!kind) return;
  e.preventDefault();
  const fd = new FormData(f);
  if (kind === 'batch') {
    const type = fd.get('type');
    const b = { id: uid('B-'), type, memberId: fd.get('memberId'), qty: parseFloat(fd.get('qty')), date: fd.get('date'), village: fd.get('village').trim(),
      steps: PRODUCTS[type].steps, quality: fd.get('quality').trim(), status: 'stock' };
    const file = fd.get('still');
    if (file && file.size) { const s = parseStillCsv(await file.text()); if (s) b.still = s; }
    state.batches.unshift(b);
    log(`${b.id}: ${L(PRODUCTS[type])} · ${b.qty} ${PRODUCTS[type].unit} · ${member(b.memberId).name}`);
    save(); ui.modal = null; await passportModal(b.id);
  } else if (kind === 'lot') {
    const ids = fd.getAll('b');
    const bs = ids.map((id) => state.batches.find((b) => b.id === id));
    if (!bs.length || new Set(bs.map((b) => b.type)).size !== 1) { alert(t('selectBatches')); return; }
    const lot = { id: uid('L-'), type: bs[0].type, batchIds: ids, price: parseFloat(fd.get('price')), middleman: parseFloat(fd.get('middleman')), created: today() };
    bs.forEach((b) => { b.status = 'listed'; b.lotId = lot.id; });
    state.lots.unshift(lot);
    log(`${lot.id}: ${ids.length} batches pooled`);
    save(); render();
  } else if (kind === 'order') {
    const lot = state.lots.find((l) => l.id === f.dataset.lot);
    const qty = parseFloat(fd.get('qty'));
    if (!(qty > 0) || qty > lotQty(lot) - lotOrdered(lot)) return;
    const o = { id: uid('O-'), lotId: lot.id, buyer: fd.get('buyer').trim(), phone: fd.get('phone').trim(), qty, status: 'pending', date: today(), pay: fd.get('pay'), del: fd.get('del') };
    state.orders.push(o);
    log(`${o.id}: order received from ${o.buyer}`);
    ui.orderMsg = true; save(); render();
  } else if (kind === 'review') {
    state.reviews.unshift({ name: fd.get('name').trim(), stars: +fd.get('stars'), text: fd.get('text').trim(), date: today() });
    save(); render();
  } else if (kind === 'settings') {
    Object.assign(state.coop, { name: fd.get('name').trim(), region: fd.get('region').trim(), lead: fd.get('lead').trim(), phone: fd.get('phone').replace(/\D/g, '') });
    save(); ui.modal = null; render();
  } else if (kind === 'trip') {
    const seats = +fd.get('seats'), pax = +fd.get('pax'), vtype = fd.get('vtype');
    const ok = pax <= seats && (vtype === 'minibus' || vtype === 'car');
    const trip = { date: today(), plate: fd.get('plate').trim(), vtype, seats, pax, ok };
    state.trips.unshift(trip);
    ui.tripMsg = { ok };
    log(`Trip ${trip.plate}: ${ok ? 'OK' : 'UNSAFE'} (${pax}/${seats}, ${vtype})`);
    save(); render(); speak(ok ? t('tripOk') : t('tripBad'));
    if (ok) window.open(waLink(`Dihya · ${t('transport')}: ${trip.plate}, ${pax}/${seats}, ${new Date().toLocaleTimeString()}`), '_blank', 'noopener');
  } else if (kind === 'book') {
    const tl = state.tools.find((x) => x.id === f.dataset.id);
    tl.bookings.push({ date: f.dataset.d, memberId: fd.get('memberId') });
    log(`${L(tl.name)} → ${member(fd.get('memberId')).name} (${f.dataset.d})`);
    save(); render();
  }
});

window.addEventListener('hashchange', () => { if (location.hash && location.hash !== '#/welcome') ui.landing = false; ui.tamper = false; ui.orderMsg = false; window.scrollTo(0, 0); render(); });
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
render();
