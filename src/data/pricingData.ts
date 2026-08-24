// =====================================================================
// CENTRALIZED PRICING DATA — single source of truth for plans, services,
// FAQs, and enterprise features. Imported by /pricing and by the support
// chat's auto-built knowledge base so they NEVER drift apart.
// =====================================================================

export type PlanTier = "starter" | "pro" | "elite" | "business";

export const PLAN_MONTHLY_CREDITS: Record<PlanTier, number> = {
  starter: 70,
  pro: 240,
  elite: 500,
  business: 1200,
};

export interface PlanCardConfig {
  tier: PlanTier;
  name: string;
  label?: string;
  bg: string;
  text: string;
  subText: string;
  monthlyPrice: number;
  yearlyPrice: number;
  /** Optional promotional first-month price (e.g. Pro $7 intro). */
  firstMonthPrice?: number;
  monthlyCredits: string;
  yearlyCredits: string;
  features: string[];
  monthlyFeatures?: string[];
  yearlyFeatures?: string[];
  ctaBg: string;
  ctaText: string;
  ctaHover: string;
  bubbleColor: string;
  topBadge?: boolean;
  glow?: string;
  isDark?: boolean;
}

export const PLANS: PlanCardConfig[] = [
  {
    tier: "pro",
    name: "Pro",
    label: "",
    bg: "linear-gradient(165deg, #1e64ff 0%, #2563eb 55%, #1d4fd8 100%)",
    text: "#ffffff",
    subText: "rgba(255, 255, 255, 0.78)",
    monthlyPrice: 20,
    yearlyPrice: 298,
    firstMonthPrice: 5,

    monthlyCredits: `${PLAN_MONTHLY_CREDITS.pro} MC / month`,
    yearlyCredits: "Save $50 + 480 bonus MC",
    features: [
      "Unlimited AI Chat — every model, no daily caps",
      "Unlimited Video Generation",
      "Unlimited Images, Slides, Docs & Code — 7 days every month",
      "Unlimited Megsy OS agents — autonomous, runs 24/7",
      "240 MC every month for premium usage",
      "Team workspace included",
      "Priority email support",
      "Cancel anytime",
    ],
    monthlyFeatures: [
      "Unlimited AI Chat — every model, no daily caps",
      "Unlimited Video Generation",
      "Unlimited Images, Slides, Docs & Code — 7 days every month",
      "Unlimited Megsy OS agents — autonomous, runs 24/7",
      "240 MC every month for premium usage",
      "Team workspace included",
      "Priority email support",
      "Cancel anytime",
    ],
    yearlyFeatures: [
      "Save $50 vs paying monthly (2 months free)",
      "+480 bonus MC delivered upfront",
      "Locked-in price — no increases for 12 months",
      "Unlimited AI Chat — every model, no daily caps",
      "Unlimited Video Generation",
      "Unlimited Images, Slides, Docs & Code — 7 days every month",
      "Unlimited Megsy OS agents — autonomous, runs 24/7",
      "240 MC every month for premium usage",
      "Team workspace included",
      "Priority email support",
    ],

    ctaBg: "#0b1020",
    ctaText: "#ffffff",
    ctaHover: "#15203f",
    bubbleColor: "rgba(147, 197, 253, 0.45)",
    isDark: true,
  },
  {
    tier: "elite",
    name: "Max",
    bg: "linear-gradient(165deg, #8b5cf6 0%, #7c3aed 55%, #6d28d9 100%)",
    text: "#ffffff",
    subText: "rgba(255, 255, 255, 0.78)",
    monthlyPrice: 78,
    yearlyPrice: 598,

    monthlyCredits: `${PLAN_MONTHLY_CREDITS.elite} MC / month`,
    yearlyCredits: "Save $118 + 1,000 bonus MC",
    features: [
      "Unlimited AI Chat — every model, no daily caps",
      "Unlimited Video Generation",
      "Unlimited Images, Slides, Docs & Code — 15 days every month",
      "Unlimited Megsy OS agents — autonomous, runs 24/7",
      "500 MC every month for premium usage",
      "Priority queue — 3× faster generations",
      "Advanced presets, branding & analytics",
      "Team workspace included",
      "24/7 priority chat support",
      "Cancel anytime",
    ],
    monthlyFeatures: [
      "Unlimited AI Chat — every model, no daily caps",
      "Unlimited Video Generation",
      "Unlimited Images, Slides, Docs & Code — 15 days every month",
      "Unlimited Megsy OS agents — autonomous, runs 24/7",
      "500 MC every month for premium usage",
      "Priority queue — 3× faster generations",
      "Advanced presets, branding & analytics",
      "Team workspace included",
      "24/7 priority chat support",
      "Cancel anytime",
    ],
    yearlyFeatures: [
      "Save $118 vs paying monthly (2 months free)",
      "+1,000 bonus MC delivered upfront",
      "Locked-in price — no increases for 12 months",
      "Unlimited AI Chat — every model, no daily caps",
      "Unlimited Video Generation",
      "Unlimited Images, Slides, Docs & Code — 15 days every month",
      "Unlimited Megsy OS agents — autonomous, runs 24/7",
      "500 MC every month for premium usage",
      "Priority queue — 3× faster generations",
      "Advanced presets, branding & analytics",
      "Team workspace included",
      "24/7 priority chat support",
    ],

    ctaBg: "#0b0420",
    ctaText: "#ffffff",
    ctaHover: "#1a0a3a",
    bubbleColor: "rgba(216, 180, 254, 0.45)",
    topBadge: true,
    isDark: true,
  },
];


export const ENTERPRISE_FEATURES: string[] = [
  "Custom MC Allocation",
  "Priority Megsy AI compute lane",
  "Dedicated Infrastructure",
  "SLA Guarantees",
  "Custom API Access & Integrations",
  "Enterprise Security (SOC2-ready, GDPR & Advanced Encryption)",
  "Data Privacy & Compliance",
  "Early access to new Megsy capabilities",
  "Advanced Analytics & Reporting",
  "Dedicated Account Manager",
  "24/7 Priority Support",
  "Priority Onboarding & Training",
  "Monthly Business Reviews",
  "Volume Discounts",
  "Custom Contract, Invoicing & Billing",
];

export const SERVICES_GUIDE: { name: string; desc: string }[] = [
  {
    name: "Unlimited Chat",
    desc: "Talk to Megsy AI — our own model, with no daily caps. Free plan uses Megsy Lite.",
  },
  {
    name: "Image Generation",
    desc: "Generate unlimited high-quality images during your unlimited window (7/15/30 days depending on plan). Outside the window, uses MC credits.",
  },
  {
    name: "Slides & Presentations",
    desc: "Create complete slide decks from a prompt — fully editable, exportable to PPT/PDF. Free plan: 3 / day.",
  },
  {
    name: "Docs & Deep Research",
    desc: "Long-form documents and multi-source research reports with citations. Free plan: 3 of each per day.",
  },
  {
    name: "Code Builder",
    desc: "Build full apps and websites in natural language, with one-click deploy. Unlimited during your plan window.",
  },
  {
    name: "Video Generation",
    desc: "Generate videos on every paid plan. Each video uses MC from your monthly balance — never charged extra outside your plan.",
  },
  {
    name: "Megsy OS",
    desc: "Your autonomous 24/7 agent. Runs tasks, monitors projects, and executes multi-step work in the background. Unlimited on all paid plans.",
  },
  {
    name: "Megsy Credits (MC)",
    desc: "Credits cover video generation and any usage outside your plan windows. Credits reset at the start of each billing cycle and don't roll over.",
  },
  {
    name: "Team Workspace",
    desc: "Shared projects, files, and chats for your team. Pro+ includes seats; Business is unlimited.",
  },
  {
    name: "Priority Queue",
    desc: "Elite & Business get 3× faster generation speeds and skip the standard queue.",
  },
];

export const FAQS: { q: string; a: string }[] = [
  {
    q: "Can I change or cancel my plan anytime?",
    a: "Yes. From your Billing settings you can upgrade, downgrade, or cancel anytime. Upgrades are prorated and take effect immediately; downgrades and cancellations take effect at the end of the current billing cycle, and you keep full access until then.",
  },
  {
    q: "What's the difference between the 'unlimited window' and Megsy Credits (MC)?",
    a: "Chat with Megsy AI is unlimited at all times on every paid plan. Each paid plan also gives you a creation window for Images, Slides, Docs, Deep Research and Code Builder — 7 days/month on Pro, 15 days/month on Elite, and the full month on Business. Video always uses MC credits. MC is a separate balance used for video, premium usage, and anything generated outside your plan window.",
  },
  {
    q: "What happens when I run out of MC?",
    a: "You can keep using Chat unlimited, and anything still inside your plan window (Images, Slides, Docs, Research and Code Builder). Video and premium usage use MC, so you can top up MC anytime from Billing or wait for your next renewal — MC refresh at the start of each billing cycle.",
  },
  {
    q: "Do unused credits roll over?",
    a: "No. Monthly MC reset at the start of each billing cycle and don't roll over. Yearly plans get bonus MC delivered upfront (Pro +480, Elite +1,000, Business +2,400) on top of saving roughly 2 months on price.",
  },
  {
    q: "Do prices include tax?",
    a: "Prices are shown excluding tax. VAT/GST is calculated and added at checkout based on your billing country, and the final amount is shown before you confirm payment.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yes — new paid subscriptions (Pro and above) include a 7-day no-questions-asked refund window, provided no more than 10% of your included credits have been consumed. Credit packs are non-refundable once any credit from the pack has been spent. Failed generations are auto-refunded within minutes. Email support@megsyai.com (subject: \"Refund Request\") and we respond within 5 business days.",
  },
  {
    q: "Is my payment secure? Which payment methods do you accept?",
    a: "All payments are processed by Dodo Payments, a PCI-DSS Level 1 merchant of record. Your card details never touch our servers. We accept Visa, Mastercard, American Express, JCB, UnionPay, Apple Pay, Google Pay, Amazon Pay and WeChat Pay, with 3-D Secure 2 on eligible transactions. Your bank statement will show \"DODO * MEGSY AI\".",
  },
  {
    q: "Do you offer team or enterprise plans?",
    a: "Yes. The Business plan includes unlimited team seats, SSO/SAML, dedicated infrastructure, a 99.9% SLA and a success manager. For custom MC allocation, custom contracts, volume discounts or API/integration needs, contact our enterprise team via the Enterprise page or support@megsyai.com.",
  },
];

