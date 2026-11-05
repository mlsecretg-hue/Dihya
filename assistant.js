/* Rafika (رفيقة): voice assistant in Tunisian Derja.
 * Three brains, tried in order:
 *  1. An offline intent engine that understands common Derja requests (Arabic script and Arabizi) and acts on the app.
 *     It needs no network, which matters in the field.
 *  2. Claude for anything else: through the claude.ai `sample` capability when the app runs as a Claude artifact,
 *     or through the Dihya server (server/index.mjs) when it is configured in config.js.
 *  3. A help message with example phrases when neither is available.
 * Voice: Web Speech API recognition (ar-TN) and speech synthesis; "conversation mode" listens again after each reply. */
'use strict';

const RQ_TXT = {
  ar: { name: 'رفيقة', sub: 'مساعدتك، احكي معايا بالتونسي', placeholder: 'اكتبي ولا اضغطي على الميكرو…', listening: 'نسمع فيك…',
    convo: 'حديث متواصل', voiceOn: 'الصوت', thinking: 'نخمّم…', open: 'احكي مع رفيقة', sendSos: '🆘 ابعث نجدة توّا', call: '📞 اتصلي بـ190',
    hello: 'عسلامة! أنا رفيقة. نجم نعاونك تسجّلي صابة، تعرفي الحرارة، الأسوام، الطلبيات، ولا تحجزي معدّات. احكي معايا.',
    tnVoice: 'صوت تونسي', noMic: 'الميكرو ما يخدمش في هذا المتصفح. اكتبي سؤالك.', offline: 'ما فهمتكش مليح. جرّبي تقولي مثلا:' },
  fr: { name: 'Rafika', sub: 'Votre assistante, parlez en tunisien', placeholder: 'Écrivez ou touchez le micro…', listening: 'J\'écoute…',
    convo: 'Conversation continue', voiceOn: 'Voix', thinking: 'Je réfléchis…', open: 'Parler à Rafika', sendSos: '🆘 Envoyer SOS', call: '📞 Appeler le 190',
    hello: 'Aslema ! Je suis Rafika. Je peux enregistrer une récolte, donner la chaleur du jour, les prix, les commandes, ou réserver un outil.',
    tnVoice: 'Voix tunisienne', noMic: 'Le micro ne marche pas sur ce navigateur. Écrivez votre question.', offline: 'Je n\'ai pas bien compris. Essayez par exemple :' },
  en: { name: 'Rafika', sub: 'Your assistant, speak in Tunisian', placeholder: 'Type or tap the mic…', listening: 'Listening…',
    convo: 'Conversation mode', voiceOn: 'Voice', thinking: 'Thinking…', open: 'Talk to Rafika', sendSos: '🆘 Send SOS now', call: '📞 Call 190',
    hello: 'Aslema! I am Rafika. I can record a harvest, tell you today\'s heat, prices, orders, or book a tool. Talk to me.',
    tnVoice: 'Tunisian voice', noMic: 'The microphone does not work in this browser. Type your question.', offline: 'I did not understand well. Try for example:' }
};
const RQ_SUGGEST = {
  ar: ['شنوة الحرارة اليوم؟', 'سجّلي 20 لتر زيت', 'قدّاش نبيعو الزيت؟', 'عندنا طلبيات؟', 'نحب نحجز المشط', 'قدّاش ربحنا؟'],
  fr: ['Il fait chaud aujourd\'hui ?', 'Enregistre 20 litres d\'huile', 'Prix de l\'huile ?', 'On a des commandes ?', 'Réserver le peigne', 'Combien on a gagné ?'],
  en: ['How hot is it today?', 'Record 20 litres of oil', 'Olive oil price?', 'Any orders?', 'Book the olive comb', 'How much did we earn?']
};
const rqT = (k) => (RQ_TXT[state.lang] || RQ_TXT.en)[k];

const rq = { open: false, msgs: [], listening: false, interim: '', convo: false, voice: true, busy: false, rec: null, sampleFn: undefined, ctl: null };

// ---------- text normalisation ----------
const AR_DIGITS = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
const NUM_WORDS = { 'واحد': 1, 'وحدة': 1, 'زوز': 2, 'جوج': 2, 'ثلاثة': 3, 'تلاثة': 3, 'اربعة': 4, 'خمسة': 5, 'ستة': 6, 'سبعة': 7, 'ثمنية': 8, 'تسعة': 9, 'عشرة': 10,
  'عشرين': 20, 'ثلاثين': 30, 'تلاثين': 30, 'اربعين': 40, 'خمسين': 50, 'ستين': 60, 'سبعين': 70, 'ثمانين': 80, 'تسعين': 90, 'مية': 100, 'ميا': 100, 'مية و': 100,
  'zouz': 2, 'khamsa': 5, '3achra': 10, '3ochrin': 20, 'khamsin': 50, 'mya': 100 };
function norm(s) {
  return String(s).toLowerCase()
    .replace(/[٠-٩]/g, (d) => AR_DIGITS[d])
    .replace(/[ً-ْـ]/g, '')          // harakat and tatweel
    .replace(/[أإآ]/g, 'ا').replace(/ة\b/g, 'ة').replace(/ى/g, 'ي')
    .replace(/[؟?!.,،]/g, ' ').replace(/\s+/g, ' ').trim();
}
const has = (s, words) => words.some((w) => s.includes(w));
function findQty(s) {
  const m = s.match(/(\d+(?:[.,]\d+)?)/);
  if (m) return parseFloat(m[1].replace(',', '.'));
  for (const [w, n] of Object.entries(NUM_WORDS)) if (s.includes(w)) return n;
  return null;
}

// ---------- offline intent engine (Derja in Arabic script, Arabizi, French, English) ----------
const KW = {
  sos: ['عاوني', 'عاونوني', 'نجدة', 'النجدة', 'طاحت', 'طحت', 'دوخة', 'دايخة', 'مريضة', 'جرحت', 'تجرحت', 'حادث', 'كسيدة', 'اسعاف', 'سامو',
        '3aweni', 'najda', 'ta7et', 'dou5a', 'dokha', 'mridha', 'urgence', 'accident', 'au secours', 'help me', 'emergency', 'injured', 'samu'],
  heat: ['سخانة', 'سخون', 'الحرارة', 'حرارة', 'الشمس', 'السخانة', 'الطقس', 'نخدم اليوم', 'نخرج نخدم', 'skhana', 's5ana', 'sk5ana', 'skhoun', '7rara', 'chaleur', 'chaud', 'météo', 'heat', 'hot', 'weather', 'temperature'],
  record: ['سجل', 'سجلي', 'سجليلي', 'زيد صابة', 'صابة جديدة', 'دفعة', 'sajel', 'sajjel', 'sajli', 'enregistre', 'record', 'add a batch', 'new batch'],
  price: ['سوم', 'السوم', 'الاسوام', 'قداش نبيع', 'بقداش', 'السعر', 'الاسعار', 'soum', 'aswem', '9adech', 'b9adech', 'prix', 'price', 'tarif'],
  orders: ['طلبية', 'طلبيات', 'الطلبات', 'كوموند', 'كمند', 'كليون', 'حرفاء', 'commande', 'kommand', 'klion', 'order'],
  income: ['ربحنا', 'ربح', 'فلوس', 'الدخل', 'المدخول', 'قداش ربح', 'flous', 'rba7', 'gagné', 'revenu', 'earn', 'income', 'money', 'profit'],
  transport: ['كرهبة', 'الكرهبة', 'بيكوب', 'شاحنة', 'كميون', 'تراكتور', 'نركب', 'النقل', 'karhba', 'pickup', 'camion', 'nrkeb', 'transport', 'truck', 'ride'],
  tools: ['نحجز', 'حجز', 'المشط', 'مشط', 'شباك', 'الشبكة', 'سلوم', 'الكروسة', 'كرويطة', 'معدات', 'ala', 'n7jez', 'mochet', 'réserver', 'outil', 'peigne', 'book', 'tool', 'comb'],
  shop: ['متجر', 'الحانوت', 'حانوت', 'بوتيك', 'boutique', 'shop', 'store', '7anout'],
  passport: ['جواز', 'الكود', 'كيو ار', 'qr', 'passeport', 'passport', 'etiquette', 'label', 'ملصق'],
  checkin: ['تعبانة', 'تعبت', 'ظهري', 'وجيعة', 'يوجع', 'نوجع', 'fatiguée', 'mal au dos', 'tired', 'back pain', 't3ebt', 'dhahri'],
  thanks: ['يعيشك', 'يعيشكم', 'شكرا', 'برشا', 'ya3ichek', 'y3ichek', 'merci', 'thanks', 'thank you'],
  hello: ['عسلامة', 'السلام', 'اهلا', 'صباح الخير', 'مسا الخير', 'aslema', 'salam', 'ahla', 'bonjour', 'hello', 'hi'],
  help: ['شنوة تنجم', 'شنوة تعمل', 'شتعمل', 'كيفاش نستعمل', 'chnowa', 'chnia', 'que peux', 'what can you', 'help']
};
const PROD_KW = {
  olive_oil: ['زيت', 'زيتون', 'zit', 'zitoun', 'huile d\'olive', 'olive'],
  essential_oil: ['اكليل', 'كليل', 'روزمارين', 'عطرية', 'تقطير', 'klil', 'romarin', 'rosemary', 'essentielle', 'essential'],
  textile: ['مرقوم', 'زربية', 'كليم', 'نسيج', 'margoum', 'zarbia', 'tapis', 'rug', 'kilim'],
  agrofood: ['كسكسي', 'كسكس', 'محمص', 'دقيق', 'kosksi', 'couscous', 'mhames']
};
const TOOL_KW = { T1: ['مشط', 'mochet', 'peigne', 'comb'], T2: ['شباك', 'شبكة', 'filet', 'net'], T3: ['تقطير', 'قطارة', 'alambic', 'still'], T4: ['كروسة', 'كرويطة', 'chariot', 'trolley'] };

function heatFacts() {
  const p = heatPlan();
  return { level: p.maxR, label: t('risk' + p.maxR), advice: t('plan' + p.maxR), best: p.best ? `${p.best.start}:00 – ${p.best.end + 1}:00` : null };
}
function priceFacts(type) {
  const lots = state.lots.filter((l) => l.type === type);
  if (!lots.length) return null;
  const d = lots.reduce((s, l) => s + l.price, 0) / lots.length, m = lots.reduce((s, l) => s + l.middleman, 0) / lots.length;
  return { d, m, gap: Math.round((d - m) / m * 100), unit: PRODUCTS[type].unit };
}
function prodName(type) { return L(PRODUCTS[type]); }
// Units and numbers written the way they should be read aloud.
const UNIT_SAY = { ar: { L: 'لتر', mL: 'ملل', pcs: 'قطعة', kg: 'كيلو' }, fr: { L: 'litres', mL: 'mL', pcs: 'pièces', kg: 'kg' }, en: { L: 'litres', mL: 'mL', pcs: 'pieces', kg: 'kg' } };
const unitSay = (u) => (UNIT_SAY[state.lang] || UNIT_SAY.en)[u] || u;
const num = (n, d = 0) => String(Math.round(n * 10 ** d) / 10 ** d).replace('.', state.lang === 'en' ? '.' : ',');

// Each intent returns {text, action?, sos?}. Replies are short because they are read aloud.
function offlineAnswer(raw) {
  const s = norm(raw), lang = state.lang;
  const D = (ar, fr, en) => (lang === 'ar' ? ar : lang === 'fr' ? fr : en);
  const prod = Object.keys(PROD_KW).find((k) => has(s, PROD_KW[k]));
  const qty = findQty(s);

  if (has(s, KW.sos)) return { sos: true, text: D('ما تخافيش، أنا معاك. إذا الحالة خطيرة اتصلي بالإسعاف 190 توّا. نجم نبعث موقعك للمسؤولة.', 'Restez calme. Si c\'est grave, appelez le SAMU au 190 maintenant. Je peux envoyer votre position à la responsable.', 'Stay calm. If it is serious, call SAMU on 190 now. I can send your location to the cooperative lead.') };
  if (has(s, KW.record) || (qty && prod && !has(s, KW.price))) {
    const type = prod || 'olive_oil';
    return { action: { type: 'new_batch', product: type, qty: qty || 0 },
      text: D(`باهي، حضّرتلك الفيشة: ${qty ? qty + ' ' + unitSay(PRODUCTS[type].unit) + ' ' : ''}${prodName(type)}. كمّلي اسم القرية واضغطي حفظ، ونطلعلك الكود متاعها.`,
              `D'accord, j'ai préparé la fiche : ${qty ? qty + ' ' + unitSay(PRODUCTS[type].unit) + ' ' : ''}${prodName(type)}. Ajoutez le village et enregistrez.`,
              `Done, I prepared the form: ${qty ? qty + ' ' + unitSay(PRODUCTS[type].unit) + ' ' : ''}${prodName(type)}. Add the village and save.`) };
  }
  if (has(s, KW.heat)) {
    const h = heatFacts();
    return { action: { type: 'open_tab', tab: 'safety' },
      text: D(`الحرارة اليوم: ${h.label}. ${h.advice}${h.best ? ` أحسن وقت للخدمة من ${h.best}.` : ''} اشربي الماء وما تنساش المظلة.`,
              `Chaleur aujourd'hui : ${h.label}. ${h.advice}${h.best ? ` Meilleur créneau : ${h.best}.` : ''}`,
              `Heat today: ${h.label}. ${h.advice}${h.best ? ` Safest window: ${h.best}.` : ''}`) };
  }
  if (has(s, KW.price)) {
    const type = prod || 'olive_oil', f = priceFacts(type);
    if (!f) return { text: D(`ما عندناش سوم مسجّل لـ${prodName(type)}.`, `Pas de prix enregistré pour ${prodName(type)}.`, `No price recorded for ${prodName(type)}.`) };
    return { action: { type: 'open_tab', tab: 'market' },
      text: D(`${prodName(type)}: الوسيط يشري بـ${num(f.m, 2)} دينار، واحنا نبيعو مباشرة بـ${num(f.d, 2)} دينار لل${unitSay(f.unit)}. يعني زايد ${f.gap} بالمية.`,
              `${prodName(type)} : l'intermédiaire paie ${num(f.m, 2)} DT, nous vendons en direct à ${num(f.d, 2)} DT le ${unitSay(f.unit)}, soit ${f.gap} % de plus.`,
              `${prodName(type)}: intermediaries pay ${num(f.m, 2)} dinars, we sell direct at ${num(f.d, 2)} dinars per ${unitSay(f.unit)}, ${f.gap}% more.`) };
  }
  if (has(s, KW.orders)) {
    const open = state.orders.filter((o) => o.status !== 'delivered');
    const list = open.slice(0, 3).map((o) => `${o.buyer} (${o.qty} ${unitSay(PRODUCTS[state.lots.find((l) => l.id === o.lotId)?.type || 'olive_oil'].unit)})`).join('، ');
    return { action: { type: 'open_tab', tab: 'market' },
      text: open.length ? D(`عندكم ${open.length === 1 ? 'طلبية وحدة' : open.length + ' طلبيات'} مازالت: ${list}. أكّديهم من السوق.`, `Vous avez ${open.length} commande(s) en cours : ${list}.`, `You have ${open.length} open order(s): ${list}.`)
                        : D('ما فما حتى طلبية جديدة توّا.', 'Aucune nouvelle commande pour l\'instant.', 'No new orders right now.') };
  }
  if (has(s, KW.income)) {
    const tot = salesTotals();
    return { action: { type: 'open_tab', tab: 'home' },
      text: D(`بعتو مباشرة بـ${num(tot.direct)} دينار، يعني ${num(tot.direct - tot.mid)} دينار زايدة على الوسطاء، ${tot.gainPct} بالمية أكثر. صحّة!`,
              `Ventes directes : ${num(tot.direct)} dinars, soit ${num(tot.direct - tot.mid)} dinars de plus qu'avec les intermédiaires, ${tot.gainPct} % de plus.`,
              `Direct sales: ${num(tot.direct)} dinars, that is ${num(tot.direct - tot.mid)} dinars more than through intermediaries, ${tot.gainPct}% more.`) };
  }
  if (has(s, KW.transport)) {
    return { action: { type: 'open_tab', tab: 'safety' },
      text: D('ما تركبيش في بيكوب ولا شاحنة مكشوفة، وما تركبيش إذا الركاب أكثر من الكراسي. عطيني نومرو الكرهبة وعدد الكراسي ونثبّتلك.', 'Ne montez jamais dans un pickup ou un camion ouvert, ni dans un véhicule surchargé. Donnez la plaque et le nombre de places.', 'Never ride in an open pickup or truck, or an overloaded vehicle. Enter the plate and seats to check the trip.') };
  }
  if (has(s, KW.tools)) {
    const toolId = Object.keys(TOOL_KW).find((k) => has(s, TOOL_KW[k]));
    const tl = state.tools.find((x) => x.id === toolId);
    return { action: { type: 'open_tab', tab: 'tools' },
      text: D(`${tl ? L(tl.name) + ': ' : ''}اختاري النهار واسمك واضغطي احجزي. المشط يوفّرلك قريب 4 سوايع خدمة.`, `${tl ? L(tl.name) + ' : ' : ''}choisissez le jour et votre nom, puis réservez.`, `${tl ? L(tl.name) + ': ' : ''}pick the day and your name, then book.`) };
  }
  if (has(s, KW.passport)) return { action: { type: 'open_tab', tab: 'products' }, text: D('كل صابة عندها جواز بالكود. اضغطي على "الجواز" باش تطبعي الملصق.', 'Chaque lot a son passeport QR. Touchez « Passeport » pour imprimer l\'étiquette.', 'Every batch has a QR passport. Tap "Passport" to print the label.') };
  if (has(s, KW.shop)) return { action: { type: 'shop' }, text: D('هاو متجر التعاونية، تنجمي تبعثي الرابط للحرفاء في الواتساب.', 'Voici la boutique de la coopérative, partagez le lien sur WhatsApp.', 'Here is the cooperative shop; share the link on WhatsApp.') };
  if (has(s, KW.checkin)) {
    state.checkins.unshift({ date: today(), k: 'pain' }); save();
    return { action: { type: 'open_tab', tab: 'safety' }, text: D('سلامتك. سجّلتلك في الفحص اليومي. ارتاحي شوية في الظل، وبدّلي الوضعية كل نص ساعة. إذا الوجيعة كبيرة امشي للطبيب.', 'Prompt rétablissement. Je l\'ai noté. Reposez-vous à l\'ombre et changez de position toutes les 30 minutes.', 'Get well. I logged it in your check-in. Rest in the shade and change position every 30 minutes.') };
  }
  if (has(s, KW.thanks)) return { text: D('يعيشك إنتِ! أنا هوني وقت ما تحتاجيني.', 'Avec plaisir, je suis là quand vous voulez.', 'You are welcome, I am here whenever you need me.') };
  if (has(s, KW.help) || has(s, KW.hello)) return { text: rqT('hello') };
  return null;
}

// ---------- Claude brain ----------
function appContext() {
  const h = heatFacts(), tot = salesTotals();
  return {
    cooperative: state.coop.name, region: state.coop.region, members: state.members.map((m) => m.name),
    heat_today: { level: h.label, advice: h.advice, safest_window: h.best },
    prices_tnd: Object.fromEntries(Object.keys(PRODUCTS).map((k) => [k, priceFacts(k)]).filter(([, v]) => v).map(([k, v]) => [k, { direct: v.d, intermediary: v.m, unit: v.unit }])),
    open_orders: state.orders.filter((o) => o.status !== 'delivered').map((o) => ({ buyer: o.buyer, qty: o.qty, status: o.status })),
    stock: state.batches.filter((b) => b.status === 'stock').map((b) => ({ id: b.id, product: b.type, qty: b.qty, by: member(b.memberId).name })),
    income: { direct_tnd: Math.round(tot.direct), extra_vs_intermediaries_tnd: Math.round(tot.direct - tot.mid) },
    tools: state.tools.map((tl) => ({ id: tl.id, name: tl.name.en, booked_today: !!tl.bookings.find((b) => b.date === today()) }))
  };
}
const RQ_WOMAN = '<svg class="rq-woman" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.2c-3.7 0-6.3 2.8-6.3 6.6 0 2.3 1 4.2 2.5 5.4-3 1-5.2 3.6-5.5 7h18.6c-.3-3.4-2.5-6-5.5-7 1.5-1.2 2.5-3.1 2.5-5.4 0-3.8-2.6-6.6-6.3-6.6z"/><ellipse cx="12" cy="9.4" rx="3.4" ry="3.9" fill="#ffe2d1"/><path fill="currentColor" d="M8.6 8.3c.9-1.9 2.8-2.6 4.6-2.2 1.2.3 2 1 2.3 2.1-1.9-.2-4.2-.4-6.9.1z"/></svg>';
const RQ_RULES = `You are Rafika (رفيقة), the voice assistant inside Dihya, an app for women's agricultural cooperatives in rural Tunisia (olive oil, rosemary essential oil, margoum weaving, couscous).
The person talking to you is a woman producer or cooperative lead. Many have limited literacy and speak by voice in Tunisian Arabic (Derja), sometimes in Arabizi (Latin letters and digits like 3, 7, 9) or French.
Rules:
- Reply in Tunisian Derja written in Arabic script, warm and respectful (address her as a woman: "إنتِ"). If she writes in French or English, reply in that language.
- 1 to 3 short sentences. Your reply is read aloud, so no lists, no markdown, no emojis.
- Use only the facts in APP_CONTEXT for prices, orders, heat, income and tools. Never invent numbers.
- Health or accident emergency: tell her to call SAMU 190 (or civil protection 198) and set action.type to "sos_prompt". Give general safety advice only, never a diagnosis.
- Never ride in open pickups or overloaded vehicles: say so whenever transport comes up.
- To open a screen, set action.type: "new_batch" (with product and qty when she gives them), "open_tab" (tab: home, products, market, safety, tools) or "shop". Otherwise "none".
- Reply with only JSON: {"reply": string, "action": {"type": "none"|"new_batch"|"open_tab"|"shop"|"sos_prompt", "product": "olive_oil"|"essential_oil"|"textile"|"agrofood"|"", "qty": number, "tab": "home"|"products"|"market"|"safety"|"tools"|""}}`;

async function getSample() {
  if (rq.sampleFn !== undefined) return rq.sampleFn;
  try { rq.sampleFn = window.claude && window.claude.use ? await window.claude.use('sample') : null; } catch (e) { rq.sampleFn = null; }
  return rq.sampleFn;
}
async function claudeAnswer(text) {
  const history = rq.msgs.filter((m) => m.role === 'user' || m.role === 'assistant').slice(-8)
    .map((m) => ({ role: m.role, content: m.text }));
  const api = window.RABTA_CONFIG && window.RABTA_CONFIG.assistantApi;
  if (api) {
    const r = await fetch(api, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lang: state.lang, context: appContext(), messages: history }) });
    if (!r.ok) throw new Error('server ' + r.status);
    return r.json();
  }
  const sample = await getSample();
  if (!sample) return null;
  rq.ctl = new AbortController();
  const turns = [{ role: 'user', content: RQ_RULES + '\n\nAPP_CONTEXT=' + JSON.stringify(appContext()) }, ...history];
  return sample.json(turns, { modelTier: 'quick', cache: false, signal: rq.ctl.signal });
}

// ---------- conversation ----------
async function ask(text) {
  text = String(text || '').trim();
  if (!text || rq.busy) return;
  rq.msgs.push({ role: 'user', text });
  let ans = offlineAnswer(text);
  if (!ans) {
    rq.busy = true; renderAssistant();
    try {
      const res = await claudeAnswer(text);
      if (res && typeof res.reply === 'string') ans = { text: res.reply, action: res.action, sos: res.action && res.action.type === 'sos_prompt' };
    } catch (e) {
      if (e && e.code === 'not_granted') rq.sampleFn = null;
    }
    rq.busy = false;
  }
  if (!ans) ans = { text: rqT('offline'), suggest: true };
  rq.msgs.push({ role: 'assistant', text: ans.text, sos: ans.sos, suggest: ans.suggest });
  if (ans.action) runAction(ans.action);
  renderAssistant();
  say(ans.text);
}

function runAction(a) {
  if (!a || !a.type || a.type === 'none') return;
  if (a.type === 'new_batch') {
    if (location.hash) history.replaceState(null, '', baseUrl());
    ui.tab = 'products'; ui.modal = batchForm({ type: PRODUCTS[a.product] ? a.product : 'olive_oil', qty: a.qty > 0 ? a.qty : '' });
    render();
  } else if (a.type === 'open_tab' && ['home', 'products', 'market', 'safety', 'tools'].includes(a.tab)) {
    if (location.hash) history.replaceState(null, '', baseUrl());
    ui.tab = a.tab; ui.modal = null; render();
  } else if (a.type === 'shop') {
    location.hash = '#/shop';
  }
}

// ---------- voice ----------
function voiceLang() { return state.lang === 'ar' ? 'ar-TN' : state.lang === 'fr' ? 'fr-FR' : 'en-GB'; }
// Speak a reply. A Tunisian neural voice from the server (tts/) is used when one is configured; otherwise the best
// voice installed on the phone (see pickVoice in app.js). In conversation mode, listening restarts when speech ends.
let rqAudio = null;
function stopVoice() {
  if (rqAudio) { rqAudio.pause(); rqAudio = null; }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
async function say(text) {
  const done = () => { if (rq.convo && rq.open) listen(); };
  stopVoice();
  if (!rq.voice) { done(); return; }
  const api = window.RABTA_CONFIG && window.RABTA_CONFIG.ttsApi;
  if (api && state.lang === 'ar') {
    try {
      const r = await fetch(api, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) });
      if (r.ok) {
        const url = URL.createObjectURL(await r.blob());
        const a = new Audio(url);
        a.onended = () => { URL.revokeObjectURL(url); if (rqAudio === a) { rqAudio = null; done(); } };
        rqAudio = a;
        await a.play();
        return;
      }
    } catch (e) { rqAudio = null; /* server voice unavailable: fall back to the phone's voice */ }
  }
  if (!('speechSynthesis' in window)) { done(); return; }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voiceLang(); u.rate = 0.95;
  const v = pickVoice(u.lang); if (v) u.voice = v;
  u.onend = done;
  speechSynthesis.speak(u);
}
function voiceName() {
  if (window.RABTA_CONFIG && window.RABTA_CONFIG.ttsApi && state.lang === 'ar') return rqT('tnVoice');
  const v = pickVoice(voiceLang()); return v ? v.name : '';
}
function listen() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { rq.msgs.push({ role: 'assistant', text: rqT('noMic') }); renderAssistant(); return; }
  if (rq.listening) { rq.rec && rq.rec.stop(); return; }
  stopVoice();
  const rec = new SR();
  rec.lang = voiceLang(); rec.interimResults = true; rec.maxAlternatives = 1;
  let finalText = '';
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) finalText += e.results[i][0].transcript; else interim += e.results[i][0].transcript;
    }
    rq.interim = finalText + interim; renderAssistant();
  };
  rec.onerror = () => { rq.listening = false; rq.interim = ''; renderAssistant(); };
  rec.onend = () => { rq.listening = false; const txt = finalText || rq.interim; rq.interim = ''; renderAssistant(); if (txt) ask(txt); };
  rq.rec = rec; rq.listening = true; renderAssistant();
  try { rec.start(); } catch (e) { rq.listening = false; renderAssistant(); }
}

// ---------- UI ----------
const rqEl = () => document.getElementById('assistant');
function renderAssistant() {
  const el = rqEl(); if (!el) return;
  const onShop = /^#\/(p|shop)/.test(location.hash);
  if (!rq.open) {
    el.innerHTML = onShop ? '' : `<button class="rq-fab" data-rq="open" aria-label="${rqT('open')}">${RQ_WOMAN}<b>${rqT('name')}</b></button>`;
    return;
  }
  const sugg = RQ_SUGGEST[state.lang] || RQ_SUGGEST.en;
  el.innerHTML = `<section class="rq-panel" role="dialog" aria-label="${rqT('name')}">
    <header class="rq-head">
      <span class="rq-avatar" aria-hidden="true">${RQ_WOMAN}</span>
      <div><b>${rqT('name')}</b><small>${rqT('sub')}</small></div>
      <button class="icon ${rq.convo ? 'on' : ''}" data-rq="convo" title="${rqT('convo')}" aria-pressed="${rq.convo}">🔁</button>
      <button class="icon ${rq.voice ? 'on' : ''}" data-rq="voice" title="${rqT('voiceOn')}${voiceName() ? ': ' + esc(voiceName()) : ''}" aria-pressed="${rq.voice}">${rq.voice ? '🔊' : '🔈'}</button>
      <button class="icon" data-rq="close" aria-label="${t('close')}">✕</button>
    </header>
    <div class="rq-log" aria-live="polite">
      ${rq.msgs.map((m) => `<div class="rq-msg ${m.role}"><span class="rq-text" dir="auto">${esc(m.text)}</span>
        ${m.sos ? `<div class="rq-actions"><button class="danger sm" data-rq="sos">${rqT('sendSos')}</button><a class="btn sm" href="tel:190">${rqT('call')}</a></div>` : ''}
        ${m.suggest ? `<div class="rq-chips">${sugg.map((x) => `<button class="chip" data-rq="say" data-q="${esc(x)}">${esc(x)}</button>`).join('')}</div>` : ''}</div>`).join('')}
      ${rq.busy ? `<div class="rq-msg assistant typing">${rqT('thinking')}</div>` : ''}
      ${rq.listening ? `<div class="rq-msg user interim" dir="auto">${esc(rq.interim) || rqT('listening')}</div>` : ''}
    </div>
    ${rq.msgs.length <= 1 ? `<div class="rq-chips start">${sugg.map((x) => `<button class="chip" data-rq="say" data-q="${esc(x)}">${esc(x)}</button>`).join('')}</div>` : ''}
    <form class="rq-input" data-rq-form>
      <input name="q" placeholder="${rqT('placeholder')}" autocomplete="off" dir="auto" aria-label="${rqT('placeholder')}">
      <button type="button" class="rq-mic ${rq.listening ? 'live' : ''}" data-rq="mic" aria-label="Mic">🎙</button>
    </form>
  </section>`;
  const log = el.querySelector('.rq-log'); if (log) log.scrollTop = log.scrollHeight;
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-rq]'); if (!b) return;
  const k = b.dataset.rq;
  if (k === 'open') { rq.open = true; if (!rq.msgs.length) rq.msgs.push({ role: 'assistant', text: rqT('hello') }); renderAssistant(); }
  else if (k === 'close') { rq.open = false; rq.convo = false; if (rq.rec) rq.rec.stop(); stopVoice(); renderAssistant(); }
  else if (k === 'convo') { rq.convo = !rq.convo; renderAssistant(); if (rq.convo && !rq.listening) listen(); }
  else if (k === 'voice') { rq.voice = !rq.voice; if (!rq.voice) stopVoice(); renderAssistant(); }
  else if (k === 'mic') listen();
  else if (k === 'say') ask(b.dataset.q);
  else if (k === 'sos') { const btn = document.querySelector('[data-act=sos]'); if (btn) btn.click(); else { ui.tab = 'safety'; render(); setTimeout(() => document.querySelector('[data-act=sos]')?.click(), 50); } }
});
document.addEventListener('submit', (e) => {
  if (!e.target.matches('[data-rq-form]')) return;
  e.preventDefault();
  const q = e.target.q.value; e.target.q.value = ''; ask(q);
});
window.addEventListener('hashchange', renderAssistant);
renderAssistant();
