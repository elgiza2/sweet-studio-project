import { memo, useEffect, useMemo, useState } from "react";
import { AnimatePresence, m as motion, useReducedMotion } from "framer-motion";
import {
  Brain,
  Check,
  ChevronDown,
  Wrench,
  Search,
  Image as ImageIcon,
  Video,
  Code2,
  Save,
  Sparkles,
  Play,
} from "lucide-react";
import MegsyStar from "@/components/files/MegsyStar";
import { resolveToolActivity, brandIconUrl } from "@/lib/toolActivity";
import { t as uiT, useUserLang } from "@/lib/authI18n";

/**
 * Explicit icon map. A `import * as Lucide` barrel used to live here, which
 * defeated tree-shaking and shipped the ENTIRE lucide-react library (556 kB
 * raw / 149 kB gzip) to every chat session. Only these names are ever
 * referenced by `resolveToolActivity` (see src/lib/toolActivity.ts).
 */
const TOOL_ICONS: Record<string, typeof Wrench> = {
  Search,
  Image: ImageIcon,
  Video,
  Code2,
  Brain,
  Save,
  Sparkles,
  Wrench,
  Play,
};

export interface ToolActivity {
  name: string;
  appSlug?: string;
  target?: string;
  status: "running" | "done" | "error";
}

interface AgentStatusLineProps {
  /** Backend-provided free-form status, e.g. "Searching the web…". Wins over phase text. */
  searchStatus?: string;
  /** Active tool, if any. */
  toolActivity?: ToolActivity | null;
  /** Latest user text — used to detect Arabic. */
  userText?: string;
}

const ARABIC_RE = /[\u0600-\u06ff]/;

type Phase = "connecting" | "thinking" | "thinking_deep" | "tool" | "tool_done";

const transition = { type: "spring" as const, stiffness: 380, damping: 32, mass: 0.7 };
const MEGSY_BLUE = "var(--megsy-blue)";

const AgentStatusLine = ({ searchStatus, toolActivity, userText }: AgentStatusLineProps) => {
  const lang = useUserLang();
  const reduce = useReducedMotion();
  const [elapsed, setElapsed] = useState(0);
  const [lastDoneTool, setLastDoneTool] = useState<ToolActivity | null>(null);
  const [doneShownAt, setDoneShownAt] = useState<number>(0);
  const [expanded, setExpanded] = useState(false);
  const [thoughtLog, setThoughtLog] = useState<string[]>([]);

  useEffect(() => {
    const start = Date.now();
    const t = window.setInterval(() => setElapsed(Date.now() - start), 250);
    return () => window.clearInterval(t);
  }, []);

  // Track tool transitions so we can briefly show a "done" state before the next phase.
  useEffect(() => {
    if (toolActivity?.status === "done" || toolActivity?.status === "error") {
      setLastDoneTool(toolActivity);
      setDoneShownAt(Date.now());
      const t = window.setTimeout(() => setLastDoneTool(null), 900);
      return () => window.clearTimeout(t);
    }
  }, [toolActivity?.name, toolActivity?.status]);

  // Accumulate a thought log so the user can inspect what the agent is doing.
  useEffect(() => {
    const entry = searchStatus?.trim();
    if (!entry) return;
    setThoughtLog((prev) => (prev[prev.length - 1] === entry ? prev : [...prev, entry]));
  }, [searchStatus]);
  useEffect(() => {
    if (toolActivity?.status === "running" && toolActivity.name) {
      const meta = resolveToolActivity(toolActivity.name, toolActivity.appSlug);
      const verb = meta?.en || toolActivity.name;
      const line = toolActivity.target ? `${verb} · ${toolActivity.target}` : verb;
      setThoughtLog((prev) => (prev[prev.length - 1] === line ? prev : [...prev, line]));
    }
  }, [toolActivity?.name, toolActivity?.status, toolActivity?.target, toolActivity?.appSlug]);

  const ar = useMemo(() => {
    if (lang === "ar" || lang === "ar-eg") return true;
    if (userText && ARABIC_RE.test(userText)) return true;
    if (searchStatus && ARABIC_RE.test(searchStatus)) return true;
    if (toolActivity?.target && ARABIC_RE.test(toolActivity.target)) return true;
    if (typeof document !== "undefined") {
      const l = document.documentElement.lang || "";
      const d = document.documentElement.dir || "";
      if (l.startsWith("ar") || d === "rtl") return true;
    }
    return false;
  }, [lang, userText, searchStatus, toolActivity?.target]);

  // Decide active phase
  let phase: Phase;
  if (toolActivity && toolActivity.status === "running") phase = "tool";
  else if (lastDoneTool && Date.now() - doneShownAt < 900) phase = "tool_done";
  else if (searchStatus?.trim())
    phase = "tool"; // backend-provided custom status renders like a tool row
  else if (elapsed < 800) phase = "connecting";
  else if (elapsed < 5000) phase = "thinking";
  else phase = "thinking_deep";

  // Build the visible row
  let key = phase as string;
  let icon: React.ReactNode = null;
  let label = "";
  let shimmer = true;

  // Localized labels for the active UI language.
  const L = ar
    ? {
        thinking: uiT("thinking", lang),
        thinkingDeep: uiT("thinkingDeep", lang),
        working: uiT("working", lang),
        done: uiT("done", lang),
        failed: uiT("somethingWentWrong", lang),
      }
    : {
        thinking: uiT("thinking", lang),
        thinkingDeep: uiT("thinkingDeep", lang),
        working: uiT("working", lang),
        done: uiT("done", lang),
        failed: uiT("failed", lang),
      };

  if (phase === "connecting") {
    key = "connecting";
    icon = <Dots />;
    label = "";
    shimmer = false;
  } else if (phase === "thinking") {
    icon = <MegsyStar size={16} className="text-[var(--megsy-blue)]" />;
    label = L.thinking;
  } else if (phase === "thinking_deep") {
    icon = (
      <span className="relative inline-flex items-center justify-center w-5 h-5">
        <MegsyStar size={16} className="text-[var(--megsy-blue)]" />
        <Brain
          className="absolute -bottom-1 -right-1 w-3 h-3 animate-pulse"
          style={{ color: MEGSY_BLUE }}
        />
      </span>
    );
    label = L.thinkingDeep;
  } else if (phase === "tool") {
    const active = toolActivity ?? null;
    const meta = active ? resolveToolActivity(active.name, active.appSlug) : null;
    key = `tool:${active?.name || "status"}`;
    icon = <ToolIcon meta={meta} />;
    const verb = meta ? (ar && (meta as any).ar ? (meta as any).ar : meta.en) : "";
    if (searchStatus?.trim()) label = searchStatus.trim();
    else if (active?.target) label = `${verb} ${active.target}`;
    else label = verb || L.working;
  } else if (phase === "tool_done" && lastDoneTool) {
    const meta = resolveToolActivity(lastDoneTool.name, lastDoneTool.appSlug);
    key = `done:${lastDoneTool.name}`;
    const verb = ar && (meta as any).ar ? (meta as any).ar : meta.en;
    const isError = lastDoneTool.status === "error";
    icon = (
      <span className="relative inline-flex items-center justify-center w-5 h-5">
        <ToolIcon meta={meta} muted />
        <span
          className={
            "absolute -bottom-1 -right-1 inline-flex items-center justify-center w-3 h-3 rounded-full " +
            (isError ? "bg-destructive" : "bg-emerald-500")
          }
        >
          <Check className="w-2 h-2 text-foreground" strokeWidth={3} />
        </span>
      </span>
    );
    label = isError ? `${verb} — ${L.failed}` : `${verb} — ${L.done}`;
    shimmer = false;
  }

  const motionProps = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, scale: 0.6, filter: "blur(4px)" },
        animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
        exit: { opacity: 0, scale: 0.6, filter: "blur(4px)" },
        transition,
      };

  const canExpand = thoughtLog.length > 0 || elapsed > 1200;
  const seconds = Math.max(1, Math.round(elapsed / 1000));
  const expandLabel = `Thought for ${seconds}s`;

  return (
    <div
      className="flex flex-col gap-1.5 py-1"
      aria-live="polite"
      data-testid="agent-status"
      dir={ar ? "rtl" : undefined}
    >
      <div className="flex items-center gap-2.5 min-h-[28px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={key} className="flex items-center gap-2.5" {...motionProps}>
            <span className="relative inline-flex items-center justify-center w-5 h-5 shrink-0">
              {icon}
            </span>
            {label && (
              <span
                className={
                  shimmer
                    ? "ai-shimmer text-[13px] font-medium motion-reduce:animate-none"
                    : "text-[13px] font-medium text-foreground/70 md:text-foreground/80"
                }
              >
                {label}
              </span>
            )}
          </motion.div>
        </AnimatePresence>
        {/* Thinking toggle removed — now shown as a post-response chip via PostThinkingChip. */}
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="thoughts"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 0.9, 0.28, 1] }}
            className="overflow-hidden"
          >
            <div className="ml-1 rounded-xl border border-foreground/10 bg-foreground/[0.03] px-3 py-2 text-[12.5px] leading-6 text-foreground/80">
              <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground/80">
                {expandLabel}
              </div>
              {thoughtLog.length === 0 ? (
                <div className="text-foreground/60">Thinking…</div>
              ) : (
                <ul className="space-y-1">
                  {thoughtLog.map((t, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-2 w-1 h-1 rounded-full bg-foreground/40 shrink-0" />
                      <span className="flex-1">{t}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Dots = () => (
  <span className="inline-flex items-center gap-1" aria-hidden>
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-1 h-1 rounded-full bg-foreground/40 md:bg-foreground/70 animate-pulse"
        style={{ animationDelay: `${i * 120}ms` }}
      />
    ))}
  </span>
);

const ToolIcon = ({
  meta,
  muted,
}: {
  meta: ReturnType<typeof resolveToolActivity> | null;
  muted?: boolean;
}) => {
  const [failed, setFailed] = useState(false);
  if (!meta) return <Wrench className="w-4 h-4 text-foreground/70 md:text-foreground/80" />;
  if (meta.slug && !failed) {
    return (
      <img loading="lazy" decoding="async"
        src={brandIconUrl(meta.slug)}
        alt=""
        className={"w-4 h-4 dark:invert md:invert " + (muted ? "opacity-50" : "opacity-90")}
        onError={() => setFailed(true)}
      />
    );
  }
  const Comp = (meta.lucide && TOOL_ICONS[meta.lucide]) || Wrench;
  return (
    <Comp
      className={
        "w-4 h-4 " +
        (muted ? "text-foreground/50 md:text-foreground/60" : "text-foreground/80 md:text-foreground/90")
      }
    />
  );
};

export default memo(AgentStatusLine);
