import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { integrations as CATALOG, type Integration } from "@/lib/integrationsData";
import {
  loadIntegrationConnections,
  startIntegrationConnection,
  disconnectIntegration,
  waitForConnectionRefresh,
} from "@/lib/integrationBackend";
import IntegrationRow from "./integrations/IntegrationRow";
import IntegrationDetail from "./integrations/IntegrationDetail";
import EmptyConnectors from "./integrations/EmptyConnectors";

const DraggablePlusSheet = lazy(() =>
  import("@/pages/chat/components/DraggablePlusSheet").then((m) => ({
    default: m.DraggablePlusSheet,
  })),
);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Tab = "apps" | "api" | "mcp";

const TABS: { id: Tab; label: string }[] = [
  { id: "apps", label: "Apps" },
  { id: "api", label: "Custom API" },
  { id: "mcp", label: "Custom MCP" },
];

/** Connectors needing an API key / manual credentials instead of OAuth. */
const needsApiKey = (i: Integration) => i.type === "service" || i.type === "notification";

const SLIDE = { duration: 0.22, ease: [0.32, 0.72, 0, 1] as const };

/**
 * Connectors sheet — same container, physics and surface as the composer "+"
 * menu: opens compact, expands on scroll, drag anywhere to dismiss.
 */
export default function IntegrationsSheet({ open, onOpenChange }: Props) {
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("apps");
  const [busy, setBusy] = useState<string | null>(null);
  const [detail, setDetail] = useState<Integration | null>(null);
  const [size, setSize] = useState({ height: 600, collapsedY: 200 });

  const refresh = async () => {
    try {
      const snap = await loadIntegrationConnections(CATALOG);
      setConnected(snap.connectedApps || {});
      return snap.connectedApps || {};
    } catch {
      return {};
    }
  };

  useEffect(() => {
    if (!open) {
      setDetail(null);
      setQuery("");
      return;
    }
    void refresh();
    const vh = window.innerHeight;
    const expandedH = Math.min(vh * 0.8, vh - 72);
    const collapsedH = Math.max(360, Math.min(vh * 0.55, expandedH));
    setSize({ height: expandedH, collapsedY: Math.max(0, expandedH - collapsedH) });

  }, [open]);

  const list = useMemo(() => {
    const base = tab === "api" ? CATALOG.filter(needsApiKey) : CATALOG;
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q),
    );
  }, [query, tab]);

  const connectedList = list.filter((i) => connected[i.app]);
  const restList = list.filter((i) => !connected[i.app]);

  const toggle = async (item: Integration) => {
    setBusy(item.app);
    try {
      if (connected[item.app]) {
        await disconnectIntegration(item);
        await refresh();
        toast.success(`Disconnected ${item.name}`);
      } else {
        const res = await startIntegrationConnection(item);
        if ("popup" in res && res.popup) {
          await waitForConnectionRefresh(async () => {
            const apps = await refresh();
            return !!apps[item.app];
          }, res.popup);
        } else {
          await refresh();
        }
        toast.success(`Connected ${item.name}`);
      }
    } catch (e: any) {
      toast.error(e?.message || "Couldn't complete the action");
    } finally {
      setBusy(null);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[55] bg-transparent"
            onClick={() => onOpenChange(false)}
          />
          <Suspense fallback={null}>
            <DraggablePlusSheet
              height={size.height}
              collapsedY={detail ? 0 : size.collapsedY}
              bottomOffset={0}
              initialExpanded={false}
              view={detail ? `detail-${detail.id}` : tab}
              sheetKind="integrations"
              onClose={() => onOpenChange(false)}
            >
              <div dir="rtl" className="flex min-h-full flex-col">
                <AnimatePresence mode="wait" initial={false}>
                  {detail ? (
                    <motion.div
                      key="detail"
                      initial={{ x: -24, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -24, opacity: 0 }}
                      transition={SLIDE}
                      className="flex min-h-full flex-col"
                    >
                      <IntegrationDetail
                        item={detail}
                        connected={!!connected[detail.app]}
                        busy={busy === detail.app}
                        onBack={() => setDetail(null)}
                        onToggle={() => void toggle(detail)}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="list"
                      initial={{ x: 24, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 24, opacity: 0 }}
                      transition={SLIDE}
                      className="flex min-h-full flex-col"
                    >
                      <h2 className="px-2 pb-3 text-center text-[16px] font-semibold text-foreground">
                        Integrations
                      </h2>

                      <div data-connectors-search className="flex h-11 items-center gap-2 rounded-[16px] px-3.5">
                        <Search className="h-4 w-4 shrink-0 text-foreground/40" />
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search for an app"
                          className="h-full w-full text-[14px] text-foreground outline-none placeholder:text-foreground/35"
                          style={{
                            border: 0,
                            outline: "none",
                            boxShadow: "none",
                            background: "transparent",
                            borderRadius: 0,
                            padding: 0,
                            height: "100%",
                            minHeight: 0,
                            WebkitAppearance: "none",
                            appearance: "none",
                            touchAction: "auto",
                          }}
                        />
                      </div>

                      <div className="mt-3 flex gap-2">
                        {TABS.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTab(t.id)}
                            className={`rounded-full px-4 py-2 text-[13px] transition-colors ${
                              tab === t.id
                                ? "bg-foreground/[0.08] font-medium text-foreground"
                                : "bg-transparent text-foreground/55"
                            }`}
                            style={{ border: 0 }}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>

                      <div className="mt-2 flex-1">
                        {tab === "mcp" ? (
                          <EmptyConnectors
                            label="No custom MCP"
                            actionLabel="Create via chat"
                            onAction={() => onOpenChange(false)}
                          />
                        ) : list.length === 0 ? (
                          <EmptyConnectors label="No results" />
                        ) : (
                          <>
                            {connectedList.length > 0 && (
                              <div className="mb-3">
                                <p className="px-2 pb-1 pt-2 text-[12px] text-foreground/40">Currently connected</p>
                                {connectedList.map((item) => (
                                  <IntegrationRow
                                    key={item.id}
                                    item={item}
                                    connected
                                    busy={busy === item.app}
                                    onOpen={() => setDetail(item)}
                                  />
                                ))}
                              </div>
                            )}
                            {restList.map((item) => (
                              <IntegrationRow
                                key={item.id}
                                item={item}
                                connected={false}
                                busy={busy === item.app}
                                onOpen={() => setDetail(item)}
                              />
                            ))}
                          </>
                        )}
                      </div>

                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </DraggablePlusSheet>
          </Suspense>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
