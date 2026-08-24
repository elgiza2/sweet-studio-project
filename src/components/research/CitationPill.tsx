import React, { isValidElement, cloneElement } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

const getHost = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};
const favicon = (u: string) =>
  `https://www.google.com/s2/favicons?domain=${getHost(u)}&sz=64`;

interface PillProps {
  n: number;
  url?: string;
}

/**
 * Inline numbered citation pill. On hover, shows a small card with the
 * favicon, host and full URL. Clicking opens the source in a new tab.
 */
export const CitationPill = ({ n, url }: PillProps) => {
  if (!url) {
    return (
      <sup className="mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted/50 px-1 text-[10px] font-semibold text-muted-foreground">
        {n}
      </sup>
    );
  }
  return (
    <HoverCard openDelay={80} closeDelay={80}>
      <HoverCardTrigger asChild>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] font-semibold text-primary no-underline transition-colors hover:bg-primary/20"
          aria-label={`Source ${n}: ${getHost(url)}`}
        >
          <sup className="leading-none">{n}</sup>
        </a>
      </HoverCardTrigger>
      <HoverCardContent side="top" align="center" className="w-72 p-3">
        <div className="flex items-start gap-3">
          <img decoding="async"
            src={favicon(url)}
            alt=""
            className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-muted object-cover"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium text-muted-foreground">
              Source {n}
            </div>
            <div className="mt-0.5 truncate text-sm font-semibold text-foreground">
              {getHost(url)}
            </div>
            <div className="mt-1 line-clamp-2 break-all text-[11px] text-muted-foreground/80">
              {url}
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

/**
 * Walks a react-markdown children tree and replaces `[N]` occurrences inside
 * string leaves with <CitationPill n={N} url={sources[N-1]} />. Non-matching
 * text is preserved.
 */
export function withInlineCitations(
  children: React.ReactNode,
  sources: string[],
): React.ReactNode {
  const re = /\[(\d{1,3})\]/g;
  const transform = (node: React.ReactNode, keyBase: string): React.ReactNode => {
    if (typeof node === "string") {
      if (!re.test(node)) return node;
      re.lastIndex = 0;
      const out: React.ReactNode[] = [];
      let last = 0;
      let m: RegExpExecArray | null;
      let i = 0;
      while ((m = re.exec(node)) !== null) {
        if (m.index > last) out.push(node.slice(last, m.index));
        const n = parseInt(m[1], 10);
        const url = sources[n - 1];
        out.push(<CitationPill key={`${keyBase}-cite-${i}-${n}`} n={n} url={url} />);
        last = m.index + m[0].length;
        i++;
      }
      if (last < node.length) out.push(node.slice(last));
      return out;
    }
    if (Array.isArray(node)) {
      return node.map((c, idx) => transform(c, `${keyBase}-${idx}`));
    }
    if (isValidElement(node)) {
      const el = node as React.ReactElement<any>;
      // Do NOT recurse into anchors/code — they already have their own semantics.
      if (el.type === "a" || el.type === "code" || el.type === "pre") return el;
      const kids = el.props?.children;
      if (kids === undefined) return el;
      return cloneElement(el, {}, transform(kids, `${keyBase}-${el.key ?? "c"}`));
    }
    return node;
  };
  return transform(children, "root");
}
