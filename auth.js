/* Log in and sign up.
 * Accounts live on this device (localStorage), so they work offline like the rest of the app:
 * a phone number plus a 4 to 6 digit PIN, which is easier than email and passwords for the women using it.
 * The PIN is never stored: only a PBKDF2-SHA256 hash with a random salt. Five wrong PINs lock the form for 30 seconds.
 * The shop and product passports stay public so buyers can use them without an account. */
'use strict';

const AUTH_KEY = 'dihya.accounts';
const SESSION_KEY = 'dihya.session';
const AT = {
  en: {
    login: 'Log in', signup: 'Sign up', hiBack: 'Welcome back', join: 'Create your account',
    loginSub: 'Use your phone number and PIN.', signupSub: 'It takes a minute. Your account stays on this phone.',
    name: 'Full name', nameAr: 'Name in Arabic letters', nameLat: 'Name in Latin letters', nameHint: 'We fill in the other spelling for you. Correct it if needed.', phone: 'Phone number', pin: 'PIN (4 to 6 digits)', pin2: 'Repeat the PIN', village: 'Village',
    iam: 'I am', show: 'Show', hide: 'Hide', demo: 'Try the demo without an account', or: 'or',
    noAcc: 'New here?', haveAcc: 'Already have an account?',
    errPhone: 'Enter a phone number of 8 digits.', errPin: 'The PIN must be 4 to 6 digits.', errPin2: 'The two PINs are different.',
    errName: 'Enter your name.', errTaken: 'This phone number already has an account. Log in instead.',
    errWrong: 'Wrong phone number or PIN.', errLocked: 'Too many tries. Wait {s} seconds.', errCrypto: 'This browser cannot secure the PIN. Open the app over https.',
    account: 'Account', logout: 'Log out', signedAs: 'Signed in as', demoUser: 'Demo visitor', onDevice: 'Accounts are saved on this phone only.'
  },
  fr: {
    login: 'Connexion', signup: 'Inscription', hiBack: 'Bon retour', join: 'Créez votre compte',
    loginSub: 'Utilisez votre numéro et votre code PIN.', signupSub: 'Une minute suffit. Votre compte reste sur ce téléphone.',
    name: 'Nom complet', nameAr: 'Nom en lettres arabes', nameLat: 'Nom en lettres latines', nameHint: 'Nous remplissons l\'autre écriture pour vous. Corrigez-la si besoin.', phone: 'Numéro de téléphone', pin: 'Code PIN (4 à 6 chiffres)', pin2: 'Répétez le code', village: 'Village',
    iam: 'Je suis', show: 'Voir', hide: 'Masquer', demo: 'Essayer la démo sans compte', or: 'ou',
    noAcc: 'Nouvelle ici ?', haveAcc: 'Déjà un compte ?',
    errPhone: 'Entrez un numéro de 8 chiffres.', errPin: 'Le code doit avoir 4 à 6 chiffres.', errPin2: 'Les deux codes sont différents.',
    errName: 'Entrez votre nom.', errTaken: 'Ce numéro a déjà un compte. Connectez-vous.',
    errWrong: 'Numéro ou code incorrect.', errLocked: 'Trop d\'essais. Attendez {s} secondes.', errCrypto: 'Ce navigateur ne peut pas protéger le code. Ouvrez l\'app en https.',
    account: 'Compte', logout: 'Se déconnecter', signedAs: 'Connectée en tant que', demoUser: 'Visiteur démo', onDevice: 'Les comptes sont enregistrés sur ce téléphone uniquement.'
  },
  ar: {
    login: 'الدخول', signup: 'التسجيل', hiBack: 'عسلامة، مرحبا بعودتك', join: 'اعملي حسابك',
    loginSub: 'استعملي رقم تليفونك والرقم السري.', signupSub: 'دقيقة برك. الحساب يبقى في التليفون هذا.',
    name: 'الاسم واللقب', nameAr: 'الاسم بالحروف العربية', nameLat: 'الاسم بالحروف اللاتينية', nameHint: 'نعمّرولك الكتابة الأخرى وحدها. صلّحيها كان لزم.', phone: 'رقم التليفون', pin: 'الرقم السري (4 إلى 6 أرقام)', pin2: 'عاودي الرقم السري', village: 'القرية',
    iam: 'أنا', show: 'ورّي', hide: 'خبّي', demo: 'جرّبي النسخة التجريبية بلا حساب', or: 'ولا',
    noAcc: 'جديدة هنا؟', haveAcc: 'عندك حساب؟',
    errPhone: 'اكتبي رقم تليفون فيه 8 أرقام.', errPin: 'الرقم السري لازم يكون من 4 إلى 6 أرقام.', errPin2: 'الرقمين موش كيف كيف.',
    errName: 'اكتبي اسمك.', errTaken: 'الرقم هذا عندو حساب. ادخلي بيه.',
    errWrong: 'الرقم ولا الرقم السري غالط.', errLocked: 'برشا محاولات. استنّي {s} ثانية.', errCrypto: 'المتصفح هذا ما ينجمش يحمي الرقم السري. حلّي التطبيق بـ https.',
    account: 'الحساب', logout: 'اخرجي', signedAs: 'داخلة باسم', demoUser: 'زائرة تجريبية', onDevice: 'الحسابات محفوظة في التليفون هذا برك.'
  }
};
const at = (k) => (AT[state.lang] && AT[state.lang][k]) || AT.en[k] || k;
const authUi = { mode: 'login', err: '', showPin: false, fails: 0, lockUntil: 0, busy: false, draft: {} };


// ---------- names in both scripts ----------
// Common Tunisian first and family names, then letter rules for anything else. The result is only a suggestion
// the woman can correct at sign-up.
const NAME_PAIRS = 'Amel:أمل|Amal:أمل|Fatma:فاطمة|Fatima:فاطمة|Mariem:مريم|Meriem:مريم|Mariam:مريم|Molka:ملكة|Malek:مالك|Sarra:سارة|Sara:سارة|Salma:سلمى|Salwa:سلوى|Sana:سناء|Sonia:سنية|Samia:سامية|Nadia:نادية|Najet:نجاة|Nour:نور|Ines:إيناس|Imen:إيمان|Eya:آية|Aya:آية|Asma:أسماء|Rim:ريم|Rania:رانية|Hela:هالة|Hana:هناء|Houda:هدى|Hajer:هاجر|Khadija:خديجة|Aicha:عائشة|Zeineb:زينب|Zainab:زينب|Wafa:وفاء|Yasmine:ياسمين|Leila:ليلى|Latifa:لطيفة|Mabrouka:مبروكة|Saida:سعيدة|Hedia:هدية|Habiba:حبيبة|Jamila:جميلة|Dorra:درة|Emna:آمنة|Olfa:ألفة|Chaima:شيماء|Rahma:رحمة|Mouna:منى|Mona:منى|Ons:أنس|Siwar:سوار|Nesrine:نسرين|Raja:رجاء|Monia:منية|Naima:نعيمة|Zohra:زهرة|Mbarka:مباركة|Halima:حليمة|Souad:سعاد|Rachida:رشيدة|Mohamed:محمد|Ahmed:أحمد|Ali:علي|Karim:كريم|Sami:سامي|Youssef:يوسف|Ben:بن|Bent:بنت|Salah:صالح|Trabelsi:الطرابلسي|Ayari:العياري|Jebali:الجبالي|Gharbi:الغربي|Hammami:الحمامي|Mejri:الماجري|Dridi:الدريدي|Khelifi:الخليفي|Ouni:العوني|Saidi:السعيدي|Chebbi:الشابي|Abdallah:عبد الله|Mansour:منصور|Brahim:إبراهيم|Hamdi:حمدي|Belhaj:بالحاج|Mabrouk:مبروك|Tlili:التليلي|Jlassi:الجلاصي|Riahi:الرياحي|Zouari:الزواري|Masmoudi:المصمودي|Kammoun:كمون|Ghanmi:الغانمي|Hamrouni:الحمروني|Sassi:ساسي|Amri:العامري|Arfaoui:العرفاوي|Selmi:السالمي|Ferchichi:الفرشيشي|Nasri:النصري'
  .split('|').map((p) => p.split(':'));
const LAT2AR = new Map(NAME_PAIRS.map(([l, a]) => [l.toLowerCase(), a]));
const AR2LAT = new Map(); NAME_PAIRS.forEach(([l, a]) => { if (!AR2LAT.has(a)) AR2LAT.set(a, l); });
const hasArabic = (s) => /[؀-ۿ]/.test(s);
function latWordToAr(w) {
  const k = w.toLowerCase();
  if (LAT2AR.has(k)) return LAT2AR.get(k);
  const multi = [['ch', 'ش'], ['sh', 'ش'], ['kh', 'خ'], ['gh', 'غ'], ['th', 'ت'], ['dh', 'ذ'], ['ou', 'و'], ['oo', 'و'], ['ee', 'ي'], ['ai', 'اي'], ['ei', 'ي']];
  const one = { b: 'ب', t: 'ت', j: 'ج', d: 'د', r: 'ر', z: 'ز', s: 'س', f: 'ف', q: 'ق', k: 'ك', c: 'ك', l: 'ل', m: 'م', n: 'ن', w: 'و', y: 'ي', g: 'ڨ', p: 'ب', v: 'ف', x: 'كس', i: 'ي', o: 'و', u: 'و' };
  let out = '', i = 0;
  while (i < k.length) {
    const two = k.slice(i, i + 2), m = multi.find(([a]) => a === two);
    if (m) { out += m[1]; i += 2; continue; }
    const c = k[i], last = i === k.length - 1;
    if (c === 'a') out += i === 0 ? 'ا' : last ? 'ة' : (k[i + 1] === 'a' ? '' : 'ا');
    else if (c === 'e') out += i === 0 ? 'إ' : '';
    else if (c === 'h') out += last ? 'ه' : 'ح';
    else if (c === 'i' && i === 0) out += 'إي';
    else if ((c === 'o' || c === 'u') && i === 0) out += 'أو';
    else out += one[c] || '';
    i++;
  }
  return out || w;
}
function arWordToLat(w) {
  if (AR2LAT.has(w)) return AR2LAT.get(w);
  if (w.length > 3 && w.startsWith('ال')) return 'El ' + arWordToLat(w.slice(2));
  const map = { 'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'ch', 'ص': 's', 'ض': 'dh', 'ط': 't', 'ظ': 'dh', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'k', 'ڨ': 'g', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'ou', 'ي': 'i', 'ى': 'a', 'ة': 'a', 'ئ': 'i', 'ؤ': 'ou', 'ء': '' };
  let out = [...w].map((c, i, a) => {
    // a vowel between two consonants is usually not written in Arabic: add a light "a"
    const v = map[c] ?? '';
    const next = a[i + 1];
    const cons = v && !/^[aiou]/.test(v) && next && map[next] && !/^[aiou]/.test(map[next]);
    return cons ? v + 'a' : v;
  }).join('');
  out = out.replace(/^al/, 'El ').replace(/(.)\1\1+/g, '$1$1');
  return out.split(' ').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ').trim() || w;
}
function otherSpelling(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  if (hasArabic(name)) return words.map(arWordToLat).join(' ');
  return words.map(latWordToAr).join(' ');
}
const capWords = (s) => s.split(/\s+/).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
// The account owner's name in the reader's script.
function dispName(u) {
  if (!u) return '';
  if (u.demo) return at('demoUser');
  if (state.lang === 'ar') return u.nameAr || (hasArabic(u.name) ? u.name : otherSpelling(u.name));
  return u.nameLat || (hasArabic(u.name) ? otherSpelling(u.name) : u.name);
}

function readJson(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
}
function writeJson(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
function accounts() { return readJson(AUTH_KEY, []); }
function currentUser() { return readJson(SESSION_KEY, null); }
const cleanPhone = (p) => String(p || '').replace(/\D/g, '').replace(/^216/, '');
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));

async function hashPin(pin, saltB64) {
  const salt = saltB64 ? Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0)) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 150000 }, key, 256);
  return { salt: b64(salt), hash: b64(bits) };
}

function startSession(user) {
  writeJson(SESSION_KEY, { id: user.id, name: user.name, nameAr: user.nameAr, nameLat: user.nameLat, phone: user.phone, role: user.role, demo: !!user.demo });
  state.role = user.role; state.onboarded = true;
  if (user.role === 'producer' && !user.demo && !state.members.find((m) => m.id === user.id)) {
    state.members.push({ id: user.id, name: user.nameLat || user.name, village: user.village || '', craft: 'olive_oil', since: new Date().getFullYear() });
  }
  if (user.nameLat && user.nameAr && window.addName) addName(user.nameLat, user.nameAr);
  save();
  authUi.err = ''; authUi.fails = 0; authUi.draft = {};
  if (user.role === 'buyer') { location.hash = '#/shop'; return; }
  ui.tab = user.role === 'producer' ? 'products' : 'home'; ui.modal = null;
  render(); window.scrollTo(0, 0);
}
function logout() {
  try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
  ui.modal = null; authUi.mode = 'login'; authUi.err = '';
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  ui.landing = false; render(); window.scrollTo(0, 0);
}

function renderAuth() {
  const m = authUi.mode, d = authUi.draft;
  const roles = [['producer', '👩‍🌾', t('roleProducer')], ['lead', '🧭', t('roleLead')], ['buyer', '🛍', t('roleBuyer')]];
  const pinType = authUi.showPin ? 'text' : 'password';
  const pinField = (name, label, ac) => `<label>${label}<span class="auth-pin"><input name="${name}" type="${pinType}" inputmode="numeric" pattern="[0-9]{4,6}" maxlength="6" autocomplete="${ac}" required>
    <button type="button" class="auth-eye" data-auth="eye" aria-pressed="${authUi.showPin}">${authUi.showPin ? at('hide') : at('show')}</button></span></label>`;
  app().innerHTML = `<div class="auth">
    <div class="auth-bg" aria-hidden="true"></div>
    <header class="auth-top"><a class="lp-logo" href="#/welcome">Dihya</a><div class="top-actions">${langSelect()}</div></header>
    <main class="auth-card${authUi.entered ? ' settled' : ''}">
      <div class="auth-tabs" role="tablist">
        <button role="tab" data-auth="mode" data-m="login" aria-selected="${m === 'login'}">${at('login')}</button>
        <button role="tab" data-auth="mode" data-m="signup" aria-selected="${m === 'signup'}">${at('signup')}</button>
        <span class="auth-tab-pill" style="--i:${m === 'login' ? 0 : 1}" aria-hidden="true"></span>
      </div>
      <div class="auth-body">
      <h1>${m === 'login' ? at('hiBack') : at('join')}</h1>
      <p class="muted">${m === 'login' ? at('loginSub') : at('signupSub')}</p>
      <form data-auth-form="${m}" class="form" novalidate>
        ${m === 'signup' ? `<div class="auth-names">
          <label>${at('nameAr')}<input name="nameAr" dir="rtl" lang="ar" autocomplete="name" value="${esc(d.nameAr)}" data-twin="nameLat" required></label>
          <label>${at('nameLat')}<input name="nameLat" dir="ltr" lang="fr" autocomplete="name" value="${esc(d.nameLat)}" data-twin="nameAr" required></label>
          <small class="muted">${at('nameHint')}</small></div>` : ''}
        <label>${at('phone')}<span class="auth-phone"><span aria-hidden="true">+216</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel-national" value="${esc(d.phone)}" placeholder="20 123 456" required></span></label>
        ${m === 'signup' ? `<label>${at('village')}<input name="village" value="${esc(d.village)}"></label>
          <fieldset class="auth-roles"><legend>${at('iam')}</legend>${roles.map(([k, ic, lb]) => `<label class="auth-role"><input type="radio" name="role" value="${k}" ${(d.role || 'producer') === k ? 'checked' : ''}><span><b aria-hidden="true">${ic}</b>${lb}</span></label>`).join('')}</fieldset>` : ''}
        ${pinField('pin', at('pin'), m === 'login' ? 'current-password' : 'new-password')}
        ${m === 'signup' ? pinField('pin2', at('pin2'), 'new-password') : ''}
        <p class="auth-err" role="alert">${esc(authUi.err)}</p>
        <button class="primary auth-go" ${authUi.busy ? 'disabled' : ''}>${m === 'login' ? at('login') : at('signup')}</button>
      </form>
      <p class="auth-switch">${m === 'login' ? at('noAcc') : at('haveAcc')} <button type="button" data-auth="mode" data-m="${m === 'login' ? 'signup' : 'login'}">${m === 'login' ? at('signup') : at('login')}</button></p>
      <div class="auth-or"><span>${at('or')}</span></div>
      <button type="button" class="ghost auth-demo" data-auth="demo">${at('demo')}</button>
      <p class="auth-note muted">🔒 ${at('onDevice')}</p>
      </div>
    </main>
  </div>`;
  authUi.entered = true;
}

// Switching between log in and sign up: the old form slides out, the new one slides in from the other side,
// the pink tab pill glides across and the card eases to its new height.
function switchMode(next) {
  if (next === authUi.mode || authUi.switching) return;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  saveDraft(); authUi.err = '';
  const card = document.querySelector('.auth-card'), body = document.querySelector('.auth-body');
  if (reduce || !card || !body) { authUi.mode = next; renderAuth(); return; }
  const fwd = next === 'signup';
  const from = authUi.mode === 'login' ? 0 : 1;
  const h0 = card.offsetHeight;
  authUi.switching = true;
  const pill = card.querySelector('.auth-tab-pill');
  pill.style.transition = 'transform .2s cubic-bezier(.3,.9,.4,1)'; pill.style.setProperty('--i', 1 - from);
  card.querySelectorAll('.auth-tabs [role=tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.m === next)));
  body.classList.add(fwd ? 'out-start' : 'out-end');
  setTimeout(() => {
    authUi.mode = next; renderAuth();
    const c = document.querySelector('.auth-card'), nb = document.querySelector('.auth-body');
    const h1 = c.offsetHeight;
    c.style.height = h0 + 'px'; c.style.overflow = 'hidden';
    void c.offsetHeight;
    c.classList.add('resizing'); c.style.height = h1 + 'px';
    nb.classList.add(fwd ? 'in-end' : 'in-start');
    setTimeout(() => { c.classList.remove('resizing'); c.style.height = ''; c.style.overflow = ''; nb.classList.remove('in-end', 'in-start'); authUi.switching = false; }, 420);
  }, 200);
}

function accountBlock() {
  const u = currentUser();
  if (!u) return '';
  const role = { producer: t('roleProducer'), lead: t('roleLead'), buyer: t('roleBuyer') }[u.role] || '';
  return `<div class="auth-account"><span class="auth-avatar" aria-hidden="true">${esc((u.demo ? (state.lang === 'ar' ? 'ت' : 'D') : dispName(u) || '?').trim().charAt(0).toUpperCase())}</span>
    <div><small class="muted">${at('signedAs')}</small><b>${esc(dispName(u))}</b><small class="muted">${u.demo ? '' : '+216 ' + esc(u.phone) + ' · '}${esc(role)}</small></div>
    <button type="button" class="ghost" data-auth="logout">${at('logout')}</button></div>`;
}
function userInitial() {
  const u = currentUser();
  return u ? esc((u.demo ? (state.lang === 'ar' ? 'ت' : 'D') : dispName(u) || '?').trim().charAt(0).toUpperCase()) : '⚙';
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-auth]');
  if (!el) return;
  const k = el.dataset.auth;
  if (k === 'mode') switchMode(el.dataset.m);
  else if (k === 'eye') { saveDraft(); authUi.showPin = !authUi.showPin; renderAuth(); }
  else if (k === 'demo') startSession({ id: 'demo', name: 'Demo', phone: '', role: 'lead', demo: true });
  else if (k === 'logout') logout();
});
function saveDraft() {
  const f = document.querySelector('[data-auth-form]');
  if (!f) return;
  const fd = new FormData(f);
  authUi.draft = { nameAr: fd.get('nameAr') || '', nameLat: fd.get('nameLat') || '', touched: authUi.draft.touched || {}, phone: fd.get('phone') || '', village: fd.get('village') || '', role: fd.get('role') || authUi.draft.role };
}
function authError(key, s) { authUi.err = at(key).replace('{s}', s || ''); authUi.busy = false; saveDraft(); renderAuth(); }

document.addEventListener('submit', async (e) => {
  const f = e.target;
  const mode = f.dataset && f.dataset.authForm;
  if (!mode) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (!(window.crypto && crypto.subtle)) return authError('errCrypto');
  const fd = new FormData(f);
  const phone = cleanPhone(fd.get('phone')), pin = String(fd.get('pin') || '');
  if (!/^\d{8}$/.test(phone)) return authError('errPhone');
  if (!/^\d{4,6}$/.test(pin)) return authError('errPin');
  const all = accounts();
  if (mode === 'signup') {
    let nameAr = String(fd.get('nameAr') || '').trim(), nameLat = String(fd.get('nameLat') || '').trim();
    if (!nameAr && !nameLat) return authError('errName');
    if (!nameAr) nameAr = otherSpelling(nameLat);
    if (!nameLat) nameLat = otherSpelling(nameAr);
    nameLat = capWords(nameLat);
    const name = state.lang === 'ar' ? nameAr : nameLat;
    if (pin !== String(fd.get('pin2') || '')) return authError('errPin2');
    if (all.find((a) => a.phone === phone)) { authUi.mode = 'login'; return authError('errTaken'); }
    authUi.busy = true; saveDraft(); renderAuth();
    const h = await hashPin(pin);
    const user = { id: 'U' + phone, name, nameAr, nameLat, phone, village: String(fd.get('village') || '').trim(), role: fd.get('role') || 'producer', salt: h.salt, hash: h.hash, created: new Date().toISOString() };
    all.push(user); writeJson(AUTH_KEY, all);
    authUi.busy = false; startSession(user);
  } else {
    const wait = Math.ceil((authUi.lockUntil - Date.now()) / 1000);
    if (wait > 0) return authError('errLocked', wait);
    authUi.busy = true; saveDraft(); renderAuth();
    const user = all.find((a) => a.phone === phone);
    // Hash even when the phone is unknown so a wrong number and a wrong PIN take the same time.
    const h = await hashPin(pin, user ? user.salt : b64(new Uint8Array(16)));
    if (!user || h.hash !== user.hash) {
      authUi.fails += 1;
      if (authUi.fails >= 5) { authUi.fails = 0; authUi.lockUntil = Date.now() + 30000; return authError('errLocked', 30); }
      return authError('errWrong');
    }
    authUi.busy = false; startSession(user);
  }
}, true);

document.addEventListener('input', (e) => {
  const el = e.target;
  if (!el.dataset || !el.dataset.twin || !el.closest('[data-auth-form]')) return;
  const touched = (authUi.draft.touched = authUi.draft.touched || {});
  touched[el.name] = true;
  const twin = el.form.elements[el.dataset.twin];
  if (twin && !touched[twin.name]) {
    const v = otherSpelling(el.value);
    twin.value = twin.name === 'nameLat' ? capWords(v) : v;
  }
});
