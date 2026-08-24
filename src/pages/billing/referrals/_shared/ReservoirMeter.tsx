/**
 * ReservoirMeter — a slim vertical water column used on the referral balance hero.
 *
 * Visual contract: obsidian glass tube, gold hairline rim, water level rises
 * to reflect `value / target`. A soft shimmer runs across the surface to give
 * the sense of a resource that could drain — never explicit, only felt.
 *
 * Pure CSS/SVG. Respects prefers-reduced-motion via the shared keyframe rule
 * in portfolio-referrals.css.
 */
import { GOLD, GOLD_SOFT } from "../../ReferralsPage";

interface ReservoirMeterProps {
  /** Current filled amount (any unit, matched with `target`). */
  value: number;
  /** Target amount that represents 100% fill. */
  target: number;
  /** Rendered height in px. Width auto-derives at 18px. */
  height?: number;
  className?: string;
}

export function ReservoirMeter({
  value,
  target,
  height = 132,
  className = "",
}: ReservoirMeterProps) {
  const pct = target > 0 ? Math.max(2, Math.min(100, (value / target) * 100)) : 2;
  return (
    <div
      className={`reservoir-meter ${className}`}
      style={{ height, width: 22 }}
      aria-hidden
    >
      {/* Outer tube — obsidian glass, gold rim */}
      <div
        className="reservoir-meter__tube"
        style={{
          borderColor: `${GOLD}55`,
          boxShadow: `inset 0 0 0 1px var(--overlay-white-04), 0 0 24px -8px ${GOLD}30`,
        }}
      >
        {/* Water column */}
        <div
          className="reservoir-meter__water"
          style={{
            height: `${pct}%`,
            background: `linear-gradient(180deg, ${GOLD_SOFT}CC 0%, ${GOLD}AA 60%, ${GOLD}55 100%)`,
          }}
        >
          <div className="reservoir-meter__shimmer" />
          <div className="reservoir-meter__ripple" />
        </div>
        {/* Cap highlight */}
        <div
          className="reservoir-meter__cap"
          style={{ background: `linear-gradient(180deg, ${GOLD}, transparent)` }}
        />
      </div>
    </div>
  );
}

export default ReservoirMeter;
