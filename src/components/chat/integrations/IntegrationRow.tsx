import { useMemo, useState } from "react";
import { Check, ChevronLeft, Loader2 } from "lucide-react";
import type { Integration } from "@/lib/integrationsData";

/** Ordered logo sources: Simple Icons → Unavatar → Google favicon. */
function logoSources(item: Integration): string[] {
  const out: string[] = [];
  const slug = (item.pipedreamSlug || item.app || item.id)
    .toLowerCase()
    .replace(/[_\s]+/g, "")
    .replace(/[^a-z0-9-]/g, "");
  if (slug) out.push(`https://cdn.simpleicons.org/${slug}`);
  if (item.domain) {
    out.push(`https://unavatar.io/${item.domain}?fallback=false`);
    out.push(`https://www.google.com/s2/favicons?domain=${item.domain}&sz=128`);
  }
  return out;
}

export function IntegrationLogo({ item, size = 40 }: { item: Integration; size?: number }) {
  const sources = useMemo(() => logoSources(item), [item]);
  const [idx, setIdx] = useState(0);
  const src = sources[idx];

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-foreground/[0.06]"
      style={{ width: size, height: size }}
    >
      {src ? (
        <img
          src={src}
          alt={item.name}
          loading="lazy"
          className="object-contain"
          style={{ width: size * 0.6, height: size * 0.6 }}
          onError={() => setIdx((i) => i + 1)}
        />
      ) : (
        <span className="text-[13px] font-semibold text-foreground/70">{item.name.slice(0, 1)}</span>
      )}
    </span>
  );
}

interface RowProps {
  item: Integration;
  connected: boolean;
  busy: boolean;
  onOpen: () => void;
}

/** Flat connector row — no card, sits directly on the sheet surface. */
export default function IntegrationRow({ item, connected, busy, onOpen }: RowProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-integration-row
      className="flex w-full items-center gap-3 rounded-[14px] px-2 py-2.5 text-right transition-colors active:bg-foreground/[0.05]"
      style={{ border: 0, background: "transparent", minHeight: 58 }}
    >
      <IntegrationLogo item={item} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-medium text-foreground">{item.name}</span>
        <span
          dir="auto"
          className="mt-0.5 block truncate text-[11.5px] leading-[1.5] text-foreground/40"
        >
          {`Use ${item.name} right inside your chats`}
        </span>
      </span>
      <span className="shrink-0 text-foreground/35">
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : connected ? (
          <Check style={{ width: 18, height: 18 }} className="text-primary" />
        ) : (
          <ChevronLeft className="h-[18px] w-[18px]" />
        )}
      </span>
    </button>
  );
}
