import { useState } from "react";
import { X } from "lucide-react";
import researchImg from "@/assets/svc-research.png";
import imageImg from "@/assets/svc-image.png";
import videoImg from "@/assets/svc-video.png";
import slidesImg from "@/assets/svc-slides.png";
import webImg from "@/assets/svc-web.png";
import docsImg from "@/assets/svc-docs.png";
import integrationsImg from "@/assets/svc-integrations.png";

export interface StarterCardsProps {
  /** Fills the composer with the card prompt and activates the service. */
  onPick: (prompt: string, mode?: string) => void;
  className?: string;
}

/** Every real service the app offers — no filler. */
const CARDS = [
  {
    id: "research",
    mode: "deep-research",
    img: researchImg,
    title: "Deep research",
    desc: "A structured report with trusted sources.",
    prompt: "Do deep, structured research with sources about: ",
  },
  {
    id: "image",
    mode: "images",
    img: imageImg,
    title: "Generate images",
    desc: "High-quality images from a text prompt.",
    prompt: "Generate a high-quality image of: ",
  },
  {
    id: "video",
    mode: "video",
    img: videoImg,
    title: "Generate video",
    desc: "Short clips from a written idea.",
    prompt: "Generate a short video about: ",
  },
  {
    id: "slides",
    mode: "slides",
    img: slidesImg,
    title: "Presentation",
    desc: "Complete slides with a clean design.",
    prompt: "Create a complete presentation about: ",
  },
  {
    id: "web",
    mode: "code",
    img: webImg,
    title: "Build a website",
    desc: "A page or full site ready to publish.",
    prompt: "Build me a website about: ",
  },
  {
    id: "docs",
    mode: "docs",
    img: docsImg,
    title: "Analyze documents",
    desc: "Upload a PDF or file and ask about it.",
    prompt: "Analyze this document and extract the key points: ",
  },

  {
    id: "integrations",
    img: integrationsImg,
    title: "Integrations",
    desc: "Connect your apps and act from them directly.",
    prompt: "Use my connected integrations to: ",
  },
];

/**
 * Manus-style starter carousel shown above the composer before the first
 * message. Transparent artwork, horizontal scroll, dismissible per session.
 */
export function StarterCards({ onPick, className = "" }: StarterCardsProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between px-2 pb-2">
        <span className="text-[13px] font-medium text-foreground/70">Get started</span>
        <button
          type="button"
          aria-label="Hide suggestions"
          onClick={() => setDismissed(true)}
          className="p-1 rounded-full text-foreground/45 hover:text-foreground/80 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2.5 overflow-x-auto px-2 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x">
        {CARDS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick(c.prompt, (c as { mode?: string }).mode)}
            className="snap-start shrink-0 w-[84%] max-w-[330px] flex items-center gap-3 rounded-[16px] border-0 bg-[color:var(--chat-claude-composer,#262627)] hover:brightness-110 active:scale-[0.99] transition-all px-3.5 py-3 text-start"
          >
            <img
              src={c.img}
              alt=""
              loading="lazy"
              decoding="async"
              width={512}
              height={512}
              className="w-[58px] h-[58px] object-contain shrink-0"
            />
            <span className="min-w-0 flex flex-col gap-1">
              <span className="text-[15px] font-bold leading-tight text-foreground truncate">
                {c.title}
              </span>
              <span className="text-[12.5px] leading-snug text-foreground/45 line-clamp-2">
                {c.desc}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default StarterCards;
