/** @doc Rewards catalogue — redeem referral points for monthly / yearly plans. */
import { useState } from "react";
import { Card, PrimaryButton, POINTS_PER_SIGNUP, useReferrals } from "../ReferralsPage";

/** Shown until the reward catalogue rows are provisioned in the backend. */
const FALLBACK = [
  { slug: "starter-monthly", title: "Starter — 1 month", plan: "starter", billing_period: "monthly" as const, points_cost: 200, stock_total: 40, stock_claimed: 0, description: "Unlimited chat + monthly credits" },
  { slug: "pro-monthly", title: "Pro — 1 month", plan: "pro", billing_period: "monthly" as const, points_cost: 450, stock_total: 40, stock_claimed: 0, description: "Everything in Starter, more credits" },
  { slug: "pro-yearly", title: "Pro — 1 year", plan: "pro", billing_period: "yearly" as const, points_cost: 4200, stock_total: 20, stock_claimed: 0, description: "A full year of Pro" },
];

export default function RewardsTab() {
  const { points, rewards, redeemReward } = useReferrals();
  const [busy, setBusy] = useState<string | null>(null);
  const list = rewards.length > 0 ? rewards : FALLBACK;
  const remainingTotal = list.reduce(
    (s, r) => s + Math.max(0, (r.stock_total ?? 0) - (r.stock_claimed ?? 0)),
    0,
  );

  const redeem = async (slug: string) => {
    setBusy(slug);
    try {
      await redeemReward(slug);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5 pb-10">
      <Card className="flex items-center justify-between p-4">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-wider text-foreground/45">
            Your points
          </p>
          <p className="mt-1 text-[28px] font-semibold tracking-tight text-foreground">{points}</p>
          <p className="text-[12px] text-foreground/45">
            +{POINTS_PER_SIGNUP} points for every friend who signs up
          </p>
        </div>
        <div className="text-right">
          <p className="text-[12px] text-foreground/45">Subscriptions left</p>
          <p className="text-[20px] font-semibold text-foreground">{remainingTotal}</p>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((r) => {
          const left = Math.max(0, (r.stock_total ?? 0) - (r.stock_claimed ?? 0));
          const affordable = points >= r.points_cost && left > 0;
          return (
            <Card key={r.slug} className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[15px] font-medium text-foreground">{r.title}</p>
                  {r.description ? (
                    <p className="mt-0.5 text-[13px] leading-relaxed text-foreground/55">
                      {r.description}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 rounded-full border border-foreground/12 px-2.5 py-1 text-[11.5px] font-medium text-foreground/70">
                  {r.billing_period === "yearly" ? "Yearly" : "Monthly"}
                </span>
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-[20px] font-semibold text-foreground">{r.points_cost}</p>
                  <p className="text-[12px] text-foreground/45">points · {left} left</p>
                </div>
                <PrimaryButton
                  onClick={() => redeem(r.slug)}
                  disabled={!affordable || busy === r.slug}
                >
                  {left === 0 ? "Sold out" : busy === r.slug ? "Redeeming…" : "Redeem"}
                </PrimaryButton>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
