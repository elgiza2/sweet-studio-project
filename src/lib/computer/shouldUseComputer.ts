/**
 * @doc Heuristic router: decides whether a chat turn needs a full computer
 * (browser + terminal + files) instead of a plain model reply. Runs fully
 * client-side and is intentionally conservative — only clearly "do this on a
 * computer for me" requests are routed.
 */

const STRONG_EN = [
  /\bbrows(e|ing)\b.*\b(site|website|web|internet)\b/i,
  /\b(go to|open|visit|log in to|login to|sign in to)\b.*\b(https?:\/\/|www\.|\.com|\.net|\.org|website|site)\b/i,
  /\b(scrape|crawl|download)\b.*\b(site|website|page|data|files?)\b/i,
  /\b(run|execute)\b.*\b(script|command|terminal|shell|code|program)\b/i,
  /\b(book|order|buy|apply|fill (in|out)|submit)\b.*\b(form|ticket|flight|hotel|order|application)\b/i,
  /\b(build|create|generate)\b.*\b(project|repo|app|website|dashboard)\b.*\b(files?|zip|folder)\b/i,
  /\b(automate|automation)\b/i,
  /\bcomputer (use|task)\b/i,
];

const STRONG_AR = [
  /افتح\s+(موقع|الموقع|المتصفح|كروم|رابط)/,
  /(ادخل|سجل\s*دخول)\s+(على|في)?\s*(موقع|الموقع|حساب)/,
  /(نزّل|نزل|حمّل|حمل)\s+(الملف|ملفات|البيانات|الموقع)/,
  /(شغّل|شغل|نفّذ|نفذ)\s+(كود|سكربت|أمر|برنامج|تيرمنال)/,
  /(اعمل|انشئ|أنشئ)\s+.*(ملف|مجلد|مشروع|سكربت)/,
  /(احجز|اشتري|اطلب|املأ)\s+/,
  /أتمتة|اوتوميشن/,
];

/**
 * True when the request should run on the Computer Agent.
 * `explicit` covers the @computer mention which always routes.
 */
export function shouldUseComputer(text: string): boolean {
  const t = (text || "").trim();
  if (!t) return false;
  if (/(^|\s)@computer\b/i.test(t)) return true;
  if (t.length < 12) return false;
  const hits =
    STRONG_EN.filter((r) => r.test(t)).length + STRONG_AR.filter((r) => r.test(t)).length;
  return hits > 0;
}

/** Strips the @computer mention so the provider never sees routing syntax. */
export function stripComputerMention(text: string): string {
  return (text || "").replace(/(^|\s)@computer\b/gi, " ").trim();
}
