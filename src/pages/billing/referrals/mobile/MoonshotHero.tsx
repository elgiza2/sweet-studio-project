/** @doc Mobile referral hero — Megsy reward cards, live program stats, invite tasks. */
import { UserPlus, BadgeCheck, Coins, Copy, Check, Wallet, Share2 } from "lucide-react";
import PrizeFan, { type CreditCard } from "./PrizeFan";
import MegsyStar from "@/components/branding/MegsyStar";
import { useReferrals } from "../../ReferralsPage";
import { CREDITS_PER_SIGNUP, COMMISSION_PCT, MIN_PAYOUT } from "./tokens";

const CARDS: CreditCard[] = [
  { value: "15", unit: "Credits", caption: "Welcome bonus", hue: 288 },
  { value: "20", unit: "%", caption: "Lifetime commission", hue: 186 },
  { value: "15", unit: "Credits", caption: "For your friend", hue: 32 },
];

export default function MoonshotHero() {
  const { refs, shareLink, copyLink, justCopied, code, signups, totalEarned, available } =
    useReferrals();

  const subscribed = refs.filter(
    (r) => r.status === "active" || r.status === "approved",
  ).length;

  const stats = [
    { label: "Invites", value: String(signups || refs.length) },
    { label: "Subscribed", value: String(subscribed) },
    { label: "Earned", value: `$${(totalEarned ?? 0).toFixed(2)}` },
    { label: "Available", value: `$${(available ?? 0).toFixed(2)}` },
  ];

  const payoutPct = Math.min(100, ((available ?? 0) / MIN_PAYOUT) * 100);

  const tasks = [
    {
      icon: UserPlus,
      title: "Invite a friend to join Megsy",
      reward: `+${CREDITS_PER_SIGNUP} credits for both of you`,
      count: signups || refs.length,
    },
    {
      icon: BadgeCheck,
      title: "Invite a friend to subscribe to Megsy",
      reward: `+${COMMISSION_PCT}% commission on every payment`,
      count: subscribed,
    },
  ];

  return (
    <div className="flex min-h-[calc(100dvh-56px)] flex-col px-5 pb-8">
      <div className="mt-10">
        <PrizeFan cards={CARDS} />
      </div>

      <h2
        className="mt-2 flex items-center justify-center gap-2 text-center text-[23px] leading-tight text-foreground"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400 }}
      >
        <MegsyStar className="h-4 w-4 text-foreground/70" />
        Share Megsy, earn forever
      </h2>
      <p className="mt-1.5 text-center text-[13px] text-foreground/55">
        {CREDITS_PER_SIGNUP} credits each on sign-up · {COMMISSION_PCT}% of every payment they make
      </p>

      <button
        onClick={() => shareLink()}
        className="mx-auto mt-6 flex w-full max-w-[300px] items-center justify-center gap-2 rounded-full bg-white py-3 text-[15px] font-semibold text-background transition active:scale-[0.97]"
      >
        <Share2 className="h-[17px] w-[17px]" strokeWidth={2} />
        Invite friends
      </button>

      {/* Referral code */}
      {code && (
        <button
          onClick={() => copyLink()}
          className="mx-auto mt-3 flex items-center gap-2 rounded-full px-4 py-2 text-[13px] text-foreground/80 transition active:scale-[0.97]"
          style={{
            background: "hsl(0 0% 100% / 0.06)",
            border: "1px solid hsl(0 0% 100% / 0.09)",
          }}
        >
          <span className="text-foreground/45">Your code</span>
          <span className="font-mono tracking-[0.12em] text-foreground">{code}</span>
          {justCopied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2.2} />
          ) : (
            <Copy className="h-3.5 w-3.5 text-foreground/50" strokeWidth={2} />
          )}
        </button>
      )}

      {/* Live program stats */}
      <div
        className="mt-6 grid grid-cols-4 gap-px overflow-hidden rounded-2xl"
        style={{ background: "hsl(0 0% 100% / 0.06)" }}
      >
        {stats.map((s) => (
          <div key={s.label} className="px-1 py-3 text-center" style={{ background: "hsl(var(--background))" }}>
            <p className="text-[15px] font-semibold text-foreground">{s.value}</p>
            <p className="mt-0.5 text-[10.5px] text-foreground/50">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Payout progress */}
      <div
        className="mt-3 rounded-2xl px-4 py-3.5"
        style={{
          background: "hsl(0 0% 100% / 0.045)",
          border: "1px solid hsl(0 0% 100% / 0.06)",
        }}
      >
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-foreground/60" strokeWidth={1.8} />
          <p className="flex-1 text-[13px] text-foreground/80">
            {(available ?? 0) >= MIN_PAYOUT
              ? "You can withdraw now"
              : `$${Math.max(0, MIN_PAYOUT - (available ?? 0)).toFixed(2)} more to unlock withdrawal`}
          </p>
          <span className="text-[12px] text-foreground/45">min ${MIN_PAYOUT}</span>
        </div>
        <div
          className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full"
          style={{ background: "hsl(0 0% 100% / 0.08)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${payoutPct}%`,
              background: "linear-gradient(90deg, #a9ecec, #5fb9c9)",
            }}
          />
        </div>
      </div>

      <div className="flex-1" />

      {/* How it works */}
      <div className="mt-8 space-y-2.5">
        {[
          "Share your personal invite link or code",
          `Your friend signs up — you both get ${CREDITS_PER_SIGNUP} credits`,
          `They subscribe — you earn ${COMMISSION_PCT}% of every payment, for life`,
        ].map((step, i) => (
          <div key={step} className="flex items-start gap-3">
            <span
              className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-background"
              style={{ background: "rgba(255,255,255,0.88)" }}
            >
              {i + 1}
            </span>
            <p className="text-[13.5px] leading-snug text-foreground/70">{step}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {tasks.map((t) => (
          <div
            key={t.title}
            className="rounded-2xl px-4 py-4"
            style={{
              background: "hsl(0 0% 100% / 0.055)",
              border: "1px solid hsl(0 0% 100% / 0.06)",
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                style={{ background: "hsl(0 0% 100% / 0.08)" }}
              >
                <t.icon className="h-[19px] w-[19px] text-foreground/90" strokeWidth={1.7} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] leading-snug text-foreground">{t.title}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[12px] text-foreground/55">
                  <Coins className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {t.reward} · {t.count} done
                </p>
              </div>
            </div>
            <button
              onClick={() => shareLink()}
              className="mt-3.5 w-full rounded-full bg-white py-2.5 text-[14.5px] font-semibold text-background transition active:scale-[0.98]"
            >
              Invite
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
