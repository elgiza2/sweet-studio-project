import { PLAN_MONTHLY_CREDITS } from "@/data/pricingData";

export type WorkspacePaidPlan = "starter" | "pro" | "elite" | "business";

export interface WorkspacePlanOption {
  id: WorkspacePaidPlan | "free";
  name: string;
  monthlyPrice: number;
  yearlyPrice?: number;
  tagline: string;
  perks: string[];
  creditsLabel?: string;
}

export const WORKSPACE_PRODUCT_MAP: Record<WorkspacePaidPlan, { monthly: string; yearly: string }> =
  {
    starter: {
      monthly: "pdt_0NfOHJoiT8SDfibwKrYkd",
      yearly: "pdt_0NfOI5bIL4ENBrcV8JEvM",
    },
    pro: {
      monthly: "pdt_0NfOIP9Cjs7MnsYwuOHA5",
      yearly: "pdt_0NfOIbGR12Bk6zmVhIfho",
    },
    elite: {
      monthly: "pdt_0NfOIsOWsAjKTv5MycEUK",
      yearly: "pdt_0NfOJ0bn0DYGJudz1v5dO",
    },
    business: {
      monthly: "pdt_0NfOJ8SCeVWcmpoJtiHaX",
      yearly: "pdt_0NfOJHY75Ky5FtnhU3ZPL",
    },
  };

export const WORKSPACE_PLANS: WorkspacePlanOption[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    tagline: "Basic shared space to get started",
    creditsLabel: "No subscription",
    perks: ["3 members", "Basic tasks", "Personal use or small team"],
  },
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 9,
    yearlyPrice: 89,
    tagline: "Matches the Starter pay plan",
    creditsLabel: `${PLAN_MONTHLY_CREDITS.starter} MC / month`,
    perks: [
      "Unlimited chat",
      "Megsy Pro & Max",
      "Credit-based image, code & research",
      "24/7 support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 25,
    yearlyPrice: 250,
    tagline: "Matches the Pro pay plan",
    creditsLabel: `${PLAN_MONTHLY_CREDITS.pro} MC / month`,
    perks: [
      "Unlimited chat (Megsy Lite, Pro & Max)",
      "Image, video, slides, docs & deep research — credit-based",
      "Megsy Code Builder access",
      "Team workspace included",
      "24/7 support",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    monthlyPrice: 59,
    yearlyPrice: 599,
    tagline: "Matches the Elite pay plan",
    creditsLabel: `${PLAN_MONTHLY_CREDITS.elite} MC / month`,
    perks: [
      "Everything in Pro",
      "Higher monthly credit allowance",
      "Priority generation queue",
      "Analytics dashboard",
      "24/7 priority support",
    ],
  },
  {
    id: "business",
    name: "Business",
    monthlyPrice: 149,
    yearlyPrice: 1599,
    tagline: "Matches the Business pay plan",
    creditsLabel: `${PLAN_MONTHLY_CREDITS.business.toLocaleString("en-US")} MC / month`,
    perks: [
      "Everything in Elite",
      "Largest monthly credit allowance",
      "Unlimited team seats",
      "Dedicated infrastructure",
      "SSO & SLA",
      "24/7 priority support",
    ],
  },
];

export function isWorkspacePaidPlan(plan: string | null | undefined): plan is WorkspacePaidPlan {
  return plan === "starter" || plan === "pro" || plan === "elite" || plan === "business";
}
