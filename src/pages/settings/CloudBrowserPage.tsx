/** @doc Cloud browser settings — session persistence and cookie controls. */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { SubShell } from "@/components/settings/SubShell";

const KEY = "megsy_cloud_browser_keep_signed_in";

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={[
        "relative inline-flex h-[30px] w-[50px] shrink-0 rounded-full transition-colors duration-200",
        checked ? "bg-primary" : "bg-[color:var(--mn-press)]",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-[26px] w-[26px] rounded-full bg-[color:var(--mn-fg)] transition-transform duration-200",
          checked ? "translate-x-[22px]" : "translate-x-[2px]",
        ].join(" ")}
        style={{ marginTop: 2 }}
      />
    </button>
  );
}

export default function CloudBrowserPage() {
  const navigate = useNavigate();
  const [keepSignedIn, setKeepSignedIn] = useState(false);

  useEffect(() => {
    try {
      setKeepSignedIn(localStorage.getItem(KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = () => {
    setKeepSignedIn((v) => {
      const next = !v;
      try {
        localStorage.setItem(KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <SubShell title="Cloud browser">
      <section className="rounded-[20px] overflow-hidden bg-[var(--mn-card)]">
        <div className="flex items-center gap-4 px-5 py-[18px]">
          <span className="flex-1 text-[15px] leading-snug text-[color:var(--mn-fg)]">
            Keep me signed in across tasks
          </span>
          <Toggle checked={keepSignedIn} onChange={toggle} label="Keep me signed in across tasks" />
        </div>
        <div className="h-px bg-[color:var(--mn-sep)] mx-5" />
        <button
          type="button"
          onClick={() => navigate("/settings/privacy")}
          className="w-full text-start px-5 py-[18px] text-[15px] text-primary"
        >
          Learn more
        </button>
      </section>

      <section className="rounded-[20px] overflow-hidden bg-[var(--mn-card)]">
        <button
          type="button"
          onClick={() => navigate("/settings/data")}
          className="w-full flex items-center gap-4 px-5 py-[18px] text-start"
        >
          <span className="flex-1 text-[15px] leading-snug text-[color:var(--mn-fg)]">
            Cookies and other site data
          </span>
          <ChevronRight className="w-4.5 h-4.5 shrink-0 text-[color:var(--mn-faint)] rtl:rotate-180" />
        </button>
      </section>
    </SubShell>
  );
}
