/** @doc Language settings — pick the interface language. English is the default; other languages are auto-suggested from the visitor's region. */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Globe } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import DesktopSettingsLayout from "@/components/settings/DesktopSettingsLayout";
import ProfileGlassShell from "@/components/profile/ProfileGlassShell";
import {
  AVAILABLE_LANGS,
  setUserLang,
  translateExactText,
  useUserLang,
  type AuthLang,
} from "@/lib/authI18n";

// Cartoony flag illustrations — twemoji SVGs rendered from regional-indicator codepoints.
const LANG_COUNTRY: Record<string, string> = {
  en: "gb", ar: "sa", "ar-eg": "eg", es: "es", fr: "fr", de: "de",
  pt: "pt", it: "it", tr: "tr", ru: "ru", zh: "cn", ja: "jp",
  ko: "kr", hi: "in", id: "id", nl: "nl", sv: "se", cs: "cz",
  ro: "ro", el: "gr", uk: "ua", fa: "ir", vi: "vn",
  th: "th", pl: "pl",
};
function countryToTwemoji(cc: string): string {
  const a = cc.trim().toLowerCase();
  if (a.length !== 2) return "1f3f3"; // white flag fallback
  const cp = (c: string) => (0x1f1e6 + (c.charCodeAt(0) - 97)).toString(16);
  return `${cp(a[0])}-${cp(a[1])}`;
}
const flagUrl = (code: string) => {
  const cc = LANG_COUNTRY[code] ?? "";
  const cp = cc ? countryToTwemoji(cc) : "1f3f3";
  return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${cp}.svg`;
};

function CartoonFlag({ code, size = 32 }: { code: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="grid place-items-center shrink-0 rounded-full overflow-hidden"
      style={{
        width: size,
        height: size,
        background: "var(--overlay-white-06)",
        border: "1px solid var(--overlay-white-10)",
        boxShadow: "0 3px 10px rgba(0,0,0,0.25)",
      }}
    >
      <img decoding="async"
        src={flagUrl(code)}
        alt=""
        loading="lazy"
        className="w-full h-full"
        style={{ objectFit: "cover", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
      />
    </span>
  );
}


/** Detect suggested languages from browser locale + timezone country hint. */
function detectSuggested(): AuthLang[] {
  if (typeof navigator === "undefined") return [];
  const picks = new Set<string>();
  const raw = [
    ...(navigator.languages || []),
    navigator.language || "",
  ].map((s) => s.toLowerCase()).filter(Boolean);

  const hasCode = (c: string) => AVAILABLE_LANGS.some((l) => l.code === c);

  for (const tag of raw) {
    if (hasCode(tag)) { picks.add(tag); continue; }
    const base = tag.split("-")[0];
    // Egyptian Arabic special-case
    if (tag === "ar-eg" && hasCode("ar-eg")) picks.add("ar-eg");
    else if (base === "ar" && hasCode("ar")) picks.add("ar");
    else if (hasCode(base)) picks.add(base);
  }
  // Timezone → language hints (broad, non-exhaustive).
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const tzMap: Record<string, string> = {
      "Africa/Cairo": "ar-eg",
      "Asia/Riyadh": "ar", "Asia/Dubai": "ar", "Asia/Qatar": "ar",
      "Asia/Baghdad": "ar", "Asia/Beirut": "ar", "Asia/Amman": "ar",
      "Europe/Paris": "fr", "Europe/Berlin": "de", "Europe/Madrid": "es",
      "Europe/Rome": "it", "Europe/Lisbon": "pt", "Europe/Athens": "el",
      "Europe/Warsaw": "pl", "Europe/Prague": "cs", "Europe/Bucharest": "ro",
      "Europe/Kiev": "uk", "Europe/Kyiv": "uk", "Europe/Amsterdam": "nl",
      "Europe/Stockholm": "sv", "Europe/Istanbul": "tr", "Europe/Moscow": "ru",
      "Asia/Tokyo": "ja", "Asia/Seoul": "ko", "Asia/Shanghai": "zh",
      "Asia/Hong_Kong": "zh", "Asia/Taipei": "zh", "Asia/Kolkata": "hi",
      "Asia/Bangkok": "th", "Asia/Ho_Chi_Minh": "vi", "Asia/Jakarta": "id",
      "Asia/Jerusalem": "he", "Asia/Tehran": "fa",
    };
    const hit = tzMap[tz];
    if (hit && hasCode(hit)) picks.add(hit);
  } catch { /* ignore */ }

  picks.delete("en");
  return Array.from(picks).slice(0, 4) as AuthLang[];
}

export default function LanguagePage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const lang = useUserLang();
  const tx = (s: string) => translateExactText(s, lang);
  const [suggested, setSuggested] = useState<AuthLang[]>([]);

  useEffect(() => { setSuggested(detectSuggested()); }, []);

  const others = useMemo(
    () => AVAILABLE_LANGS.filter((l) => l.code !== "en" && !suggested.includes(l.code)),
    [suggested],
  );

  const suggestedRows = suggested
    .map((code) => AVAILABLE_LANGS.find((l) => l.code === code))
    .filter(Boolean);
  const otherRows = others;

  const pick = async (code: AuthLang) => {
    await setUserLang(code);
    toast.success(tx("Language updated"));
  };

  const Intro = !isMobile && (
    <header className="mb-8">
      <h1 className="text-[28px] font-semibold tracking-tight">{tx("Language")}</h1>
    </header>
  );

  const Content = (
    <>
      {/* Suggested */}
      {suggestedRows.length > 0 && (
        <section className="mt-6">
          <div className="flex items-center gap-2 mb-2 px-1">
            <Globe className="w-3.5 h-3.5 text-foreground/50" />
            <h2 className="text-[11px] uppercase tracking-[0.16em] font-mono text-foreground/50">
              {tx("Suggested for your region")}
            </h2>
          </div>
          <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] overflow-hidden divide-y divide-foreground/[0.06]">
            {suggestedRows.map((l) => (
              <LangRow key={l!.code} lang={l!} active={lang === l!.code} onPick={pick} />
            ))}
          </div>
        </section>
      )}

      {/* All */}
      <section className="mt-6 pb-4">
        <h2 className="text-[11px] uppercase tracking-[0.16em] font-mono text-foreground/50 mb-2 px-1">
          {tx("All languages")}
        </h2>
        {otherRows.length === 0 ? (
          <p className="text-[13px] text-foreground/50 px-1 py-6 text-center">
            {tx("No languages match your search.")}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {otherRows.map((l) => (
              <LangRow
                key={l.code}
                lang={l}
                active={lang === l.code}
                onPick={pick}
                compact
              />
            ))}
          </div>
        )}
      </section>
    </>
  );

  if (isMobile) {
    return (
      <ProfileGlassShell
        title={tx("Language")}
        subtitle={tx("English is the default across Megsy. Other languages adjust automatically based on your region — pick one below to override.")}
        onBack={() => (window.history.length > 1 ? window.history.back() : navigate("/settings"))}
      >
        {Content}
      </ProfileGlassShell>
    );
  }
  return (
    <DesktopSettingsLayout>
      <div className="mx-auto w-full max-w-2xl px-4 md:px-0">
        {Intro}
        {Content}
      </div>
    </DesktopSettingsLayout>
  );
}

function LangRow({
  lang,
  active,
  onPick,
  compact = false,
}: {
  lang: { code: string; label: string; native: string };
  active: boolean;
  onPick: (code: AuthLang) => void;
  compact?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={() => onPick(lang.code as AuthLang)}
      className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-colors ${
        compact
          ? `rounded-xl border ${
              active
                ? "border-foreground/25 bg-foreground/[0.05]"
                : "border-foreground/10 hover:bg-foreground/[0.04]"
            }`
          : `${active ? "bg-foreground/[0.05]" : "hover:bg-foreground/[0.03]"}`
      }`}
    >
      <CartoonFlag code={lang.code} size={28} />

      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium truncate">{lang.native}</p>
        <p className="text-[11.5px] text-foreground/50 truncate">{lang.label}</p>
      </div>
      {active && <Check className="w-4 h-4 text-foreground/80 shrink-0" />}
    </motion.button>
  );
}
