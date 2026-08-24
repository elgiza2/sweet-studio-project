/** @doc Referrals overview — points balance, quiet stats, recent activity. */
import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import {
  EmptyState,
  MIN_PAYOUT,
  POINTS_PER_SIGNUP,
  fmtDate,
  statusLabel,
  statusTone,
  useReferrals,
} from "../ReferralsPage";

const Panel = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`rounded-[22px] border border-foreground/[0.08] bg-foreground/[0.025] ${className}`}>
    {children}
  </div>
);

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="flex-1 px-4 py-4">
    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-foreground/35">
      {label}
    </p>
    <p className="mt-1.5 text-[22px] font-semibold tracking-tight text-foreground">{value}</p>
    {hint ? <p className="mt-0.5 text-[11.5px] text-foreground/35">{hint}</p> : null}
  </div>
);

export default function DashboardTab() {
  const navigate = useNavigate();
  const { signups, totalEarned, available, points, refs, wds, rewards } = useReferrals();

  const cheapest = rewards.length
    ? Math.min(...rewards.map((r) => Number(r.points_cost) || 0).filter((n) => n > 0))
    : 100;
  const goal = cheapest || 100;
  const pct = Math.max(0, Math.min(100, Math.round((points / goal) * 100)));
  const remaining = Math.max(0, goal - points);

  return (
    <div className="space-y-4 pb-10">
      {/* Points balance */}
      <Panel className="overflow-hidden p-5">
        <p className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-foreground/35">
          Points balance
        </p>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-[46px] font-semibold leading-none tracking-tight text-foreground">
            {points}
          </span>
          <span className="pb-1.5 text-[13px] text-foreground/40">
            / {goal} for a free plan
          </span>
        </div>

        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.09]">
          <div
            className="h-full rounded-full bg-foreground transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[13px] text-foreground/45">
            {remaining === 0
              ? "You can redeem a plan now."
              : `${remaining} points to go — ${Math.ceil(remaining / POINTS_PER_SIGNUP)} more friends.`}
          </p>
          <button
            type="button"
            onClick={() => navigate("/settings/referrals/rewards")}
            className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-foreground transition-opacity active:opacity-60"
          >
            Rewards
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </Panel>

      {/* Stats */}
      <Panel>
        <div className="flex divide-x divide-foreground/[0.07]">
          <Stat label="Friends" value={String(signups)} />
          <Stat label="Earned" value={`$${totalEarned.toFixed(2)}`} />
          <Stat label="Available" value={`$${available.toFixed(2)}`} hint={`min $${MIN_PAYOUT}`} />
        </div>
      </Panel>

      {/* Recent signups */}
      <section>
        <h2 className="mb-2 px-1 text-[11.5px] font-medium uppercase tracking-[0.12em] text-foreground/35">
          Recent signups
        </h2>
        <Panel className="divide-y divide-foreground/[0.07]">
          {refs.length === 0 ? (
            <EmptyState title="No signups yet" hint="Share your link to get your first referral." />
          ) : (
            refs.slice(0, 8).map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <p className="text-[14px] font-medium text-foreground">New signup</p>
                  <p className="text-[12px] text-foreground/40">{fmtDate(r.created_at)}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium ring-1 ${statusTone(r.status)}`}
                >
                  {statusLabel(r.status)}
                </span>
              </div>
            ))
          )}
        </Panel>
      </section>

      {wds.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-[11.5px] font-medium uppercase tracking-[0.12em] text-foreground/35">
            Withdrawals
          </h2>
          <Panel className="divide-y divide-foreground/[0.07]">
            {wds.slice(0, 5).map((w) => (
              <div key={w.id} className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <p className="text-[14px] font-medium text-foreground">
                    ${Number(w.amount).toFixed(2)}
                  </p>
                  <p className="text-[12px] text-foreground/40">{fmtDate(w.created_at)}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium ring-1 ${statusTone(w.status)}`}
                >
                  {statusLabel(w.status)}
                </span>
              </div>
            ))}
          </Panel>
        </section>
      )}
    </div>
  );
}
