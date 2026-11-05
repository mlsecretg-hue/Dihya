/* Typed names in three languages.
 * When someone types a cooperative name, region, village or member name, each word is checked:
 * ordinary words are translated ("Person" -> شخص / Personne), anything else is treated as a proper name and only
 * changes script (Latin <-> Arabic letters). The three versions are saved with the data and shown through nm().
 * When Claude is reachable (inside claude.ai) it then refines the result, for example fixing Arabic word order. */
'use strict';

// en | fr | ar, plus extra spellings that mean the same word.
const WORDS = `person,persons|personne,personnes|شخص,أشخاص
people|gens|ناس
woman|femme|امرأة,مرا
women|femmes|نساء
girl,girls|fille,filles|بنات,بنت
mother|mère|أم
sister,sisters|sœur,soeur,sœurs,soeurs|أخت,خوات
family|famille|عائلة
friend,friends|amie,amies,ami,amis|صديقة,صحاب
cooperative,coop,co-op|coopérative,cooperative|تعاونية
group|groupement,groupe|مجمع
association|association|جمعية
union|union|اتحاد
development|développement,developpement|تنمية
agricultural,agriculture|agricole,agriculture|فلاحي,فلاحة
farm|ferme|ضيعة
farmer,farmers|agricultrice,agricultrices,agriculteur,agriculteurs|فلاحة,فلاحين
olive,olives|olive,olives|زيتون,زيتونة
oil|huile|زيت
hope|espoir|الأمل,أمل
light|lumière,lumiere|نور
star|étoile,etoile|نجمة
sun|soleil|شمس
moon|lune|قمر
flower,flowers|fleur,fleurs|وردة,ورود
rose|rose|وردة
jasmine|jasmin|ياسمين
spring|printemps|ربيع
future|avenir|المستقبل,مستقبل
unity|unité,unite|الوحدة,وحدة
solidarity|solidarité,solidarite|التضامن,تضامن
hand,hands|main,mains|يد,أيادي
house,home|maison|دار
village|village|قرية
mountain|montagne|جبل
valley|vallée,vallee|وادي
garden|jardin|جنينة
harvest|récolte,recolte|صابة
wheat|blé,ble|قمح
rosemary|romarin|إكليل
honey|miel|عسل
dates|dattes|تمر
fig,figs|figue,figues|كرموس,شريحة
almond,almonds|amande,amandes|لوز
water|eau|ماء
land,earth|terre|أرض
green|vert,verte|أخضر,خضراء
white|blanc,blanche|أبيض,بيضاء
blue|bleu,bleue|أزرق,زرقاء
gold|or|ذهب
golden|doré,dorée,doree|ذهبي,ذهبية
new|nouveau,nouvelle|جديد,جديدة
big,great|grand,grande|كبير,كبيرة
small|petit,petite|صغير,صغيرة
north|nord|الشمال
south|sud|الجنوب
east|est|الشرق
west|ouest|الغرب
center,centre|centre|الوسط
market|marché,marche|سوق
shop,store|boutique|متجر,حانوت
workshop|atelier|ورشة
test|test|تجربة
demo|démo,demo|تجريبي
and|et|و
of|de,du,des,d'|
the|le,la,les,l'|`;
const LEX = new Map();
WORDS.split('\n').forEach((line) => {
  const [en, fr, ar] = line.split('|').map((x) => x.split(',').map((w) => w.trim()).filter(Boolean));
  const entry = { en: en[0] || '', fr: fr[0] || '', ar: (ar || [])[0] || '', forms: { en: new Set(en.map((w) => w.toLowerCase())), fr: new Set(fr.map((w) => w.toLowerCase())), ar: new Set(ar || []) } };
  [...en, ...fr, ...(ar || [])].forEach((w) => { if (!LEX.has(w.toLowerCase())) LEX.set(w.toLowerCase(), entry); });
});

const cap = (w, like) => (like && like[0] && like[0] !== like[0].toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1) : w);

// One typed text -> { en, fr, ar }.
function localizeText(text) {
  const out = { en: [], fr: [], ar: [] };
  String(text).trim().split(/\s+/).forEach((raw) => {
    const m = raw.match(/^([("'«]*)(.*?)([)"'».,:;!?]*)$/u);
    const pre = m[1], word = m[2], post = m[3];
    if (!word) { ['en', 'fr', 'ar'].forEach((l) => out[l].push(raw)); return; }
    const hit = LEX.get(word.toLowerCase());
    if (hit) {
      // a word already in a language stays exactly as typed there
      ['en', 'fr'].forEach((l) => { const w = hit.forms[l].has(word.toLowerCase()) ? word : hit[l] && cap(hit[l], hasArabic(word) ? 'X' : word); if (w) out[l].push(pre + w + post); });
      const a = hit.forms.ar.has(word) ? word : hit.ar;
      if (a) out.ar.push(pre + a + post);
      return;
    }
    const known = NAMES[word];
    if (hasArabic(word)) {
      const back = Object.keys(NAMES).find((k) => NAMES[k].ar === word && !hasArabic(k));
      const lat = back || otherSpelling(word);
      out.en.push(pre + lat + post); out.fr.push(pre + lat + post); out.ar.push(raw);
    } else {
      out.en.push(raw); out.fr.push(raw); out.ar.push(pre + ((known && known.ar) || otherSpelling(word)) + post);
    }
  });
  return { en: out.en.join(' '), fr: out.fr.join(' '), ar: out.ar.join(' ').replace(/\( /g, '(').replace(/ \)/g, ')') };
}

// Texts the built-in name list already covers need nothing.
const covered = (s) => !String(s).replace(NAME_RE, '').replace(/[\s\d()·,.\-'"]/g, '');

function typedTexts() {
  const c = state.coop;
  return [c.name, c.region, c.lead, ...state.members.flatMap((m) => [m.name, m.village]), ...state.batches.map((b) => b.village)]
    .map((s) => String(s || '').trim()).filter(Boolean);
}

function registerTyped(key, v) { NAMES[key] = { en: v.en, fr: v.fr, ar: v.ar }; }

// Give every typed text its three versions; returns the texts that were new.
function localizeState() {
  state.names = state.names || {};
  const fresh = [];
  for (const s of new Set(typedTexts())) {
    if (state.names[s]) continue;
    if (covered(s)) continue;
    state.names[s] = { ...localizeText(s), by: 'words' };
    fresh.push(s);
  }
  Object.entries(state.names).forEach(([k, v]) => registerTyped(k, v));
  buildNameRe();
  if (fresh.length) { save(); refineWithClaude(fresh); }
  return fresh;
}

// Inside claude.ai, ask Claude for natural translations of the new texts.
async function refineWithClaude(texts) {
  try {
    const s = typeof getSample === 'function' ? await getSample() : null;
    if (!s || !s.json) return;
    const prompt = `Translate each of these names typed into an app for women's farming cooperatives in rural Tunisia into English, French and Arabic.
Rules: translate ordinary words (e.g. "Person" -> "Personne" / "شخص"); keep proper names (people, villages, towns, brand names) and only write them in the other script (e.g. "Amel" -> "أمل", "Kesra" -> "كسرى"); use natural word order in each language; keep acronyms like GDAF as they are in English and French and write the full Arabic name if it is a known Tunisian acronym.
Return only JSON: an object whose keys are the exact input texts and whose values are {"en": "...", "fr": "...", "ar": "..."}.
Texts: ${JSON.stringify(texts)}`;
    const v = await s.json(prompt);
    let changed = false;
    for (const k of texts) {
      const r = v && v[k];
      if (r && r.en && r.fr && r.ar) { state.names[k] = { en: String(r.en), fr: String(r.fr), ar: String(r.ar), by: 'claude' }; registerTyped(k, state.names[k]); changed = true; }
    }
    if (changed) { buildNameRe(); save(); render(); }
  } catch (e) { /* offline or not allowed: keep the word-by-word version */ }
}

// After any form is saved, localize what was typed.
document.addEventListener('submit', () => setTimeout(() => { if (localizeState().length) render(); }, 0));
if (localizeState().length) render();
