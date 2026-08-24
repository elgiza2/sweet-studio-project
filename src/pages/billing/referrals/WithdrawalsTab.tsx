/** @doc Withdrawals sub-tab — obsidian reservoir + payout history. */
import { useNavigate } from "react-router-dom";
import { Wallet, ArrowUpRight } from "lucide-react";
import {
  EmptyState,
  MIN_PAYOUT,
  fmtDate,
  statusLabel,
  useReferrals,
  GOLD,
  GOLD_SOFT,
} from "../ReferralsPage";
import { ReservoirMeter } from "./_shared/ReservoirMeter";
import MegsyStar from "@/components/branding/MegsyStar";

export default function WithdrawalsTab() {
  const navigate = useNavigate();
  const { available, canWithdraw, wds } = useReferrals();
  const pct = Math.min(100, Math.round((available / MIN_PAYOUT) * 100));
  const remaining = Math.max(0, MIN_PAYOUT - available);

  return (
    <div className="space-y-4 pb-16">
      {/* Reservoir hero */}
      <div className="relative overflow-hidden rounded-[24px] bg-background ref-gold-hairline p-5">
        <div className="ref-monogram">
          <MegsyStar className="h-full w-full" />
        </div>

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-foreground/45">
              Ready to withdraw
            </p>
            <div
              className="mt-2 tabular-nums leading-none"
              style={{
                fontWeight: 300,
                fontSize: "44px",
                letterSpacing: "-0.03em",
                background: `linear-gradient(180deg, #ffffff 0%, ${GOLD_SOFT} 60%, ${GOLD} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              ${available.toFixed(2)}
            </div>
            <p className="mt-2 text-[12px] text-foreground/50">
              Minimum payout{" "}
              <span className="tabular-nums text-foreground/75">${MIN_PAYOUT}</span>
            </p>
          </div>
          <ReservoirMeter value={available} target={MIN_PAYOUT} height={132} />
        </div>

        {/* Progress rail */}
        <div className="relative z-10 mt-5">
          <div className="ref-rail">
            <div className="ref-rail__fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-foreground/45 tabular-nums">${available.toFixed(2)}</span>
            <span className="text-foreground/45 tabular-nums">${MIN_PAYOUT}</span>
          </div>
        </div>

        <button
          onClick={() => navigate("/settings/withdraw")}
          disabled={!canWithdraw}
          className="relative z-10 mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[13.5px] font-semibold text-background transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(180deg, ${GOLD_SOFT} 0%, ${GOLD} 60%, #8B5E22 100%)`,
            boxShadow: `0 12px 32px -14px ${GOLD}80, inset 0 1px 0 rgba(255,255,255,0.45)`,
          }}
        >
          {canWithdraw
            ? "Request withdrawal"
            : `Earn $${remaining.toFixed(2)} more`}
          {canWithdraw && <ArrowUpRight className="h-4 w-4" strokeWidth={2.4} />}
        </button>
      </div>

      {/* Payout history */}
      <div>
        <p className="mb-3 px-1 text-[10.5px] font-medium uppercase tracking-[0.22em] text-foreground/45">
          Payout history
        </p>

        {wds.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <EmptyState
              title="No payouts yet"
              hint={`Request a withdrawal once you reach $${MIN_PAYOUT}.`}
            />
          </div>
        ) : (
          <ul className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
            {wds.map((w, i) => (
              <li
                key={w.id}
                className="flex items-center justify-between px-4 py-3.5"
                style={{
                  borderTop: i === 0 ? undefined : "1px solid hsl(0 0% 100% / 0.05)",
                }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                    style={{
                      background: "hsl(0 0% 100% / 0.04)",
                      border: `1px solid ${GOLD}33`,
                    }}
                  >
                    <Wallet className="h-4 w-4" style={{ color: GOLD }} strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <p
                      className="text-[14px] tabular-nums font-light"
                      style={{ color: GOLD_SOFT }}
                    >
                      ${Number(w.amount).toFixed(2)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-foreground/45">
                      {w.method} · {fmtDate(w.created_at)}
                    </p>
                  </div>
                </div>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.14em]"
                  style={{
                    color: "rgba(255,255,255,0.75)",
                    background: "hsl(0 0% 100% / 0.04)",
                    border: "1px solid hsl(0 0% 100% / 0.08)",
                  }}
                >
                  {statusLabel(w.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
