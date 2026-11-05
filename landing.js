/* Landing page: a full-bleed hero with a silent looping video, then the problem, what Dihya does and how it works.
 * Hero video, in order of preference:
 *  1. media/hero.webm or media/hero.mp4 (a short muted clip you have the rights to; see media/README.md)
 *  2. a muted, looping YouTube embed when RABTA_CONFIG.heroYoutube is set (works on GitHub Pages, not inside claude.ai)
 *  3. an animated night-sky backdrop, always present underneath. */
'use strict';

const LT = {
  en: {
    eyebrow: 'Women-led rural cooperatives · Tunisia',
    title: 'From her <i>H</i>ands to the <i>B</i>uyer', sub: 'Rural women\'s cooperatives of Tunisia', navProblem: 'The problem', navWhat: 'What it does', navHow: 'How it works',
    lead: 'Dihya links women olive pickers, distillers and weavers to direct buyers, proves where every product comes from, and keeps them safe in the heat and on the road.',
    open: 'Open the app', shop: 'Visit the shop', talk: 'Talk to Rafika',
    problemH: 'The problem', problemSub: 'Women do most of the farm work in rural Tunisia, yet they earn least from it and take the biggest risks.',
    s1: 'of the rural agricultural workforce are women', s2: 'of them earn an income of their own', s3: 'women farmworkers killed in transport accidents, 2015–2024',
    srcNote: 'Figures cited in our technical report.',
    whatH: 'What Dihya does',
    f1h: 'Signed product passports', f1: 'A QR label any buyer can scan to check who made the product, where and how. Change one number and the signature breaks.',
    f2h: 'Pooled direct sales', f2: 'Small batches become one lot a hotel or shop can order. Each woman sees her share and what she earned over the middleman.',
    f3h: 'Heat and transport safety', f3: 'Heat-stress forecast with the safest working hours, an SOS button, and a check that refuses open pickups and overloaded vans.',
    f4h: 'Rafika, a voice assistant', f4: 'Speak in Tunisian Derja and she answers aloud: record a harvest, check prices, book the olive comb. Works offline.',
    howH: 'How it works',
    h1h: 'Record the harvest', h1: 'Each woman logs her batch by voice or with a few taps. The app signs it and prints the QR label.',
    h2h: 'Pool and sell direct', h2: 'The cooperative pools batches into lots, shares the shop link on WhatsApp and confirms orders.',
    h3h: 'Get paid, stay safe', h3: 'Payouts are split by quantity, and the safety tools travel with every trip to the field.',
    ctaH: 'Built offline-first, in Arabic, French and English.', ctaSub: 'Runs in any phone browser, installs like an app, and keeps working without network.',
    videoNote: 'Background footage', footer: 'Dihya prototype · TSYP 14 WIE challenge'
  },
  fr: {
    eyebrow: 'Coopératives rurales de femmes · Tunisie',
    title: 'De ses <i>M</i>ains à l\'<i>A</i>cheteur', sub: 'Coopératives de femmes rurales de Tunisie', navProblem: 'Le problème', navWhat: 'Ce qu\'elle fait', navHow: 'Comment ça marche',
    lead: 'Dihya relie les cueilleuses d\'olives, distillatrices et tisserandes aux acheteurs directs, prouve l\'origine de chaque produit et les protège de la chaleur et sur la route.',
    open: 'Ouvrir l\'application', shop: 'Voir la boutique', talk: 'Parler à Rafika',
    problemH: 'Le problème', problemSub: 'Les femmes font l\'essentiel du travail agricole en Tunisie rurale, mais elles en gagnent le moins et prennent le plus de risques.',
    s1: 'de la main-d\'œuvre agricole rurale sont des femmes', s2: 'd\'entre elles ont un revenu propre', s3: 'ouvrières agricoles tuées dans des accidents de transport, 2015–2024',
    srcNote: 'Chiffres cités dans notre rapport technique.',
    whatH: 'Ce que fait Dihya',
    f1h: 'Passeports produits signés', f1: 'Une étiquette QR que tout acheteur peut scanner pour vérifier qui a fait le produit, où et comment.',
    f2h: 'Ventes directes groupées', f2: 'Les petits lots deviennent un lot qu\'un hôtel ou une boutique peut commander. Chaque femme voit sa part.',
    f3h: 'Sécurité chaleur et transport', f3: 'Prévision du stress thermique, bouton SOS, et contrôle qui refuse les pickups ouverts et surchargés.',
    f4h: 'Rafika, assistante vocale', f4: 'Parlez en derja tunisienne, elle répond à voix haute : enregistrer une récolte, voir les prix, réserver un outil.',
    howH: 'Comment ça marche',
    h1h: 'Enregistrer la récolte', h1: 'Chaque femme saisit son lot à la voix ou en quelques touches. L\'app le signe et imprime l\'étiquette QR.',
    h2h: 'Grouper et vendre en direct', h2: 'La coopérative regroupe les lots, partage la boutique sur WhatsApp et confirme les commandes.',
    h3h: 'Être payée, rester en sécurité', h3: 'Les paiements sont répartis selon les quantités, et les outils de sécurité accompagnent chaque trajet.',
    ctaH: 'Pensée hors ligne, en arabe, français et anglais.', ctaSub: 'Fonctionne dans tout navigateur mobile, s\'installe comme une app et marche sans réseau.',
    videoNote: 'Vidéo de fond', footer: 'Prototype Dihya · défi WIE TSYP 14'
  },
  ar: {
    eyebrow: 'تعاونيات نسائية ريفية · تونس',
    title: 'من <i>يديها</i> إلى <i>المشتري</i>', sub: 'تعاونيات النساء الريفيات في تونس', navProblem: 'المشكلة', navWhat: 'ماذا تفعل', navHow: 'كيف تعمل',
    lead: 'ديهيا تربط جانيات الزيتون والمقطّرات والنسّاجات بالمشترين مباشرة، تثبت مصدر كل منتوج، وتحميهن من الحرارة وفي الطريق.',
    open: 'افتحي التطبيق', shop: 'زوري المتجر', talk: 'احكي مع رفيقة',
    problemH: 'المشكلة', problemSub: 'النساء يقمن بأغلب العمل الفلاحي في الريف التونسي، لكنهن الأقل ربحا والأكثر عرضة للخطر.',
    s1: 'من اليد العاملة الفلاحية الريفية نساء', s2: 'فقط منهن لديهن دخل خاص', s3: 'عاملة فلاحية توفيت في حوادث نقل، 2015–2024',
    srcNote: 'الأرقام مذكورة في تقريرنا التقني.',
    whatH: 'ماذا تفعل ديهيا',
    f1h: 'جوازات منتوج موقّعة', f1: 'ملصق QR يمسحه أي مشترٍ ليعرف من صنع المنتوج وأين وكيف. تغيير رقم واحد يكسر التوقيع.',
    f2h: 'بيع مباشر مجمّع', f2: 'الكميات الصغيرة تصبح حصة واحدة يطلبها نزل أو محل. كل امرأة ترى نصيبها وربحها مقارنة بالوسيط.',
    f3h: 'السلامة من الحرارة وفي النقل', f3: 'توقع الإجهاد الحراري وأفضل ساعات العمل، زر نجدة، وفحص يرفض البيكوب المكشوف والحمولة الزائدة.',
    f4h: 'رفيقة، مساعدة صوتية', f4: 'احكي بالتونسي وتجاوبك بالصوت: سجّلي صابة، اعرفي الأسوام، احجزي المشط. تخدم بلا إنترنت.',
    howH: 'كيف تعمل',
    h1h: 'سجّلي الصابة', h1: 'كل امرأة تسجّل كميتها بالصوت أو بلمسات قليلة. التطبيق يوقّعها ويطبع ملصق QR.',
    h2h: 'جمّعي وبيعي مباشرة', h2: 'التعاونية تجمع الكميات في حصص، تشارك رابط المتجر على واتساب وتؤكد الطلبيات.',
    h3h: 'خلاص مضمون وسلامة', h3: 'المداخيل تقسم حسب الكمية، وأدوات السلامة ترافق كل رحلة إلى الحقل.',
    ctaH: 'يعمل دون إنترنت، بالعربية والفرنسية والإنجليزية.', ctaSub: 'يشتغل في أي متصفح هاتف، يثبّت كتطبيق، ويواصل العمل دون شبكة.',
    videoNote: 'فيديو الخلفية', footer: 'نموذج ديهيا · تحدي WIE في TSYP 14'
  }
};
const lt = (k) => (LT[state.lang] || LT.en)[k];

function heroMedia() {
  const yt = window.RABTA_CONFIG && window.RABTA_CONFIG.heroYoutube;
  return `<div class="lp-media" aria-hidden="true">
      <div class="lp-sky"></div>
      ${yt ? `<iframe class="lp-yt" tabindex="-1" title="" allow="autoplay; encrypted-media" referrerpolicy="strict-origin-when-cross-origin"
        src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt)}?autoplay=1&mute=1&loop=1&playlist=${encodeURIComponent(yt)}&controls=0&disablekb=1&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3"></iframe>` : ''}
      <video class="lp-video" autoplay muted loop playsinline preload="auto"><source src="media/hero.webm" type="video/webm"><source src="media/hero.mp4" type="video/mp4" onerror="this.parentNode.remove()"></video>
      <div class="lp-shade"></div>
    </div>`;
}

function renderLanding() {
  const nav = `<div class="lp-bar"><header class="lp-nav">
      <a class="lp-logo" href="#/welcome" aria-label="Dihya">Dihya</a>
      <nav class="lp-links" aria-label="Sections">
        <button data-scroll="lp-problem">${lt('navProblem')}</button><button data-scroll="lp-what">${lt('navWhat')}</button><button data-scroll="lp-how">${lt('navHow')}</button>
      </nav>
      <div class="top-actions">${currentUser() ? '' : `<button class="lp-login" data-act="enter">${at('login')}</button>`}${langSelect()}</div>
    </header></div>`;
  const stat = (n, k) => `<div class="lp-stat reveal"><b data-count="${n.replace(/\D/g, '')}" data-suffix="${n.replace(/[\d]/g, '')}">${n}</b><span>${lt(k)}</span></div>`;
  const feat = (ic, k) => `<article class="lp-feat reveal"><span class="lp-ic" aria-hidden="true">${ic}</span><h3>${lt(k + 'h')}</h3><p>${lt(k)}</p></article>`;
  const step = (n, k) => `<li class="lp-step reveal"><span class="lp-num">${n}</span><div><h3>${lt(k + 'h')}</h3><p>${lt(k)}</p></div></li>`;
  app().innerHTML = `<div class="landing view-enter">
    ${nav}
    <section class="lp-hero">
      ${heroMedia()}
      <div class="lp-hero-in">
        <h1 class="lp-title">${lt('title')}</h1>
        <p class="lp-subtitle">${lt('sub')}</p>
        <div class="lp-ctas center">
          <button class="lp-btn solid" data-act="enter">${lt('open')} <span class="arrow" aria-hidden="true">→</span></button>
          <a class="lp-btn" href="#/shop">${lt('shop')}</a>
        </div>
      </div>
      <button class="lp-scroll" data-scroll="lp-problem" aria-label="${lt('problemH')}"><span></span></button>
    </section>
    <section class="lp-sec" id="lp-problem">
      <div class="lp-wrap">
        <h2 class="reveal">${lt('problemH')}</h2>
        <p class="lp-sub reveal">${lt('problemSub')}</p>
        <div class="lp-stats">${stat('58%', 's1')}${stat('20%', 's2')}${stat('60', 's3')}</div>
        <p class="muted lp-src">${lt('srcNote')}</p>
      </div>
    </section>
    <section class="lp-sec alt" id="lp-what">
      <div class="lp-wrap">
        <h2 class="reveal">${lt('whatH')}</h2>
        <p class="lp-sub reveal">${lt('lead')}</p>
        <div class="lp-feats">${feat('▣', 'f1')}${feat('⬡', 'f2')}${feat('☀', 'f3')}${feat('🎙', 'f4')}</div>
      </div>
    </section>
    <section class="lp-sec" id="lp-how">
      <div class="lp-wrap">
        <h2 class="reveal">${lt('howH')}</h2>
        <ol class="lp-steps">${step(1, 'h1')}${step(2, 'h2')}${step(3, 'h3')}</ol>
      </div>
    </section>
    <section class="lp-cta">
      <div class="lp-wrap">
        <h2 class="reveal">${lt('ctaH')}</h2>
        <p class="reveal">${lt('ctaSub')}</p>
        <div class="lp-ctas center"><button class="lp-btn solid" data-act="enter">${lt('open')} <span class="arrow" aria-hidden="true">→</span></button>
          <button class="lp-btn" data-rq="open">${lt('talk')}</button></div>
      </div>
    </section>
    <footer class="lp-foot"><div class="lp-wrap"><span class="logo" aria-hidden="true">Dihya</span> ${lt('footer')}</div></footer>
  </div>`;
  initLanding();
  onLandingScroll();
}

// The top bar turns solid once the page starts covering the hero, and the hero fades as it is covered.
function onLandingScroll() {
  const bar = document.querySelector('.lp-bar');
  if (!bar) return;
  const h = window.innerHeight || 1;
  bar.classList.toggle('solid', window.scrollY > 40);
  const hero = document.querySelector('.lp-hero');
  if (hero) hero.style.setProperty('--cover', Math.min(1, window.scrollY / h).toFixed(3));
}
window.addEventListener('scroll', onLandingScroll, { passive: true });

// Scroll reveals and count-up. Everything is visible at rest; JS only adds motion when the browser supports it.
function initLanding() {
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;
  const els = document.querySelectorAll('.landing .reveal');
  els.forEach((el) => el.classList.add('pre'));
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      en.target.classList.remove('pre'); en.target.classList.add('in');
      const b = en.target.querySelector('[data-count]');
      if (b) countUp(b);
      io.unobserve(en.target);
    }
  }, { threshold: 0.15 });
  els.forEach((el) => io.observe(el));
}
function countUp(b) {
  const end = +b.dataset.count, suf = b.dataset.suffix || '', t0 = performance.now(), dur = 1200;
  const step = (now) => {
    const p = Math.min(1, (now - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
    b.textContent = v + suf;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// In-page links scroll instead of changing the URL hash (the hash is the app's router).
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-scroll]'); if (!b) return;
  const el = document.getElementById(b.dataset.scroll);
  if (el) el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
});
