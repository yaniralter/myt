import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-01-28.clover",
    });
  }
  return _stripe;
}

export const PLATFORM_COMMISSION_RATE = parseFloat(
  process.env.PLATFORM_COMMISSION_RATE || "0.15"
);

export function calculateFees(priceInCents: number) {
  const platformFee = Math.round(priceInCents * PLATFORM_COMMISSION_RATE);
  const sellerAmount = priceInCents - platformFee;
  return { platformFee, sellerAmount };
}
