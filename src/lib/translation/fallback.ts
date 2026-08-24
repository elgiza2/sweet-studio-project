/**
 * Online fallback translator.
 *
 * Runs AFTER the local dictionary in `authI18n.ts`. For any English text node
 * left on the page, it translates via free public APIs (Lingva mirrors →
 * MyMemory) and caches the result in localStorage so subsequent visits are
 * instant and offline-friendly.
 *
 * Design:
 * - Cache key: `xlate:{targetLang}:{sha1(text)}` — but for size we just use
 *   the raw text (LocalStorage per-lang capped).
 * - Batching: 8 texts in-flight, small polite delay.
 * - Skips: same rules as domTranslator (script/style/code/pre/input/textarea,
 *   contenteditable, `[data-no-translate]`, brand words).
 * - Idempotent: remembers the original text on the node via WeakMap so
 *   switching languages always translates from source.
 */

import { getUserLang, translateExactText } from "@/lib/authI18n";

const ORIGINAL = new WeakMap<Text, string>();
const IN_FLIGHT = new Map<string, Promise<string | null>>();
const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "CODE",
  "PRE",
  "TEXTAREA",
  "INPUT",
  "NOSCRIPT",
  "SVG",
  "PATH",
  "CANVAS",
  "TEMPLATE",
]);
const ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;
// Brand/product names never translated.
const BRAND_TOKENS = new Set([
  "megsy",
  "megsy ai",
  "chatgpt",
  "claude",
  "midjourney",
  "gemini",
  "openai",
  "anthropic",
  "supabase",
  "lovable",
  "figma",
  "notion",
  "stripe",
  "slack",
  "airbnb",
  "spotify",
  "cisco",
  "ebay",
  "walmart",
  "pinterest",
  "uber",
  "sony",
  "netflix",
  "zoom",
  "adobe",
  "shopify",
  "bolt",
  "codex",
  "gamma",
  "perplexity",
  "higgsfield",
  "claude code",
]);

const CACHE_PREFIX = "xlate_v1:";
const MAX_CACHE_ENTRIES = 5000;

function cacheGet(lang: string, text: string): string | null {
  try {
    return localStorage.getItem(CACHE_PREFIX + lang + ":" + text);
  } catch {
    return null;
  }
}

function cacheSet(lang: string, text: string, translated: string) {
  try {
    localStorage.setItem(CACHE_PREFIX + lang + ":" + text, translated);
  } catch {
    // Quota exceeded — clear some entries for this language
    try {
      let removed = 0;
      for (let i = localStorage.length - 1; i >= 0 && removed < 500; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key);
          removed++;
        }
      }
      localStorage.setItem(CACHE_PREFIX + lang + ":" + text, translated);
    } catch {
      /* give up */
    }
  }
}

function shouldSkipEl(el: Element | null): boolean {
  let n: Element | null = el;
  while (n) {
    if (SKIP_TAGS.has(n.tagName)) return true;
    if (n.getAttribute?.("data-no-translate") === "true") return true;
    if (n.getAttribute?.("contenteditable") === "true") return true;
    n = n.parentElement;
  }
  return false;
}

function shouldSkipAttr(el: Element | null): boolean {
  let n: Element | null = el;
  let first = true;
  while (n) {
    if (SKIP_TAGS.has(n.tagName) && !(first && (n.tagName === "INPUT" || n.tagName === "TEXTAREA"))) return true;
    if (n.getAttribute?.("data-no-translate") === "true") return true;
    if (n.getAttribute?.("contenteditable") === "true") return true;
    first = false;
    n = n.parentElement;
  }
  return false;
}

function cleanBrandText(text: string): string {
  return text
    .replace(/Cleopatra/gi, "Megsy")
    .replace(/كليوباترا|كليوپاترا/g, "ميغسي");
}

// BCP-47 → what the APIs expect
function apiLang(lang: string): string {
  if (lang === "ar-eg") return "ar";
  if (lang === "zh") return "zh";
  return lang;
}

const ENDPOINTS: Array<(s: string, t: string, q: string) => string> = [
  (s, t, q) => `https://lingva.ml/api/v1/${s}/${t}/${encodeURIComponent(q)}`,
  (s, t, q) => `https://translate.plausibility.cloud/api/v1/${s}/${t}/${encodeURIComponent(q)}`,
  (s, t, q) => `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${s}|${t}`,
];

async function translateOne(target: string, text: string): Promise<string | null> {
  const tgt = apiLang(target);
  for (const make of ENDPOINTS) {
    try {
      const res = await fetch(make("en", tgt, text), { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const data = await res.json();
      const translated: string | undefined =
        data?.translation || data?.responseData?.translatedText;
      if (translated && typeof translated === "string" && translated.trim()) {
        return translated;
      }
    } catch {
      /* next */
    }
  }
  return null;
}

function fetchTranslation(lang: string, text: string): Promise<string | null> {
  const key = lang + ":" + text;
  const existing = IN_FLIGHT.get(key);
  if (existing) return existing;
  const promise = translateOne(lang, text).then((r) => {
    IN_FLIGHT.delete(key);
    if (r) cacheSet(lang, text, r);
    return r;
  });
  IN_FLIGHT.set(key, promise);
  return promise;
}

function isEnglishCandidate(s: string): boolean {
  if (s.length < 2) return false;
  const letters = s.match(/[A-Za-z]/g);
  if (!letters || letters.length < 2) return false;
  // If it contains non-Latin script chars, assume already translated.
  if (/[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF]/.test(s)) {
    return false;
  }
  const lower = s.toLowerCase().trim();
  if (BRAND_TOKENS.has(lower)) return false;
  return true;
}

let running = false;
let scheduled = false;

async function processOnce() {
  if (running) return;
  const lang = getUserLang();
  if (lang === "en") return;
  running = true;
  try {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) {
      const tn = n as Text;
      const parent = tn.parentElement;
      if (!parent || shouldSkipEl(parent)) continue;
      const raw = tn.nodeValue ?? "";
      const cleaned = cleanBrandText(raw);
      if (cleaned !== raw) tn.nodeValue = cleaned;
      const trimmed = cleaned.trim();
      if (!isEnglishCandidate(trimmed)) continue;
      nodes.push(tn);
    }

    // Attributes are visible UI too: placeholders, tooltips, ARIA labels and image alt text.
    const attrWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let elNode: Node | null;
    while ((elNode = attrWalker.nextNode())) {
      const el = elNode as Element;
      if (shouldSkipAttr(el)) continue;
      for (const attr of ATTRS) {
        const raw = el.getAttribute(attr);
        if (!raw) continue;
        const cleaned = cleanBrandText(raw);
        const source = cleaned.trim();
        if (cleaned !== raw) el.setAttribute(attr, cleaned);
        if (!isEnglishCandidate(source)) continue;
        const exact = translateExactText(source, lang as any);
        if (exact !== source) {
          el.setAttribute(attr, exact);
          continue;
        }
        const cached = cacheGet(lang, source);
        if (cached) {
          el.setAttribute(attr, cached);
          continue;
        }
        void fetchTranslation(lang, source).then((translated) => {
          if (translated && el.isConnected && el.getAttribute(attr)?.trim() === source) {
            el.setAttribute(attr, translated);
          }
        });
      }
    }

    // First apply dictionary / cached translations synchronously.
    const pending: Text[] = [];
    for (const tn of nodes) {
      const raw = tn.nodeValue ?? "";
      const trimmed = cleanBrandText(raw).trim();
      const source = ORIGINAL.get(tn) ?? trimmed;
      if (!ORIGINAL.has(tn)) ORIGINAL.set(tn, source);
      const lead = raw.match(/^\s*/)?.[0] ?? "";
      const tail = raw.match(/\s*$/)?.[0] ?? "";
      // 1. Local dictionary (exact match, case-insensitive fallbacks).
      const exact = translateExactText(source, lang as any);
      if (exact && exact !== source) {
        tn.nodeValue = `${lead}${exact}${tail}`;
        cacheSet(lang, source, exact);
        continue;
      }
      // 2. Persistent cache from prior API calls.
      const cached = cacheGet(lang, source);
      if (cached) {
        tn.nodeValue = `${lead}${cached}${tail}`;
      } else {
        pending.push(tn);
      }
    }

    // Then fetch missing ones in small parallel batches.
    const CONCURRENCY = 10;
    const MAX_PER_PASS = 300;
    const queue = pending.slice(0, MAX_PER_PASS);
    let index = 0;
    async function worker() {
      while (index < queue.length) {
        const tn = queue[index++];
        const source = ORIGINAL.get(tn);
        if (!source) continue;
        const raw = tn.nodeValue ?? "";
        if (!tn.parentElement) continue;
        const translated = await fetchTranslation(lang, source);
        if (translated && translated !== source) {
          const lead = raw.match(/^\s*/)?.[0] ?? "";
          const tail = raw.match(/\s*$/)?.[0] ?? "";
          if (tn.parentElement) tn.nodeValue = `${lead}${translated}${tail}`;
        }
        await new Promise((r) => setTimeout(r, 20));
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    // If there was more pending than we processed, schedule another pass.
    if (pending.length > MAX_PER_PASS) {
      setTimeout(() => {
        scheduled = false;
        void processOnce();
      }, 400);
    }
  } finally {
    running = false;
  }
}

export function scheduleFallbackTranslate() {
  // Disabled: the online fallback translator relied on public Lingva /
  // MyMemory mirrors that are unreliable and were breaking hydration
  // (labels rendering as "نسبة التكبير", flashes of English, etc).
  // The app now relies on the local dictionary in `authI18n.ts` +
  // per-page i18n files (e.g. `src/lib/landing/mobile-i18n/*`).
  return;
}

// legacy export kept for compat
export async function runFallbackTranslate(_targetLang: string) {
  return;
}
