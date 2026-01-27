// Subscription tier configuration
export const SUBSCRIPTION_TIERS = {
  free: {
    name: "Free",
    price: 0,
    priceId: null,
    productId: null,
  },
  pro: {
    name: "Pro",
    price: 29,
    priceId: "price_1SuGkdBqKXDc35qoID1Z4oqJ",
    productId: "prod_Ts0mGYgpr7JkAX",
  },
  agency: {
    name: "Agency",
    price: 99,
    priceId: "price_1SuJbfBqKXDc35qoSzGf5rzv",
    productId: "prod_Ts3jOcxQsiuSP8",
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
