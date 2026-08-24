/**
 * MediaGenerationSkeleton — placeholder tiles shown while image / video / music
 * results stream in. Gives users an immediate visual cue that generation is
 * underway instead of a bare "typing…" dot.
 *
 * The component is purely presentational: it derives tile count from the media
 * settings if provided, otherwise falls back to a sensible default per kind.
 * Renders nothing outside the three supported kinds so it's safe to mount
 * unconditionally next to any assistant message.
 */

import { Image as ImageIcon, Film, Music } from "lucide-react";

type Kind = "images" | "video" | "music";

interface MediaGenerationSkeletonProps {
  kind: Kind;
  /** Optional count override (e.g. 4 image variants). Clamped 1-6. */
  count?: number;
  className?: string;
}

const KIND_META: Record<
  Kind,
  { icon: typeof ImageIcon; label: string; aspect: string; tint: string }
> = {
  images: {
    icon: ImageIcon,
    label: "Generating images…",
    aspect: "aspect-square",
    tint: "from-fuchsia-500/10 via-rose-500/5 to-transparent",
  },
  video: {
    icon: Film,
    label: "Generating video…",
    aspect: "aspect-video",
    tint: "from-cyan-500/10 via-sky-500/5 to-transparent",
  },
  music: {
    icon: Music,
    label: "Composing the song…",
    aspect: "h-24 w-full",
    tint: "from-emerald-500/10 via-teal-500/5 to-transparent",
  },
};

export function MediaGenerationSkeleton({
  kind,
  count,
  className = "",
}: MediaGenerationSkeletonProps) {
  const meta = KIND_META[kind];
  if (!meta) return null;

  // Always a single clean loading tile — the finished media renders in its place.
  const tileCount = 1;
  const Icon = meta.icon;

  return (
    <div
      className={`mb-3 w-full max-w-[42rem] ${className}`}
      role="status"
      aria-live="polite"
      aria-label={meta.label}
    >
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5 animate-pulse" />
        <span>{meta.label}</span>
      </div>
      <div
        className={
          kind === "music"
            ? "flex flex-col gap-2"
            : `grid gap-2 ${tileCount > 1 ? "grid-cols-2" : "grid-cols-1"}`
        }
      >
        {Array.from({ length: tileCount }).map((_, i) => (
          <div
            key={i}
            className={`relative overflow-hidden rounded-xl border border-border/40 bg-muted/40 ${meta.aspect}`}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${meta.tint}`}
              aria-hidden
            />
            <div
              className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"
              aria-hidden
            />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

export default MediaGenerationSkeleton;
