/**
 * Remote auto-translation cache.
 *
 * Used by the DOM translator (src/lib/domTranslator.ts) as a fallback for any
 * English string that isn't in the local dictionary (src/lib/authI18n.ts).
 *
 * Flow:
 *  1. lookupRemote(source, lang) — synchronous read from in-memory cache
 *     (hydrated from localStorage on load).
 *  2. reportUnknown(source, lang) — queues a source string for backfill.
 *  3. A debounced flush:
 *       a) Fetches cached rows from public.i18n_translations.
 *       b) For DB misses, calls the `i18n-translate` edge function.
 *       c) Refetches, populates the in-memory cache, persists to localStorage,
 *          and re-runs the DOM translator so the page updates in place.
 */
import { supabase } from "@/integrations/supabase/client";
import { retranslateAll } from "@/lib/domTranslator";
import type { AuthLang } from "@/lib/authI18n";
import { cachedJson } from "@/lib/persistentCache";

/**
 * Prewarm dictionaries used to live in `src/lib/i18n/prewarm.json` (1.2 MB),
 * which meant every visitor downloaded all 25 languages inside the JS bundle.
 * They are now static assets under `public/i18n/prewarm/<lang>.json` and are
 * fetched lazily — only for the language actually in use (~35 KB).
 */
const PREWARM = new Map<string, Record<string, string>>();
const prewarmRequested = new Set<string>();

function ensurePrewarm(lang: string) {
  if (!lang || lang === "en" || prewarmRequested.has(lang)) return;
  prewarmRequested.add(lang);
  // Fetched on first use only; afterwards it is served from the local runtime
  // cache (localStorage / Cache Storage) with no network request at all.
  void cachedJson<Record<string, string>>(`/i18n/prewarm/${encodeURIComponent(lang)}.json`, {
    key: `i18n:prewarm:${lang}`,
  })
    .then((seed) => {
      if (!seed) return;
      PREWARM.set(lang, seed);
      const c = caches.get(lang);
      if (c) {
        for (const [k, v] of Object.entries(seed)) if (!c.has(k)) c.set(k, v);
      }
      retranslateAll();
    })
    .catch(() => {});
}


const NAMESPACE = "auto";
const STORAGE_KEY = (lang: string) => `megsy:i18n:auto:${lang}`;
const MAX_LEN = 400; // don't try to translate huge blobs via DOM path
const FLUSH_MS = 450;
const MAX_PER_FLUSH = 60;
const MAX_PENDING_PER_LANG = 1800;

type LangCache = Map<string, string>; // source → translation
const caches = new Map<string, LangCache>(); // lang → cache
const pending = new Map<string, Set<string>>(); // lang → sources awaiting flush
const inflight = new Set<string>(); // lang currently being flushed
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function loadFromStorage(lang: string): LangCache {
  const cache: LangCache = new Map();
  try {
    const raw = localStorage.getItem(STORAGE_KEY(lang));
    if (raw) {
      const obj = JSON.parse(raw) as Record<string, string>;
      for (const [k, v] of Object.entries(obj)) cache.set(k, v);
    }
  } catch {
    /* ignore */
  }
  return cache;
}

function persistToStorage(lang: string, cache: LangCache) {
  try {
    const obj: Record<string, string> = {};
    // Cap persisted size to avoid unbounded localStorage growth.
    let n = 0;
    for (const [k, v] of cache) {
      obj[k] = v;
      if (++n > 5000) break;
    }
    localStorage.setItem(STORAGE_KEY(lang), JSON.stringify(obj));
  } catch {
    /* ignore quota errors */
  }
}

function getCache(lang: string): LangCache {
  ensurePrewarm(lang);
  let c = caches.get(lang);
  if (!c) {
    c = loadFromStorage(lang);
    const seed = PREWARM.get(lang);
    if (seed) {
      for (const [k, v] of Object.entries(seed)) {
        if (!c.has(k)) c.set(k, v);
      }
    }
    caches.set(lang, c);
  }
  return c;
}


export function lookupRemote(source: string, lang: string): string | null {
  if (!lang || lang === "en") return null;
  const c = getCache(lang);
  return c.get(source) ?? null;
}

function isEnglishSource(source: string): boolean {
  const s = source.trim();
  if (!/[A-Za-z]{2}/.test(s)) return false;
  // Already-localized text can still contain model/brand tokens like MC, PDF,
  // ChatGPT, SSO. Do not send mixed-script text through the English pipeline.
  if (/[\u0600-\u06FF\u0590-\u05FF\u0900-\u097F\u0E00-\u0E7F\u0400-\u04FF\u0370-\u03FF\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF]/.test(s)) {
    return false;
  }
  const words = s
    .toLowerCase()
    .replace(/[^a-z0-9+./-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (
    words.length > 0 &&
    words.every((w) =>
      /^(megsy|chatgpt|claude|gemini|openai|midjourney|runway|gpt|grok|deepseek|lovable|bolt|codex|gamma|api|pdf|png|tts|mc|sso|saml|sla|os|pro|elite|business|4k|24\/7)$/.test(w),
    )
  ) {
    return false;
  }
  return true;
}

export function reportUnknown(source: string, lang: string) {
  if (!lang || lang === "en") return;
  if (typeof source !== "string") return;
  const s = source.trim();
  if (!s || s.length > MAX_LEN) return;
  if (!isEnglishSource(s)) return;
  const c = getCache(lang);
  if (c.has(s)) return;
  let set = pending.get(lang);
  if (!set) {
    set = new Set();
    pending.set(lang, set);
  }
  if (set.size >= MAX_PENDING_PER_LANG) return;
  set.add(s);
  scheduleFlush();
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushAll();
  }, FLUSH_MS);
}

async function flushAll() {
  const langs = Array.from(pending.keys());
  for (const lang of langs) {
    if (inflight.has(lang)) continue;
    const set = pending.get(lang);
    if (!set || set.size === 0) continue;
    const sources = Array.from(set).slice(0, MAX_PER_FLUSH);
    for (const s of sources) set.delete(s);
    inflight.add(lang);
    try {
      await flushLang(lang as AuthLang, sources);
    } catch (e) {
      console.warn("[remoteI18n] flush failed", e);
    } finally {
      inflight.delete(lang);
    }
  }
  // If more items got queued during the flush, schedule another pass.
  for (const [, set] of pending) {
    if (set.size > 0) {
      scheduleFlush();
      break;
    }
  }
}

async function flushLang(lang: AuthLang, sources: string[]) {
  if (sources.length === 0) return;
  const cache = getCache(lang);
  const missing: string[] = [];

  // 1. Try to hydrate from the DB cache first (cheap, no AI cost).
  try {
    const { data, error } = await supabase
      .from("i18n_translations")
      .select("entry_key, translated_value")
      .eq("namespace", NAMESPACE)
      .eq("language", lang)
      .in("entry_key", sources);
    if (error) throw error;
    const found = new Set<string>();
    for (const r of (data || []) as { entry_key: string; translated_value: unknown }[]) {
      const v = typeof r.translated_value === "string" ? r.translated_value : String(r.translated_value ?? "");
      if (v && v !== r.entry_key) {
        cache.set(r.entry_key, v);
        found.add(r.entry_key);
      }
    }
    for (const s of sources) if (!found.has(s)) missing.push(s);
  } catch (e) {
    console.warn("[remoteI18n] db fetch failed", e);
    missing.push(...sources);
  }

  // 2. Ask the edge function to translate anything not in the DB yet.
  if (missing.length > 0) {
    try {
      await supabase.functions.invoke("i18n-translate", {
        body: {
          namespace: NAMESPACE,
          language: lang,
          entries: missing.map((s) => ({ key: s, value: s })),
          trigger: "dom-auto",
        },
      });
      // Refetch newly translated rows.
      const { data } = await supabase
        .from("i18n_translations")
        .select("entry_key, translated_value")
        .eq("namespace", NAMESPACE)
        .eq("language", lang)
        .in("entry_key", missing);
      for (const r of (data || []) as { entry_key: string; translated_value: unknown }[]) {
        const v = typeof r.translated_value === "string" ? r.translated_value : String(r.translated_value ?? "");
        if (v && v !== r.entry_key) cache.set(r.entry_key, v);
      }
    } catch (e) {
      console.warn("[remoteI18n] edge translate failed", e);
    }
  }

  persistToStorage(lang, cache);
  // Nudge the DOM translator so the visible page picks up new translations.
  try {
    retranslateAll();
  } catch {
    /* ignore */
  }
}
