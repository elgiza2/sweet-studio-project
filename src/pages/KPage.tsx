/** @doc Unlabeled entry surface. Two fields, no context. */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Field = ({
  name,
  value,
  onChange,
  onSubmit,
  busy,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
}) => (
  <div className="flex items-center gap-2">
    <span className="w-5 shrink-0 text-center font-mono text-[13px] text-foreground/40">
      {name}
    </span>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSubmit();
      }}
      spellCheck={false}
      autoComplete="off"
      type="password"
      className="h-10 flex-1 rounded-lg border border-foreground/10 bg-foreground/[0.04] px-3 font-mono text-[13px] text-foreground outline-none focus:border-foreground/25"
    />
    <button
      type="button"
      onClick={onSubmit}
      disabled={busy || !value.trim()}
      className="h-10 rounded-lg border border-foreground/10 bg-foreground/[0.06] px-3 text-[13px] text-foreground/70 transition hover:bg-foreground/[0.1] disabled:opacity-30"
    >
      +
    </button>
  </div>
);

const KPage = () => {
  const [d, setD] = useState("");
  const [r, setR] = useState("");
  const [y, setY] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>({});

  const refresh = async () => {
    const { data } = await (supabase as any).rpc("provider_key_counts");
    setCounts((data as Record<string, number>) || {});
  };

  useEffect(() => {
    document.title = "k";
    refresh();
  }, []);

  const submit = async (provider: "d" | "r" | "y", value: string, reset: () => void) => {
    if (!value.trim()) return;
    setBusy(true);
    setNote("");
    const { data, error } = await (supabase as any).rpc("store_provider_key", {
      p_provider: provider,
      p_value: value.trim(),
    });
    setBusy(false);
    if (error || !(data as { ok?: boolean } | null)?.ok) {
      setNote("×");
      return;
    }
    reset();
    setNote("✓");
    refresh();
  };

  const line = (p: "d" | "r" | "y") =>
    `${counts[`${p}_active`] ?? 0}/${(counts[`${p}_active`] ?? 0) + (counts[`${p}_blocked`] ?? 0)}`;

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-background px-4">
      <div className="w-full max-w-sm space-y-3">
        <Field
          name="d"
          value={d}
          onChange={setD}
          busy={busy}
          onSubmit={() => submit("d", d, () => setD(""))}
        />
        <Field
          name="r"
          value={r}
          onChange={setR}
          busy={busy}
          onSubmit={() => submit("r", r, () => setR(""))}
        />
        <Field
          name="y"
          value={y}
          onChange={setY}
          busy={busy}
          onSubmit={() => submit("y", y, () => setY(""))}
        />
        <div className="flex justify-between px-1 font-mono text-[11px] text-foreground/30">
          <span>
            {line("d")} · {line("r")} · {line("y")}
          </span>
          <span>{note}</span>
        </div>
      </div>
    </div>
  );
};

export default KPage;
