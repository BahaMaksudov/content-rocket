// Subscription tier configuration
export const SUBSCRIPTION_TIERS = {
  free: {
    name: "Free",
    price: 0,
    priceId: null,
    productId: null,
    credits: 3,
    features: [
      "3 AI content generations per month",
      "X threads & LinkedIn posts",
      "Standard AI",
      "Community support",
    ],
  },
  starter: {
    name: "Starter",
    price: 9.99,
    priceId: import.meta.env.VITE_STRIPE_PRICE_ID_STARTER || "price_1Sxv74BqKXDc35qoFpWfYr9i",
    productId: "prod_TvmgZ0hR2LljbD",
    credits: 25,
    features: [
      "25 AI content generations per month",
      "All social formats + blog posts",
      "1 brand voice",
      "Email support",
    ],
  },
  pro: {
    name: "Pro",
    price: 19.99,
    priceId: import.meta.env.VITE_STRIPE_PRICE_ID_PRO || "price_1Sxv8DBqKXDc35qoYhRoWiap",
    productId: "prod_TvmhiAvWEs9spu",
    credits: 60,
    features: [
      "60 AI content generations per month",
      "Style Mimicking (Brand Voice training)",
      "Priority processing",
      "No watermarks",
      "3 brand voices",
      "API access",
    ],
  },
  agency: {
    name: "Agency",
    price: 99.99,
    priceId: import.meta.env.VITE_STRIPE_PRICE_ID_AGENCY || "price_1Sxv8iBqKXDc35qoP3Wj6har",
    productId: "prod_TvmiVnuynHd9pf",
    credits: 250,
    features: [
      "250 AI content generations per month",
      "10 brand voices",
      "Team workspace (5 members)",
      "Bulk export",
      "Style Mimicking",
      "Priority support",
      "Custom integrations",
    ],
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

export function getTierFromProductId(productId: string | null): SubscriptionTier {
  if (!productId) return "free";
  if (productId === SUBSCRIPTION_TIERS.agency.productId) return "agency";
  if (productId === SUBSCRIPTION_TIERS.pro.productId) return "pro";
  if (productId === SUBSCRIPTION_TIERS.starter.productId) return "starter";
  return "free";
}

export function getTierFromStatus(status: string): SubscriptionTier {
  if (status === "agency") return "agency";
  if (status === "pro") return "pro";
  if (status === "starter") return "starter";
  return "free";
}

export function getCreditLimitForTier(tier: SubscriptionTier): number {
  return SUBSCRIPTION_TIERS[tier].credits;
}
