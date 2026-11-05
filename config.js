// Deployment settings. When the app is served by server/index.mjs, that server replaces this file
// so the assistant can reach Claude through /api/assistant. On a static host it stays empty and
// Rafika uses her offline Derja engine (or Claude through claude.ai when opened as an artifact).
window.RABTA_CONFIG = window.RABTA_CONFIG || {};
// Landing hero: a muted, looping YouTube clip plays behind the title when no media/hero.mp4 is present.
// Replace with your own clip's ID, or set to '' to keep only the animated backdrop.
if (window.RABTA_CONFIG.heroYoutube === undefined) window.RABTA_CONFIG.heroYoutube = ''; // media/hero.mp4 is used instead
