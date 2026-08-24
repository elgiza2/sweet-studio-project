import { useEffect, useRef, useState } from "react";
import { ArrowUpLeft, Check, ChevronRight, Loader2, MoreHorizontal, SlidersHorizontal, Trash2 } from "lucide-react";
import type { Integration } from "@/lib/integrationsData";
import { IntegrationLogo } from "./IntegrationRow";

interface Props {
  item: Integration;
  connected: boolean;
  busy: boolean;
  onBack: () => void;
  onToggle: () => void;
}

/** Level 2 — connector detail. Scrolling is owned by the sheet container. */
export default function IntegrationDetail({ item, connected, busy, onBack, onToggle }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const site = item.domain ? `https://${item.domain}` : undefined;

  return (
    <div className="flex min-h-full flex-col">
      <div className="relative flex shrink-0 items-center justify-between pb-1">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-foreground/70"
          style={{ border: 0 }}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <span className="text-[15px] font-semibold text-foreground">{item.name}</span>
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Options"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-foreground/70"
            style={{ border: 0 }}
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {menuOpen && (
            <div className="absolute left-0 top-9 z-20 w-48 overflow-hidden rounded-[16px] bg-card p-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  if (site) window.open(site, "_blank", "noopener");
                }}
                className="flex w-full items-center justify-between gap-2 rounded-[12px] bg-transparent px-3 py-2.5 text-[14px] text-foreground"
                style={{ border: 0 }}
              >
                <span>Configure</span>
                <SlidersHorizontal className="h-[18px] w-[18px] text-foreground/60" />
              </button>
              <button
                type="button"
                disabled={!connected}
                onClick={() => {
                  setMenuOpen(false);
                  onToggle();
                }}
                className="flex w-full items-center justify-between gap-2 rounded-[12px] bg-transparent px-3 py-2.5 text-[14px] text-destructive disabled:opacity-40"
                style={{ border: 0 }}
              >
                <span>Disconnect</span>
                <Trash2 className="h-[18px] w-[18px]" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center pt-4 text-center">
        <IntegrationLogo item={item} size={72} />
        <h3 className="mt-3 text-[19px] font-semibold text-foreground">{item.name}</h3>
        <p className="mt-2 max-w-[34ch] text-[13px] leading-[1.7] text-foreground/50">
          {`Connect your ${item.name} account to use it securely and run tasks from chat.`}
        </p>
      </div>

      {connected && (
        <div className="mt-5 flex items-center justify-between gap-2 rounded-[14px] bg-foreground/[0.05] px-4 py-3">
          <span className="truncate text-[13px] text-foreground/70">
            Connected to {site ?? item.name}
          </span>
          <Check className="h-[18px] w-[18px] shrink-0 text-foreground/70" />
        </div>
      )}

      <p className="mb-1 mt-6 px-2 text-[12.5px] text-foreground/40">Details</p>
      <div className="overflow-hidden rounded-[18px] bg-card">
        <DetailRow label="Connector type" value={typeLabel(item.type)} />
        <DetailRow label="Author" value={item.name} />
        <LinkRow label="Website" href={site} />
        <LinkRow label="Documentation" href={site ? `${site}/docs` : undefined} />
        <LinkRow label="Privacy policy" href={site ? `${site}/privacy` : undefined} last />
      </div>

      <div className="mt-4 overflow-hidden rounded-[18px] bg-card">
        <LinkRow label="Send feedback" href="mailto:support@example.com" last />
      </div>

      <div className="mt-6 pb-2">
        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          className="inline-flex h-12 w-full items-center justify-center rounded-[16px] bg-foreground text-[14.5px] font-semibold text-background transition-opacity active:opacity-80"
          style={{ border: 0 }}
        >
          {busy ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : connected ? "Try it" : "Connect"}
        </button>
      </div>
    </div>
  );
}

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3.5"
      style={last ? undefined : { boxShadow: "inset 0 -1px 0 hsl(var(--foreground) / 0.06)" }}
    >
      <span className="text-[13px] text-foreground/45">{label}</span>
      <span className="max-w-[60%] truncate text-[13.5px] text-foreground">{value}</span>
    </div>
  );
}

function typeLabel(t: Integration["type"]) {
  switch (t) {
    case "oauth":
      return "OAuth";
    case "notification":
      return "Notifications";
    case "service":
      return "MCP";
    default:
      return "App";
  }
}

function LinkRow({ label, href, last }: { label: string; href?: string; last?: boolean }) {
  return (
    <button
      type="button"
      disabled={!href}
      onClick={() => href && window.open(href, "_blank", "noopener")}
      className="flex w-full items-center justify-between bg-transparent px-4 py-3.5 text-right disabled:opacity-40"
      style={{
        border: 0,
        ...(last ? {} : { boxShadow: "inset 0 -1px 0 hsl(var(--foreground) / 0.06)" }),
      }}
    >
      <span className="text-[13px] text-foreground/45">{label}</span>
      <ArrowUpLeft className="h-[18px] w-[18px] text-foreground/40" />
    </button>
  );
}
