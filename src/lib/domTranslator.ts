/**
 * DOM auto-translator.
 *
 * Walks the rendered DOM and rewrites any English text node or common
 * attribute (placeholder / title / aria-label / alt) whose trimmed value
 * matches an entry in the shared UI_DICT / EXACT_TEXT_TRANSLATIONS
 * dictionaries in `authI18n.ts`.
 *
 * This lets us translate every visible page ("every atom") without
 * editing hundreds of hardcoded JSX strings — new keys added to the
 * dictionary flow to every page automatically.
 *
 * Non-goals:
 *   - We do NOT translate free-form English text that isn't in the dict.
 *   - We do NOT touch <input value>, <textarea value>, code blocks,
 *     scripts, styles, contenteditable, or any element flagged with
 *     data-no-translate.
 */

import { getUserLang, translateExactText, type AuthLang } from "@/lib/authI18n";
import { lookupRemote, reportUnknown } from "@/lib/remoteI18n";

const ORIGINAL = new WeakMap<Node | Element, string>();
const ORIGINAL_ATTR = new WeakMap<Element, Record<string, string>>();
// Last value this translator itself wrote. If the DOM value differs from it,
// the app (React) re-rendered the node with new content, so the cached
// "original" is stale and must be refreshed — otherwise we would overwrite
// the app's new text with the old one (e.g. the model-picker label).
const WRITTEN = new WeakMap<Node, string>();
const WRITTEN_ATTR = new WeakMap<Element, Record<string, string>>();

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

function shouldSkip(el: Element | null): boolean {
  let node: Element | null = el;
  while (node) {
    if (SKIP_TAGS.has(node.tagName)) return true;
    if (node.getAttribute?.("data-no-translate") === "true") return true;
    if (node.getAttribute?.("contenteditable") === "true") return true;
    node = node.parentElement;
  }
  return false;
}

function shouldSkipAttr(el: Element | null): boolean {
  let node: Element | null = el;
  let first = true;
  while (node) {
    if (SKIP_TAGS.has(node.tagName) && !(first && (node.tagName === "INPUT" || node.tagName === "TEXTAREA"))) {
      return true;
    }
    if (node.getAttribute?.("data-no-translate") === "true") return true;
    if (node.getAttribute?.("contenteditable") === "true") return true;
    first = false;
    node = node.parentElement;
  }
  return false;
}

function translateTextNode(node: Text, lang: AuthLang) {
  const raw = node.nodeValue ?? "";
  const cleaned = raw
    .replace(/Cleopatra/gi, "Megsy")
    .replace(/كليوباترا|كليوپاترا/g, "ميغسي");
  if (cleaned !== raw) node.nodeValue = cleaned;
  const trimmed = cleaned.trim();
  if (!trimmed || trimmed.length < 2) return;
  // Require at least one ASCII letter run of 2+ chars so digit/symbol-only
  // strings are skipped, but phrases like "24/7 priority chat support" or
  // "$25/MONTH" still translate.
  if (!/[A-Za-z]{2}/.test(trimmed)) return;
  if (shouldSkip(node.parentElement)) return;

  // Remember the original English once, so language switches always
  // translate from the source (not from a previously translated string).
  // If the current text is not what we last wrote, the app replaced it —
  // treat the new text as the new source.
  const lastWritten = WRITTEN.get(node);
  let source = ORIGINAL.get(node);
  if (!source || (lastWritten !== undefined && lastWritten !== raw)) {
    source = trimmed;
    ORIGINAL.set(node, source);
  }

  const write = (next: string) => {
    if (node.nodeValue !== next) node.nodeValue = next;
    WRITTEN.set(node, next);
  };

  const lead = raw.match(/^\s*/)?.[0] ?? "";
  const tail = raw.match(/\s*$/)?.[0] ?? "";

  const translated = translateExactText(source, lang);
  if (translated !== source) {
    // Preserve leading/trailing whitespace so inline layout stays intact.
    write(`${lead}${translated}${tail}`);
    return;
  }
  // Local dict miss — try the remote auto-translation cache.
  const remote = lang !== "en" ? lookupRemote(source, lang) : null;
  if (remote && remote !== source) {
    write(`${lead}${remote}${tail}`);
    return;
  }
  if (lang !== "en") reportUnknown(source, lang);
  // No translation — restore original text (e.g. user switched back to en).
  write(`${lead}${source}${tail}`);
}


function translateAttributes(el: Element, lang: AuthLang) {
  if (shouldSkipAttr(el)) return;
  let cache = ORIGINAL_ATTR.get(el);
  for (const attr of ATTRS) {
    const current = el.getAttribute(attr);
    if (!current) continue;
    const cleaned = current
      .replace(/Cleopatra/gi, "Megsy")
      .replace(/كليوباترا|كليوپاترا/g, "ميغسي");
    if (cleaned !== current) el.setAttribute(attr, cleaned);
    const trimmed = cleaned.trim();
    if (!trimmed || !/[A-Za-z]{2}/.test(trimmed)) continue;
    if (!cache) {
      cache = {};
      ORIGINAL_ATTR.set(el, cache);
    }
    let written = WRITTEN_ATTR.get(el);
    if (!written) {
      written = {};
      WRITTEN_ATTR.set(el, written);
    }
    // Attribute changed by the app since our last write → refresh the source.
    if (!(attr in cache) || (attr in written && written[attr] !== cleaned)) {
      cache[attr] = trimmed;
    }
    const source = cache[attr];
    const setAttr = (next: string) => {
      if (next !== cleaned) el.setAttribute(attr, next);
      written[attr] = next;
    };
    const translated = translateExactText(source, lang);
    if (translated !== source) {
      setAttr(translated);
      continue;
    }
    const remote = lang !== "en" ? lookupRemote(source, lang) : null;
    if (remote && remote !== source) {
      setAttr(remote);
      continue;
    }
    if (lang !== "en") reportUnknown(source, lang);
    setAttr(source);
  }

}

function walk(root: Node, lang: AuthLang) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text, lang);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  if (shouldSkip(el)) {
    translateAttributes(el, lang);
    return;
  }
  translateAttributes(el, lang);
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        return shouldSkip(node as Element) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const elWalker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      return shouldSkip(node as Element) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });
  let n: Node | null;
  while ((n = walker.nextNode())) translateTextNode(n as Text, lang);
  while ((n = elWalker.nextNode())) translateAttributes(n as Element, lang);
}

let observer: MutationObserver | null = null;
let rafId: number | null = null;
let pending = new Set<Node>();

function flush() {
  rafId = null;
  const lang = getUserLang();
  const nodes = Array.from(pending);
  pending.clear();
  for (const n of nodes) {
    try {
      walk(n, lang);
    } catch {
      // ignore — never let translation break the app
    }
  }
}

function schedule(node: Node) {
  pending.add(node);
  if (rafId != null) return;
  rafId = requestAnimationFrame(flush);
}

export function retranslateAll() {
  if (typeof document === "undefined") return;
  schedule(document.body);
}

export function startDomTranslator() {
  if (typeof document === "undefined") return;
  if (observer) return;
  retranslateAll();
  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "characterData" && m.target) schedule(m.target);
      else if (m.type === "attributes" && m.target instanceof Element) schedule(m.target);
      else {
        m.addedNodes.forEach((n) => schedule(n));
      }
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...ATTRS],
  });
}

export function stopDomTranslator() {
  observer?.disconnect();
  observer = null;
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}
