/** @doc Fanned Megsy reward cards for the mobile referral hero (oil-slick faces + brand star). */
import MegsyStar from "@/components/branding/MegsyStar";

export type CreditCard = {
  /** Big value, e.g. "15" or "20%" */
  value: string;
  /** Unit under/next to the value, e.g. "Credits" */
  unit: string;
  /** Base hue for the oil-slick face */
  hue: number;
  /** Small caption at the top-left of the card */
  caption?: string;
};

/** Identical oil-sheen recipe, only the hue changes per card. */
function oilFace(hue: number): React.CSSProperties {
  const h = (n: number) => `hsl(${(hue + n + 360) % 360} 85% 62%)`;
  return {
    backgroundImage: [
      "radial-gradient(120% 90% at 18% 12%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0) 45%)",
      `conic-gradient(from 210deg at 30% 110%, ${h(0)} 0deg, ${h(45)} 70deg, ${h(120)} 150deg, ${h(200)} 230deg, ${h(300)} 300deg, ${h(0)} 360deg)`,
      `linear-gradient(150deg, ${h(-25)} 0%, ${h(35)} 100%)`,
    ].join(","),
    backgroundBlendMode: "screen, overlay, normal",
  };
}

function Face({
  card,
  style,
  side,
}: {
  card: CreditCard;
  style: React.CSSProperties;
  side?: boolean;
}) {
  return (
    <div
      style={{
        position: "absolute",
        width: 168,
        height: 108,
        borderRadius: 14,
        padding: 12,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.35)",
        boxShadow: side
          ? "0 20px 40px -22px rgba(0,0,0,0.9)"
          : "0 26px 54px -20px rgba(0,0,0,0.95)",
        ...oilFace(card.hue),
        ...style,
      }}
    >
      {/* glossy sweep */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.06) 38%, rgba(255,255,255,0) 52%, rgba(255,255,255,0.18) 88%)",
        }}
      />

      {/* brand star watermark */}
      <MegsyStar className="pointer-events-none absolute -bottom-3 -left-2 h-16 w-16 opacity-[0.16] text-background" />

      {/* brand lockup */}
      <div className="relative flex items-center gap-1.5">
        <MegsyStar className="h-3 w-3" />
        <span
          className="text-[9px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: "rgba(16,16,16,0.72)" }}
        >
          Megsy
        </span>
      </div>

      {card.caption && (
        <span
          className="relative mt-0.5 block text-[9.5px]"
          style={{ color: "rgba(20,20,20,0.62)" }}
        >
          {card.caption}
        </span>
      )}

      <div className="absolute bottom-2.5 right-3 flex items-baseline gap-1">
        <span
          className="text-[30px] leading-none"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#0e0e0e" }}
        >
          {card.value}
        </span>
        <span className="text-[12px]" style={{ color: "rgba(14,14,14,0.72)" }}>
          {card.unit}
        </span>
      </div>
    </div>
  );
}

export default function PrizeFan({ cards }: { cards: CreditCard[] }) {
  const [left, center, right] = cards;
  return (
    <div className="relative mx-auto h-[210px] w-full max-w-[360px]">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[260px] w-[300px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 45%, transparent 72%)",
        }}
      />
      {left && (
        <Face
          card={left}
          side
          style={{
            left: "50%",
            top: 52,
            transform: "translateX(-50%) translateX(-148px) rotate(-17deg)",
          }}
        />
      )}
      {right && (
        <Face
          card={right}
          side
          style={{
            left: "50%",
            top: 52,
            transform: "translateX(-50%) translateX(148px) rotate(17deg)",
          }}
        />
      )}
      {center && (
        <div
          className="absolute left-1/2 top-6 -translate-x-1/2"
          style={{
            zIndex: 2,
            padding: 8,
            borderRadius: 22,
            background: "hsl(var(--background))",
            boxShadow: "0 30px 70px -26px rgba(160,200,255,0.30)",
          }}
        >
          <Face card={center} style={{ position: "relative", left: 0, top: 0 }} />
        </div>
      )}
    </div>
  );
}
