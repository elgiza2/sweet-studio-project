import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { m as motion, useInView, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Check, ExternalLink } from "lucide-react";
import { TemplateProps, splitIntoSections, hostname } from "./templateUtils";
import SmartImage from "./SmartImage";
import { withInlineCitations } from "./CitationPill";


/**
 * Cinematic "Prisma"-inspired renderer for a deep-research report.
 * Dark, moody, warm cream palette. Hero → intro (About) → sectioned cards → sources.
 */

const CREAM = "#E1E0CC";
const CREAM_ALT = "#DEDBC8";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);

// ---------------------- shared animated primitives ----------------------

const WordsPullUp = ({
  text,
  className = "",
  style,
  stagger = 0.08,
  delay = 0,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  stagger?: number;
  delay?: number;
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <span ref={ref} className={`inline-flex flex-wrap ${className}`} style={style}>
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="me-[0.25em] inline-block overflow-hidden pb-[0.1em]">
          <motion.span
            initial={{ y: 24, opacity: 0 }}
            animate={inView ? { y: 0, opacity: 1 } : {}}
            transition={{
              duration: 0.7,
              delay: delay + i * stagger,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="inline-block"
          >
            {w}
          </motion.span>
        </span>
      ))}
    </span>
  );
};

const ScrollRevealText = ({
  text,
  className = "",
  style,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.25"],
  });
  const chars = Array.from(text);
  return (
    <p ref={ref} className={className} style={style}>
      {chars.map((c, i) => (
        <Char key={i} char={c} idx={i} total={chars.length} progress={scrollYProgress} />
      ))}
    </p>
  );
};

const Char = ({
  char,
  idx,
  total,
  progress,
}: {
  char: string;
  idx: number;
  total: number;
  progress: any;
}) => {
  const start = idx / total;
  const opacity = useTransform(progress, [Math.max(0, start - 0.1), start + 0.05], [0.2, 1]);
  return <motion.span style={{ opacity }}>{char}</motion.span>;
};

// ---------------------- markdown renderer ----------------------

const baseMd = {
  h1: ({ node: _n, ...p }: any) => (
    <h3
      dir="auto"
      className="mt-6 mb-3 break-words text-lg font-bold tracking-tight sm:mt-8 sm:text-2xl"
      style={{ color: CREAM }}
      {...p}
    />
  ),
  h2: ({ node: _n, ...p }: any) => (
    <h3
      dir="auto"
      className="mt-6 mb-3 break-words text-lg font-bold tracking-tight sm:mt-8 sm:text-2xl"
      style={{ color: CREAM }}
      {...p}
    />
  ),
  h3: ({ node: _n, ...p }: any) => (
    <h4
      dir="auto"
      className="mt-5 mb-2 break-words text-base font-bold tracking-tight sm:text-lg"
      style={{ color: CREAM }}
      {...p}
    />
  ),
  p: ({ node: _n, ...p }: any) => (
    <p
      dir="auto"
      className="my-3 break-words text-[15px] leading-[1.85] text-gray-400 sm:text-[16px]"
      {...p}
    />
  ),
  ul: ({ node: _n, ...p }: any) => (
    <ul dir="auto" className="my-4 space-y-2.5 ps-1 [&>li]:list-none" {...p} />
  ),
  ol: ({ node: _n, ...p }: any) => (
    <ol dir="auto" className="my-4 space-y-2.5 ps-5 list-decimal marker:text-gray-500" {...p} />
  ),
  li: ({ node: _n, children, ...p }: any) => (
    <li dir="auto" className="flex gap-3 text-[15px] leading-[1.75] text-gray-400" {...p}>
      <span
        className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: CREAM_ALT, opacity: 0.7 }}
      />
      <span className="min-w-0 flex-1">{children}</span>
    </li>
  ),
  blockquote: ({ node: _n, ...p }: any) => (
    <blockquote
      dir="auto"
      className="my-6 rounded-2xl border border-foreground/10 bg-white/[0.02] p-5 font-serif text-[16px] italic sm:text-lg"
      style={{ color: CREAM }}
      {...p}
    />
  ),
  table: ({ node: _n, ...p }: any) => (
    <div className="my-6 -mx-2 overflow-x-auto sm:mx-0">
      <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background">
        <table
          className="min-w-full border-collapse text-[14.5px] [&_tbody_tr]:border-t [&_tbody_tr]:border-foreground/5"
          {...p}
        />
      </div>
    </div>
  ),
  thead: ({ node: _n, ...p }: any) => <thead className="bg-white/[0.03]" {...p} />,
  th: ({ node: _n, ...p }: any) => (
    <th
      dir="auto"
      className="px-4 py-3 text-start text-[11px] font-bold uppercase tracking-[0.12em]"
      style={{ color: CREAM }}
      {...p}
    />
  ),
  td: ({ node: _n, ...p }: any) => (
    <td dir="auto" className="px-4 py-3 align-top text-[14.5px] leading-[1.65] text-gray-400" {...p} />
  ),
  hr: () => <hr className="my-8 border-foreground/10" />,
  code: ({ inline, className, children, ...p }: any) => {
    const text = String(children ?? "");
    const isInline = inline ?? (!/^language-/.test(className || "") && !text.includes("\n"));
    if (isInline) {
      return (
        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-[0.88em]" style={{ color: CREAM }} {...p}>
          {children}
        </code>
      );
    }
    return (
      <pre className="my-5 overflow-x-auto rounded-xl border border-foreground/10 bg-background p-4">
        <code className={`font-mono text-[13px] leading-[1.65] text-gray-300 ${className || ""}`} {...p}>
          {children}
        </code>
      </pre>
    );
  },
  img: () => null,
  a: ({ node: _n, href, children, ...p }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium underline decoration-white/20 underline-offset-[3px] transition hover:decoration-white/60"
      style={{ color: CREAM }}
      {...p}
    >
      {children}
    </a>
  ),
};

const SOURCE_HEADING_RE = /^(sources|references|المصادر\s+الرئيسية|المصادر|المراجع|مصادر)\s*:?\s*$/i;

const HERO_VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260514_102933_4e8f73b5-775a-4179-b2fb-472f59063dcd.mp4";

// ---------------------- template ----------------------

const almaraiStack = "'Almarai', 'Noto Serif Arabic', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif";

const ResearchLandingTemplate = ({
  data,
  cleanReport,
  isRtl,
  sources,
  wordCount,
  readMins,
  reportEmpty,
}: TemplateProps) => {
  const { intro, sections } = splitIntoSections(cleanReport);

  const md = useMemo(() => {
    const wrap = (Comp: any) => ({ node: _n, children, ...p }: any) => (
      <Comp {...p}>{withInlineCitations(children, sources)}</Comp>
    );
    return {
      ...baseMd,
      p: wrap(baseMd.p),
      li: wrap(baseMd.li),
      td: wrap(baseMd.td),
    };
  }, [sources]);


  const bodySections = useMemo(
    () => sections.filter((s) => !SOURCE_HEADING_RE.test(s.heading.trim())),
    [sections],
  );

  const limitedImages = (data.images || []).slice(0, 6);
  const cover = limitedImages[0];
  const inlineImages = limitedImages.slice(1);

  const sectionEntries = useMemo(
    () => bodySections.map((s, i) => ({ id: `${i}-${slugify(s.heading)}`, section: s })),
    [bodySections],
  );

  const [activeId, setActiveId] = useState<string>("");
  useEffect(() => {
    if (sectionEntries.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
    );
    sectionEntries.forEach((t) => {
      const el = document.getElementById(t.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [sectionEntries]);

  return (
    <div className="bg-background" style={{ fontFamily: almaraiStack, color: CREAM_ALT }}>
      {/* ---------------- HERO (compact) ---------------- */}
      <section className="p-3 pt-16 sm:p-5 sm:pt-20 md:p-6 md:pt-24">
        <div className="relative h-[38dvh] min-h-[240px] w-full overflow-hidden rounded-2xl md:rounded-[2rem]">
          <video
            src={HERO_VIDEO_URL}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster={cover}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-black/85" />
          <div
            className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-[0.35]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>\")",
            }}
          />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-4 sm:p-6 md:p-8">
            <WordsPullUp
              text={data.query}
              className="font-medium leading-[1.05] tracking-[-0.03em]"
              style={{
                color: CREAM,
                fontSize: "clamp(1.4rem, 4.5vw, 2.75rem)",
                fontFamily: almaraiStack,
              }}
              stagger={0.06}
            />
            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center gap-1.5 text-[10.5px] sm:text-[11px]"
              style={{ color: CREAM_ALT }}
            >
              <span className="rounded-full border border-foreground/15 bg-background/40 px-2.5 py-1 backdrop-blur">
                {wordCount.toLocaleString()} {"words"}
              </span>
              <span className="rounded-full border border-foreground/15 bg-background/40 px-2.5 py-1 backdrop-blur">
                {readMins} {"min read"}
              </span>
              {sources.length > 0 && (
                <span className="rounded-full border border-foreground/15 bg-background/40 px-2.5 py-1 backdrop-blur">
                  {sources.length} {"sources"}
                </span>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {reportEmpty ? (
        <div className="p-10 text-center text-sm text-gray-500">
          {"Report is being prepared."}
        </div>
      ) : (
        <>
          {/* ---------------- INTRO / ABOUT ---------------- */}
          {intro && (
            <section className="px-3 pb-10 sm:px-6 sm:pb-16 md:pb-20">
              <div
                className="mx-auto max-w-5xl overflow-hidden rounded-2xl md:rounded-[2rem] px-5 py-10 sm:px-10 sm:py-14 md:px-14 md:py-16"
                style={{ backgroundColor: "hsl(var(--background))" }}
              >
                <div
                  className="mb-5 text-[10px] font-bold uppercase tracking-[0.28em] sm:text-xs"
                  style={{ color: CREAM }}
                >
                  {"Overview"}
                </div>
                <div
                  dir={"ltr"}
                  lang={"en"}
                  className="[&>*:first-child]:mt-0"
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>
                    {intro}
                  </ReactMarkdown>
                </div>
              </div>
            </section>
          )}

          {/* ---------------- SECTIONS AS CARDS ---------------- */}
          <section className="px-3 pb-16 sm:px-6 sm:pb-24">
            <div className="mx-auto max-w-6xl">
              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                {sectionEntries.map(({ id, section }, i) => {
                  const img = inlineImages[i % Math.max(inlineImages.length, 1)];
                  const hasImg = inlineImages.length > 0 && !!img;
                  return (
                    <SectionCard
                      key={id}
                      id={id}
                      index={i}
                      heading={section.heading}
                      body={section.body}
                      image={hasImg ? img : undefined}
                      isRtl={isRtl}
                      md={md}

                    />
                  );
                })}
              </div>
            </div>
          </section>

          {/* ---------------- SOURCES ---------------- */}
          {/* Removed: sources are shown in the ResearchReportTabs accordion below to avoid duplication. */}

        </>
      )}
    </div>
  );
};

// ---------------------- section card ----------------------

const SectionCard = ({
  id,
  index,
  heading,
  body,
  image,
  isRtl,
  md,
}: {
  id: string;
  index: number;
  heading: string;
  body: string;
  image?: string;
  isRtl: boolean;
  md: any;
}) => {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, scale: 0.96, y: 20 }}
      animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: (index % 4) * 0.12, ease: [0.22, 1, 0.36, 1] }}
      lang={"en"}
      dir={"ltr"}
      className="scroll-mt-24 overflow-hidden rounded-2xl md:rounded-[1.75rem]"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      {image && (
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          <SmartImage src={image} loading="lazy" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        </div>
      )}
      <div className="p-5 sm:p-8">
        <h2
          dir="auto"
          className="mb-5 break-words text-2xl font-normal leading-[1.05] tracking-[-0.02em] sm:text-[32px]"
          style={{ color: CREAM, fontFamily: almaraiStack }}
        >
          {heading}
        </h2>
        <div className="[&>*:first-child]:mt-0">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>
            {body}
          </ReactMarkdown>
        </div>
      </div>
    </motion.section>
  );
};


export default ResearchLandingTemplate;
