// Subscription tier configuration
export const SUBSCRIPTION_TIERS = {
  free: {
    name: "Free",
    price: 0,
    priceId: null,
    productId: null,
    features: [
      "5 AI content generations per month",
      "X threads & LinkedIn posts",
      "1 brand voice",
      "Community support",
    ],
  },
  pro: {
    name: "Pro",
    price: 29,
    priceId: "price_1SuGkdBqKXDc35qoID1Z4oqJ",
    productId: "prod_Ts0mGYgpr7JkAX",
    features: [
      "50 AI content generations per month",
      "All 4 platform outputs",
      "AI-powered visuals",
      "Global translation (3 languages)",
      "Social previews",
      "3 brand voices",
      "Priority support",
      "API access",
    ],
  },
  agency: {
    name: "Agency",
    price: 249,
    priceId: "price_1SuK15BqKXDc35qoi2xUQewc",
    productId: "prod_Ts4937tu4QuFB5",
    features: [
      "Unlimited AI content generations",
      "Bulk video processing (playlists)",
      "Team workspace (5 members)",
      "Unlimited brand voices",
      "White-label previews",
      "Dedicated account manager",
      "Custom integrations",
      "SSO & advanced security",
    ],
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

export function getTierFromProductId(productId: string | null): SubscriptionTier {
  if (!productId) return "free";
  if (productId === SUBSCRIPTION_TIERS.agency.productId) return "agency";
  if (productId === SUBSCRIPTION_TIERS.pro.productId) return "pro";
  return "free";
}

export function getTierFromStatus(status: string): SubscriptionTier {
  if (status === "agency") return "agency";
  if (status === "pro") return "pro";
  return "free";
}
