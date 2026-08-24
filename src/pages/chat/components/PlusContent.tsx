import { memo } from "react";
import { m as motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Image,
  FileUp,
  Globe,
  Lightbulb,
  Wrench,
  Music2,
  Timer,
  ChevronLeft,
  Check,
  Plus,
  Loader2,
  Play,
  Trash2,
  Image as ImageIcon,
  Video as VideoIcon,
  Microscope,
  Presentation,
  FileText,
  Plug,
  Code2,
  ListChecks,
  Puzzle,
  ImagePlus,
  AudioLines,
  Smartphone,
  ScanSearch,
  Bot,
  

} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DesktopRow,
} from "@/components/chat/PlusMenuRows";
import type { Integration } from "@/lib/integrationsData";
import { IOS_SPRING as iosSpring } from "../constants/motion";
import { glassModelMenu } from "@/components/model-picker/glassModelMenuStyles";

type PlusView = "main" | "models" | "skills" | "music" | "timer" | "tools";

export interface PlusContentProps {
  plusView: PlusView;
  setPlusView: (v: PlusView) => void;
  setPlusMenuOpen: (open: boolean) => void;
  chatMode: string;

  // refs
  cameraInputRef: React.RefObject<HTMLInputElement>;
  imageInputRef: React.RefObject<HTMLInputElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  musicFileInputRef: React.RefObject<HTMLInputElement>;
  studyAudioRef: React.MutableRefObject<HTMLAudioElement | null>;

  // search
  searchEnabled: boolean;
  handleSearchToggle: () => void;

  // study/music
  studyMusic: { kind: string | null };
  setStudyMusic: (v: { kind: string | null }) => void;
  userTracks: Array<{ id: string; name: string; url?: string }>;
  uploadingMusic: boolean;
  playUserTrack: (track: any) => void;
  deleteUserTrack: (track: any) => void;
  handleMusicUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;

  // timer
  timerInputMin: number;
  setTimerInputMin: (n: number) => void;
  setStudyTimers: React.Dispatch<React.SetStateAction<any[]>>;
  scrollToBottom: () => void;

  // models
  megsyTier: "lite" | "pro" | "max";
  setMegsyTier: (t: "lite" | "pro" | "max") => void;
  userPlan: string | null | undefined;
  chatUserId: string | null | undefined;

  // skills
  mySkills: any[];
  librarySkills: any[];
  toggleEnabled: (skill: any, enabled: boolean) => void;
  navigate: (path: string) => void;

  // integrations
  integrationCategories: string[];
  integrationsCategory: string;
  setIntegrationsCategory: (c: string) => void;
  integrationsQuery: string;
  filteredIntegrations: Integration[];
  userIntegrations: string[] | Record<string, boolean>;
  connectingApp: string | null;
  brokenLogos: Record<string, boolean>;
  setBrokenLogos: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  connectIntegration: (it: Integration) => void;
  onModeChange?: (mode: string) => void;
  onAgentSelect?: (agentId: string) => void;
  onWebsiteStart?: () => void;
}

const fadeProps = (x: number) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.1 },
});

const mobileFont = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif";

const PlusMain = (p: PlusContentProps) => {
  type Tile = { id: string; label: string; Icon: any; onClick: () => void };

  const closeThen = (fn: () => void) => () => {
    p.setPlusMenuOpen(false);
    fn();
  };

  const tiles: Tile[] = [
    { id: "camera", label: "Camera", Icon: Camera, onClick: closeThen(() => p.cameraInputRef.current?.click()) },
    { id: "photos", label: "Images", Icon: ImageIcon, onClick: closeThen(() => p.imageInputRef.current?.click()) },
    { id: "file", label: "Attach file", Icon: FileUp, onClick: closeThen(() => p.fileInputRef.current?.click()) },
  ];

  type RowItem = { id: string; label: string; Icon: any; badge?: string; active?: boolean; toggle?: boolean; onClick: () => void };

  const sections: { title?: string; items: RowItem[] }[] = [
    {
      title: "Tools",
      items: [
        { id: "search", label: "Web search", Icon: Globe, active: p.searchEnabled, toggle: true, onClick: () => p.handleSearchToggle() },
        { id: "skills", label: "Skills", Icon: Puzzle, onClick: closeThen(() => p.navigate("/settings/skills")) },
        { id: "integrations", label: "Integrations", Icon: Plug, onClick: closeThen(() => p.navigate("/chat?integrations=1")) },
      ],
    },

    {
      title: "Create",
      items: [
        { id: "image", label: "Create or edit image", Icon: ImagePlus, onClick: closeThen(() => p.onModeChange?.("images")) },
        { id: "audio", label: "Create audio", Icon: AudioLines, onClick: closeThen(() => p.onModeChange?.("music")) },
        { id: "video", label: "Create video", Icon: VideoIcon, onClick: closeThen(() => p.onModeChange?.("video")) },
        { id: "slides", label: "Create slides", Icon: Presentation, onClick: closeThen(() => p.onModeChange?.("slides")) },
        { id: "website", label: "Create a website", Icon: Code2, onClick: closeThen(() => p.onWebsiteStart?.()) },
      ],
    },
    {
      title: "Modes",
      items: [
        { id: "research", label: "Extended research", Icon: ScanSearch, onClick: closeThen(() => p.onModeChange?.("deep-research")) },
        { id: "learning", label: "Learning mode", Icon: Lightbulb, onClick: closeThen(() => p.onModeChange?.("learning")) },
      ],
    },
  ];

  const SheetRow = ({ item }: { item: RowItem }) => (
    <motion.button
      data-no-neo
      type="button"
      whileTap={{ scale: item.toggle ? 1 : 0.98 }}
      transition={iosSpring}
      onClick={item.onClick}
      className="plus-row w-full flex items-center gap-3.5 px-2.5 h-[56px] rounded-[14px] text-start border-0 bg-transparent"
    >
      <item.Icon
        className="shrink-0 w-[22px] h-[22px] transition-colors duration-200"
        strokeWidth={1.6}
        style={{ color: item.active ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.82)" }}
      />
      <span
        className="flex-1 min-w-0 truncate text-[15.5px] font-normal"
        style={{ color: "hsl(var(--foreground) / 0.92)" }}
      >
        {item.label}
      </span>

      {item.badge && (
        <span
          className="shrink-0 rounded-full px-2 py-[2px] text-[10.5px] font-semibold"
          style={{ background: "hsl(var(--primary) / 0.16)", color: "hsl(var(--primary))" }}
        >
          {item.badge}
        </span>
      )}
      {item.toggle ? (
        <span
          role="switch"
          aria-checked={!!item.active}
          className="shrink-0 relative inline-flex items-center rounded-full transition-colors duration-250"
          style={{
            width: 42,
            height: 25,
            background: item.active ? "hsl(var(--primary))" : "hsl(0 0% 100% / 0.14)",
          }}
        >
          <motion.span
            className="absolute rounded-full"
            style={{
              width: 19,
              height: 19,
              top: 3,
              left: 3,
              background: item.active ? "#0b0f0d" : "hsl(0 0% 100% / 0.85)",
            }}
            animate={{ x: item.active ? 17 : 0 }}
            transition={{ type: "spring", stiffness: 620, damping: 34, mass: 0.6 }}
          />
        </span>
      ) : (
        item.active && <Check className="shrink-0 w-[17px] h-[17px]" style={{ color: "hsl(var(--primary))" }} />
      )}
    </motion.button>
  );



  return (
    <motion.div key="main" {...fadeProps(-8)} className="flex flex-col">
      {/* MOBILE — bottom sheet */}
      <motion.div
        className="md:hidden flex flex-col pb-4"
        style={{ fontFamily: mobileFont }}
        dir="rtl"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.022, delayChildren: 0.02 } } }}
      >
        <style>{`
          .kimi-tile { background: hsl(0 0% 100% / 0.055); border: 0; }
          .kimi-tile:active { background: hsl(0 0% 100% / 0.1); }
          .plus-row:active { background: hsl(0 0% 100% / 0.06); }
        `}</style>

        <div className="pt-1" />



        {/* Media tiles strip */}
        <motion.div
          className="flex gap-2 px-1.5 pb-4"
          variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: iosSpring } }}
        >
          {tiles.map((t) => (
            <motion.button
              key={t.id}
              data-no-neo
              type="button"
              whileTap={{ scale: 0.96 }}
              transition={iosSpring}
              onClick={t.onClick}
              className="kimi-tile flex flex-1 flex-col items-center justify-center gap-2 rounded-[20px]"
              style={{ height: 82 }}
            >
              <t.Icon className="w-[22px] h-[22px]" strokeWidth={1.6} style={{ color: "hsl(var(--foreground) / 0.85)" }} />
              <span className="text-[12px] font-medium leading-none" style={{ color: "hsl(var(--foreground) / 0.75)" }}>
                {t.label}
              </span>
            </motion.button>
          ))}
        </motion.div>

        {/* Flat grouped rows — no titles, thin full-width divider between groups */}
        <div className="px-1.5 flex flex-col">
          {sections.map((section, si) => (
            <motion.div
              key={si}
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: iosSpring } }}
            >
              {si > 0 && (
                <div className="h-px my-2" style={{ background: "hsl(var(--foreground) / 0.08)" }} />
              )}
              <div className="flex flex-col">
                {section.items.map((it) => (
                  <SheetRow key={it.id} item={it} />
                ))}
              </div>
            </motion.div>
          ))}
        </div>


      </motion.div>







      {/* DESKTOP */}
      <div className="hidden md:flex flex-col gap-1">
        <div className="flex flex-col mb-1">
          {[
            {
              icon: FileUp,
              label: "Add files or photos",
              shortcut: "Ctrl+U",
              onClick: () => {
                p.fileInputRef.current?.click();
                p.setPlusMenuOpen(false);
              },
            },
            {
              icon: Camera,
              label: "Take a photo",
              onClick: () => {
                p.cameraInputRef.current?.click();
                p.setPlusMenuOpen(false);
              },
            },
            {
              icon: Image,
              label: "Upload an image",
              onClick: () => {
                p.imageInputRef.current?.click();
                p.setPlusMenuOpen(false);
              },
            },
          ].map(({ icon: Icon, label, shortcut, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left hover:bg-foreground/[0.06] transition-colors"
            >
              <Icon className="w-[18px] h-[18px] text-primary shrink-0" strokeWidth={2.2} />
              <span className="flex-1 text-[13.5px] font-bold text-foreground truncate">
                {label}
              </span>
              {shortcut && (
                <span className="text-[11px] font-semibold text-muted-foreground tracking-wide">
                  {shortcut}
                </span>
              )}
            </button>
          ))}
          <div className="h-[1.5px] bg-border my-1.5 mx-1" />
        </div>

        {p.chatMode === "learning" ? (
          <>
            <DesktopRow Icon={Music2} label="Play music" color="#A78BFA" onClick={() => p.setPlusView("music")} />
            <DesktopRow Icon={Timer} label="Focus timer" color="#EF4444" onClick={() => p.setPlusView("timer")} />
          </>
        ) : (
          <>
            <button
              onClick={p.handleSearchToggle}
              className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left hover:bg-foreground/[0.06] transition-colors"
            >
              <Globe className="w-[18px] h-[18px] shrink-0" strokeWidth={2.2} style={{ color: "#7DD3FC" }} />
              <span className="flex-1 text-[13.5px] font-bold text-foreground">Web search</span>
              <span
                className="relative shrink-0 rounded-full transition-colors"
                style={{
                  width: 32,
                  height: 18,
                  backgroundColor: p.searchEnabled
                    ? "hsl(var(--primary))"
                    : "hsl(var(--foreground) / 0.18)",
                }}
              >
                <span
                  className="absolute top-1/2 rounded-full bg-white"
                  style={{
                    width: 14,
                    height: 14,
                    marginTop: -7,
                    left: p.searchEnabled ? 16 : 2,
                    boxShadow: "0px 2px 4px rgba(0,0,0,0.15)",
                  }}
                />
              </span>
            </button>
            <DesktopRow
              Icon={Lightbulb}
              label="Skills"
              color="#FACC15"
              onClick={() => p.setPlusView("skills")}
              chevron
            />
            <DesktopRow
              Icon={Wrench}
              label="Integrations"
              color="#EC4899"
              onClick={() => p.setPlusView("tools")}
              chevron
            />
            <DesktopRow
              Icon={Plug}
              label="MCP Servers"
              color="#22D3EE"
              onClick={() => {
                p.setPlusMenuOpen(false);
                p.navigate("/settings/mcp");
              }}
            />
          </>
        )}
      </div>
    </motion.div>
  );
};

const PlusModels = (p: PlusContentProps) => (
  <motion.div key="models" {...fadeProps(12)} className="flex flex-col">
    <div className="flex items-center gap-1 px-1.5 pt-1 pb-2">
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => p.setPlusView("main")}
        className="w-7 h-7 flex items-center justify-center rounded-full liquid-glass-hover"
        aria-label="Back"
      >
        <ChevronLeft className="w-4 h-4 text-foreground/80" />
      </motion.button>
      <span className="text-[13px] font-semibold text-foreground/85">Choose Model</span>
    </div>
    <div className="flex flex-col gap-1">
      {[
        { id: "lite" as const, label: "Lite", desc: "Fast everyday answers", pro: false },
        { id: "pro" as const, label: "Pro", desc: "Smarter reasoning", pro: true },
        { id: "max" as const, label: "Max", desc: "1T+ flagship intelligence", pro: true },
      ].map((t) => {
        const locked = t.pro && (p.userPlan === "free" || p.userPlan === "trial");
        const active = p.megsyTier === t.id;
        return (
          <motion.button
            key={t.id}
            whileTap={{ scale: 0.98 }}
            transition={iosSpring}
            onClick={() => {
              if (locked) {
                toast.info("Megsy " + t.label + " is available on premium plans only");
                return;
              }
              p.setMegsyTier(t.id);
              if (p.chatUserId) {
                supabase
                  .from("ai_personalization")
                  .upsert({ user_id: p.chatUserId, preferred_tier: t.id } as any, {
                    onConflict: "user_id",
                  })
                  .then(() => {});
              }
              p.setPlusView("main");
            }}
            className={glassModelMenu.item(active, "gap-3 rounded-[18px]")}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[13.5px] font-semibold text-foreground">
                  {t.label}
                </span>
                {t.pro && (
                  <span className="text-[8px] font-bold px-1 py-px rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    PRO
                  </span>
                )}
                {locked && <span className="text-[10px] opacity-70">🔒</span>}
              </div>
              <div className="text-[11px] font-medium leading-tight text-foreground/55">
                {t.desc}
              </div>
            </div>

            {active && <Check className="w-4 h-4 text-primary shrink-0" strokeWidth={2.5} />}
          </motion.button>
        );
      })}
    </div>
  </motion.div>
);

const PlusSkills = (p: PlusContentProps) => (
  <motion.div key="skills" {...fadeProps(12)} className="flex min-h-0 flex-col">
    <div className="flex items-center gap-2 px-1 pt-1 pb-2">
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => p.setPlusView("main")}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-foreground/[0.06] active:bg-foreground/[0.1] transition-colors"
        aria-label="Back"
      >
        <ChevronLeft className="w-4 h-4 text-brand-parchment" />
      </motion.button>
      <span className="flex-1 text-[14.5px] font-semibold text-brand-parchment">Skills</span>
      <button
        onClick={() => {
          p.setPlusMenuOpen(false);
          p.navigate("/settings/skills");
        }}
        className="text-[12px] text-brand-muted hover:text-brand-parchment font-bold px-2"
      >
        Manage
      </button>
    </div>
    <div className="px-3 pb-3 text-[12px] text-brand-muted leading-snug">
      Toggle skills on. The AI picks which to use each turn.
    </div>
    <div className="flex min-h-0 flex-col overflow-y-auto overscroll-contain pb-3 pr-1">
      {p.mySkills.length === 0 && (
        <button
          onClick={() => {
            p.setPlusMenuOpen(false);
            p.navigate("/settings/skills");
          }}
          className="mx-1 mb-1 w-[calc(100%-0.5rem)] flex items-center justify-center gap-2 py-5 text-[13px] text-brand-parchment border border-dashed border-foreground/15 rounded-xl hover:bg-foreground/[0.06]"
        >
          <Plus className="w-3.5 h-3.5" /> Add your first skill
        </button>
      )}
      {p.mySkills.map((skill, idx) => {
        const enabled = skill.is_enabled !== false;
        return (
          <div key={`mine-${skill.id}`}>
            {idx > 0 && <div className="h-px bg-foreground/10 ml-3" />}
            <div
              role="button"
              tabIndex={0}
              onClick={() => p.toggleEnabled(skill, !enabled)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  p.toggleEnabled(skill, !enabled);
                }
              }}
              className="w-full flex items-center gap-3 px-3 py-3 hover:bg-foreground/[0.06] active:bg-foreground/[0.1] transition-colors cursor-pointer rounded-xl"
            >
              <span
                aria-hidden
                className="shrink-0 w-2 h-2 rounded-full"
                style={{ backgroundColor: enabled ? "#FACC15" : "hsl(var(--surface-4))" }}
              />
              <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-brand-parchment leading-tight">
                  {skill.name}
                </div>
                {skill.description && (
                  <div className="text-[11.5px] text-brand-muted leading-snug mt-0.5">
                    {skill.description}
                  </div>
                )}
              </div>
              <span
                className="relative shrink-0 rounded-full transition-colors duration-200"
                style={{
                  width: 36,
                  height: 22,
                  backgroundColor: enabled ? "hsl(var(--brand-action))" : "var(--overlay-white-18)",
                }}
                aria-hidden="true"
              >
                <span
                  className="absolute top-1/2 rounded-full bg-white transition-all"
                  style={{
                    width: 18,
                    height: 18,
                    marginTop: -9,
                    left: enabled ? 16 : 2,
                    boxShadow: "0px 2px 4px rgba(0,0,0,0.18)",
                  }}
                />
              </span>
            </div>
          </div>
        );
      })}
      {p.librarySkills.filter((l) => !p.mySkills.some((m) => m.name === l.name)).length > 0 && (
        <div className="mt-3 px-3 pb-1 text-[11px] uppercase tracking-wider text-brand-muted font-semibold">
          Library
        </div>
      )}
      {p.librarySkills
        .filter((l) => !p.mySkills.some((m) => m.name === l.name))
        .map((skill, idx) => (
          <div key={`sys-${skill.id}`}>
            {idx > 0 && <div className="h-px bg-foreground/10 ml-3" />}
            <div className="px-3 py-3">
              <div className="flex items-center gap-2">
                <span className="flex-1 text-[13.5px] font-bold text-brand-parchment/85 leading-tight">
                  {skill.name}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-foreground/10 text-brand-parchment font-bold">
                  Built-in
                </span>
              </div>
              {skill.description && (
                <div className="text-[11.5px] text-brand-muted leading-snug mt-0.5">
                  {skill.description}
                </div>
              )}
            </div>
          </div>
        ))}
    </div>
  </motion.div>
);

const PlusMusic = (p: PlusContentProps) => (
  <motion.div key="music" {...fadeProps(12)} className="flex flex-col">
    <div className="flex items-center gap-1 px-1.5 pt-1 pb-2">
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => p.setPlusView("main")}
        className="w-7 h-7 flex items-center justify-center rounded-full liquid-glass-hover"
        aria-label="Back"
      >
        <ChevronLeft className="w-4 h-4 text-foreground/80" />
      </motion.button>
      <span className="text-[13px] font-semibold text-foreground/85">Study music</span>
    </div>
    <div className="flex flex-col gap-1">
      {[
        { id: "Lo-fi", url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3" },
        { id: "Classical", url: "https://cdn.pixabay.com/audio/2022/10/25/audio_92215f17a4.mp3" },
        {
          id: "Nature sounds",
          url: "https://cdn.pixabay.com/audio/2022/03/15/audio_e1ada46b94.mp3",
        },
        { id: "Focus beats", url: "https://cdn.pixabay.com/audio/2023/06/02/audio_5d4cb33a1d.mp3" },
        { id: "White noise", url: "https://cdn.pixabay.com/audio/2022/03/24/audio_e87a37a40b.mp3" },
        { id: "Off", url: "" },
      ].map((opt) => {
        const active = (p.studyMusic.kind || "Off") === opt.id;
        return (
          <motion.button
            key={opt.id}
            whileTap={{ scale: 0.98 }}
            transition={iosSpring}
            onClick={() => {
              if (opt.id === "Off") {
                p.setStudyMusic({ kind: null });
                if (p.studyAudioRef.current) {
                  p.studyAudioRef.current.pause();
                  p.studyAudioRef.current.src = "";
                }
              } else {
                p.setStudyMusic({ kind: opt.id });
                if (!p.studyAudioRef.current) p.studyAudioRef.current = new Audio();
                p.studyAudioRef.current.loop = true;
                p.studyAudioRef.current.src = opt.url;
                p.studyAudioRef.current.volume = 0.5;
                p.studyAudioRef.current
                  .play()
                  .catch(() => toast.info(`Selected ${opt.id} (audio blocked by browser)`));
              }
              p.setPlusView("main");
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[18px] text-left transition-colors border ${active ? "border-foreground/25 bg-foreground/[0.12]" : "border-foreground/12 bg-foreground/[0.05] active:bg-foreground/[0.08]"}`}
          >
            <Music2
              className={`w-[18px] h-[18px] ${active ? "text-brand-mint" : "text-brand-mint"}`}
              strokeWidth={2.2}
            />
            <span className="flex-1 text-[13.5px] font-semibold text-foreground">
              {opt.id}
            </span>

            {active && (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
            )}
          </motion.button>
        );
      })}

      <button
        type="button"
        disabled={p.uploadingMusic}
        onClick={() => p.musicFileInputRef.current?.click()}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[18px] border border-dashed border-brand-mint/50 bg-foreground/[0.05] transition-colors text-left disabled:opacity-60"
      >
        {p.uploadingMusic ? (
          <Loader2 className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400 animate-spin" />
        ) : (
          <Plus
            className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400"
            strokeWidth={2}
          />
        )}
        <span className="flex-1 text-[13.5px] text-foreground/90">
          {p.uploadingMusic ? "Uploading…" : "Upload your music"}
        </span>
      </button>

      {p.userTracks.length > 0 && (
        <>
          <div className="mt-2 px-3 text-[10px] uppercase tracking-wide text-muted-foreground/70">
            My tracks
          </div>
          {p.userTracks.map((track) => {
            const active = p.studyMusic.kind === track.name;
            return (
              <div
                key={track.id}
                className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors ${active ? "bg-emerald-500/10 border border-emerald-500/30" : "liquid-glass-hover border border-transparent"}`}
              >
                <button
                  onClick={() => {
                    p.playUserTrack(track);
                    p.setPlusView("main");
                  }}
                  className="flex-1 flex items-center gap-3 text-left min-w-0"
                >
                  <Music2
                    className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400 shrink-0"
                    strokeWidth={1.75}
                  />
                  <span className="flex-1 text-[13.5px] text-foreground/90 truncate">
                    {track.name}
                  </span>
                  {active && (
                    <Check
                      className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"
                      strokeWidth={2.5}
                    />
                  )}
                </button>
                <button
                  onClick={() => p.deleteUserTrack(track)}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                  aria-label={`Delete ${track.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </>
      )}
    </div>
    <input
      ref={p.musicFileInputRef}
      type="file"
      accept="audio/*"
      className="hidden"
      onChange={p.handleMusicUpload}
    />
  </motion.div>
);

const PlusTimer = (p: PlusContentProps) => (
  <motion.div key="timer" {...fadeProps(12)} className="flex flex-col">
    <div className="flex items-center gap-1 px-1.5 pt-1 pb-2">
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => p.setPlusView("main")}
        className="w-7 h-7 flex items-center justify-center rounded-full liquid-glass-hover"
        aria-label="Back"
      >
        <ChevronLeft className="w-4 h-4 text-foreground/80" />
      </motion.button>
      <span className="text-[13px] font-semibold text-foreground/85">Focus timer</span>
    </div>
    <div className="px-2 pb-1">
      <div className="grid grid-cols-4 gap-1.5 mb-2">
        {[15, 25, 45, 60].map((m) => (
          <button
            key={m}
            onClick={() => p.setTimerInputMin(m)}
            className={`py-2 rounded-xl text-[12.5px] font-semibold transition-colors ${p.timerInputMin === m ? "bg-emerald-600 text-foreground" : "liquid-glass-hover text-foreground/85"}`}
          >
            {m}m
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-2">
        <input
          type="number"
          min={1}
          max={180}
          value={p.timerInputMin}
          onChange={(e) =>
            p.setTimerInputMin(Math.max(1, Math.min(180, parseInt(e.target.value || "0") || 1)))
          }
          className="flex-1 bg-transparent border border-border/40 rounded-xl px-3 py-2 text-[13px] text-foreground outline-none focus:border-emerald-500/60"
        />
        <span className="text-[12px] text-muted-foreground">minutes</span>
      </div>
      <button
        onClick={() => {
          const id = `timer-${Date.now()}`;
          p.setStudyTimers((prev) => [
            ...prev,
            {
              id,
              totalSec: p.timerInputMin * 60,
              startedAt: Date.now(),
              paused: false,
              pausedRemaining: null,
            },
          ]);
          p.setPlusMenuOpen(false);
          setTimeout(() => p.scrollToBottom(), 100);
        }}
        className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-foreground text-[13px] font-semibold hover:bg-emerald-500 transition-colors"
      >
        <Play className="w-4 h-4" fill="currentColor" /> Start session
      </button>
    </div>
  </motion.div>
);

const PlusSkillsBody = (p: PlusContentProps) => (
  <div className="flex flex-1 min-h-0 flex-col">
    <div className="flex items-center gap-2 px-1 pb-2">
      <span className="flex-1 text-[12.5px] text-brand-muted leading-snug">
        Toggle skills on. The AI picks which to use.
      </span>
      <button
        onClick={() => {
          p.setPlusMenuOpen(false);
          p.navigate("/settings/skills");
        }}
        className="text-[12px] text-brand-muted hover:text-brand-parchment font-bold px-2"
      >
        Manage
      </button>
    </div>
    <div className="flex min-h-0 flex-col overflow-y-auto overscroll-contain pb-3 pr-1">
      {p.mySkills.length === 0 && (
        <button
          onClick={() => {
            p.setPlusMenuOpen(false);
            p.navigate("/settings/skills");
          }}
          className="mx-1 mb-1 w-[calc(100%-0.5rem)] flex items-center justify-center gap-2 py-5 text-[13px] text-brand-parchment border border-dashed border-foreground/15 rounded-xl hover:bg-foreground/[0.06]"
        >
          <Plus className="w-3.5 h-3.5" /> Add your first skill
        </button>
      )}
      {p.mySkills.map((skill, idx) => {
        const enabled = skill.is_enabled !== false;
        return (
          <div key={`mine-${skill.id}`}>
            {idx > 0 && <div className="h-px bg-foreground/10 ml-3" />}
            <div
              role="button"
              tabIndex={0}
              onClick={() => p.toggleEnabled(skill, !enabled)}
              className="px-3 py-3 flex items-center gap-2 cursor-pointer active:bg-foreground/[0.06] rounded-xl"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-bold text-brand-parchment leading-tight break-words">
                  {skill.name}
                </div>
                {skill.description && (
                  <div className="text-[11.5px] text-brand-muted leading-snug mt-0.5 line-clamp-2">
                    {skill.description}
                  </div>
                )}
              </div>
              <span
                className="relative shrink-0 rounded-full transition-colors"
                style={{
                  width: 36,
                  height: 22,
                  backgroundColor: enabled
                    ? "hsl(var(--brand-action))"
                    : "var(--overlay-white-18)",
                }}
                aria-hidden="true"
              >
                <span
                  className="absolute top-1/2 rounded-full bg-white"
                  style={{
                    width: 18,
                    height: 18,
                    marginTop: -9,
                    left: enabled ? 16 : 2,
                    boxShadow: "0px 2px 4px rgba(0,0,0,0.18)",
                  }}
                />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const PlusIntegrationsBody = (p: PlusContentProps) => (
  <div className="flex flex-1 min-h-0 flex-col">
    <div className="pb-3 shrink-0">
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-1 pb-1">
        {p.integrationCategories.map((cat) => {
          const active = cat === p.integrationsCategory;
          return (
            <button
              key={cat}
              onClick={() => p.setIntegrationsCategory(cat)}
              className={`shrink-0 px-4 h-9 rounded-full text-[12.5px] font-semibold border transition-colors whitespace-nowrap ${
                active
                  ? "border-foreground/25 bg-foreground/[0.14] text-foreground"
                  : "border-foreground/12 bg-foreground/[0.05] text-foreground/80 active:bg-foreground/[0.08]"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </div>
    <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto overscroll-contain pb-3 px-0.5 w-full">
      {p.filteredIntegrations.length === 0 && (
        <div className="py-10 text-center text-[12.5px] text-brand-muted">
          No apps match "{p.integrationsQuery}"
        </div>
      )}
      {[...p.filteredIntegrations].sort((a, b) => {
        const ca = !!(p.userIntegrations as Record<string, boolean>)[a.app];
        const cb = !!(p.userIntegrations as Record<string, boolean>)[b.app];
        return Number(cb) - Number(ca);
      }).map((it) => {
        const connected =
          (Array.isArray(p.userIntegrations)
            ? p.userIntegrations.some((n) => n.toLowerCase() === it.name.toLowerCase())
            : false) || !!(p.userIntegrations as unknown as Record<string, boolean>)[it.app];
        const isLoading = p.connectingApp === it.id;
        const logoBroken = p.brokenLogos[it.id];
        const letter =
          it.name.replace(/[^A-Za-z0-9]/g, "").charAt(0).toUpperCase() || "•";
        return (
          <motion.button
            key={it.id}
            whileTap={{ scale: 0.99 }}
            transition={iosSpring}
            onClick={() => p.connectIntegration(it)}
            disabled={isLoading}
            className="w-full grid items-center gap-3 px-3 py-3 rounded-[18px] bg-foreground/[0.05] border border-foreground/12 transition-colors active:bg-foreground/[0.08] text-start"
            style={{ gridTemplateColumns: "36px minmax(0,1fr) auto" }}
          >
            <div className="relative w-9 h-9 flex items-center justify-center overflow-visible rounded-lg bg-foreground/10 border border-foreground/15">
              {it.domain && !logoBroken ? (
                <img loading="lazy" decoding="async"
                  src={`https://www.google.com/s2/favicons?domain=${it.domain}&sz=64`}
                  alt=""
                  className="w-6 h-6 object-contain"
                  onError={() => p.setBrokenLogos((s) => ({ ...s, [it.id]: true }))}
                />
              ) : (
                <span className="w-6 h-6 rounded bg-foreground/10 flex items-center justify-center text-foreground text-[11px] font-bold">
                  {letter}
                </span>
              )}
              {connected && (
                <span
                  aria-hidden
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                  style={{ background: "#34c759", boxShadow: "0 0 0 2px rgba(20,22,26,0.95), 0 0 8px rgba(52,199,89,0.6)" }}
                />
              )}
            </div>
            <div className="min-w-0 overflow-hidden">
              <div className="text-[14px] font-semibold text-foreground leading-tight truncate">
                {it.name}
              </div>
              <div className="text-[11.5px] text-brand-muted font-medium leading-snug mt-0.5 line-clamp-2 break-words">
                {it.description}
              </div>
            </div>
            {connected ? (
              <span className="text-[11px] font-semibold text-brand-mint inline-flex items-center gap-1 whitespace-nowrap">
                <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Connected
              </span>
            ) : isLoading ? (
              <Loader2 className="w-4 h-4 text-foreground/60 animate-spin" />
            ) : (
              <span className="inline-flex items-center justify-center h-7 px-3 rounded-full bg-foreground/10 text-foreground border border-foreground/20 text-[11.5px] font-semibold whitespace-nowrap">
                Connect
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  </div>
);

const PlusTools = (p: PlusContentProps) => {
  const isSkills = p.plusView === "skills";

  return (
    <motion.div key={isSkills ? "skills" : "integrations"} {...fadeProps(12)} className="flex flex-1 min-h-0 h-full flex-col">
      <div className="flex items-center gap-2 px-1 pt-1 pb-2">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => p.setPlusView("main")}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-foreground/[0.06] active:bg-foreground/[0.1] transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="w-4 h-4 text-brand-parchment" />
        </motion.button>
        <span className="flex-1 text-[14.5px] font-semibold text-brand-parchment">
          {isSkills ? "Skills" : "Integrations"}
        </span>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        {isSkills ? <PlusSkillsBody {...p} /> : <PlusIntegrationsBody {...p} />}
      </div>
    </motion.div>
  );
};


const PlusContent = (props: PlusContentProps) => {
  const isBig = props.plusView === "skills" || props.plusView === "tools";
  return (
    <div className={`gemini-plus-menu ${isBig ? "flex flex-1 min-h-0 h-full flex-col" : ""}`}>
      <AnimatePresence initial={false}>
        {props.plusView === "main" ? (
          <PlusMain {...props} />
        ) : props.plusView === "models" ? (
          <PlusModels {...props} />
        ) : props.plusView === "music" ? (
          <PlusMusic {...props} />
        ) : props.plusView === "timer" ? (
          <PlusTimer {...props} />
        ) : (
          <PlusTools {...props} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default memo(PlusContent);
