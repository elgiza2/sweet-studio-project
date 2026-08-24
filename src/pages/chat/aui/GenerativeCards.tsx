import { makeAssistantToolUI } from "@assistant-ui/react";
import { BarChart3, Table as TableIcon, ListChecks } from "lucide-react";

/**
 * Generative UI cards — safe, allowlist-based rendering of structured JSON
 * produced by tools. No arbitrary code execution: only the shapes below are
 * rendered; unknown shapes fall back to a compact JSON view.
 */

type KVSpec = { type: "kv"; title?: string; items: { label: string; value: string | number }[] };
type TableSpec = {
  type: "table";
  title?: string;
  columns: string[];
  rows: (string | number)[][];
};
type BarSpec = {
  type: "bar";
  title?: string;
  data: { label: string; value: number }[];
};
type ListSpec = { type: "list"; title?: string; items: string[] };

type UISpec = KVSpec | TableSpec | BarSpec | ListSpec;

function isUISpec(x: unknown): x is UISpec {
  if (!x || typeof x !== "object") return false;
  const t = (x as { type?: unknown }).type;
  return t === "kv" || t === "table" || t === "bar" || t === "list";
}

function Shell({ icon: Icon, title, children }: { icon: typeof BarChart3; title?: string; children: React.ReactNode }) {
  return (
    <div className="my-2 rounded-2xl border border-foreground/10 bg-muted/40 p-3">
      {title && (
        <div className="mb-2 flex items-center gap-2 text-xs opacity-80">
          <Icon className="h-3.5 w-3.5" />
          <span className="font-medium">{title}</span>
        </div>
      )}
      {children}
    </div>
  );
}

function KV({ spec }: { spec: KVSpec }) {
  return (
    <Shell icon={ListChecks} title={spec.title}>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {spec.items.map((it, i) => (
          <div key={i} className="contents">
            <dt className="opacity-60">{it.label}</dt>
            <dd className="text-end">{String(it.value)}</dd>
          </div>
        ))}
      </dl>
    </Shell>
  );
}

function Tbl({ spec }: { spec: TableSpec }) {
  return (
    <Shell icon={TableIcon} title={spec.title}>
      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              {spec.columns.map((c, i) => (
                <th key={i} className="text-start opacity-70 font-medium py-1 px-2">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {spec.rows.map((row, i) => (
              <tr key={i} className="border-t border-foreground/5">
                {row.map((cell, j) => (
                  <td key={j} className="py-1 px-2">{String(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}

function Bar({ spec }: { spec: BarSpec }) {
  const max = Math.max(1, ...spec.data.map((d) => Number(d.value) || 0));
  return (
    <Shell icon={BarChart3} title={spec.title}>
      <ul className="space-y-1.5">
        {spec.data.map((d, i) => {
          const pct = Math.round(((Number(d.value) || 0) / max) * 100);
          return (
            <li key={i} className="text-xs">
              <div className="flex justify-between opacity-80">
                <span>{d.label}</span>
                <span className="tabular-nums">{d.value}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                <div className="h-full bg-primary/70" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}

function Lst({ spec }: { spec: ListSpec }) {
  return (
    <Shell icon={ListChecks} title={spec.title}>
      <ul className="list-disc ps-5 space-y-0.5 text-xs">
        {spec.items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </Shell>
  );
}

function renderSpec(spec: UISpec) {
  switch (spec.type) {
    case "kv":
      return <KV spec={spec} />;
    case "table":
      return <Tbl spec={spec} />;
    case "bar":
      return <Bar spec={spec} />;
    case "list":
      return <Lst spec={spec} />;
  }
}

const UiCardToolUI = makeAssistantToolUI<Record<string, unknown>, unknown>({
  toolName: "ui_card",
  render: ({ args, result }) => {
    const candidate = (result ?? args) as unknown;
    if (isUISpec(candidate)) return renderSpec(candidate);
    // Try nested { spec: ... } shape
    if (candidate && typeof candidate === "object" && isUISpec((candidate as { spec?: unknown }).spec)) {
      return renderSpec((candidate as { spec: UISpec }).spec);
    }
    return (
      <div className="my-2 rounded-2xl border border-foreground/10 bg-muted/40 p-3">
        <pre dir="ltr" className="text-[11px] opacity-80 overflow-auto max-h-56">
          {JSON.stringify(candidate ?? {}, null, 2)}
        </pre>
      </div>
    );
  },
});

export function RegisteredGenerativeUIs() {
  return <UiCardToolUI />;
}
