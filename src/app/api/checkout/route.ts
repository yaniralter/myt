import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, calculateFees } from "@/lib/stripe";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { productId } = await request.json();

  if (!productId) {
    return NextResponse.json(
      { error: "Product ID is required" },
      { status: 400 }
    );
  }

  // Get product with shop details
  const { data: product } = await supabase
    .from("products")
    .select("*, shop:shops(*)")
    .eq("id", productId)
    .eq("is_published", true)
    .single();

  if (!product) {
    return NextResponse.json(
      { error: "Product not found" },
      { status: 404 }
    );
  }

  const { platformFee, sellerAmount } = calculateFees(product.price);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    // Build session params
    const sessionParams: Record<string, unknown> = {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: product.title,
              description: product.description || undefined,
              images: [product.image_url],
            },
            unit_amount: product.price,
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/product/${productId}`,
      metadata: {
        product_id: productId,
        shop_id: product.shop_id,
        buyer_id: user.id,
        platform_fee: platformFee.toString(),
        seller_amount: sellerAmount.toString(),
      },
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "AU", "DE", "FR"],
      },
    };

    // If seller has a connected Stripe account, use Connect with application fee
    if (product.shop?.stripe_account_id && product.shop?.stripe_onboarding_complete) {
      sessionParams.payment_intent_data = {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: product.shop.stripe_account_id,
        },
      };
    }

    const session = await getStripe().checkout.sessions.create(
      sessionParams as Parameters<ReturnType<typeof getStripe>["checkout"]["sessions"]["create"]>[0]
    );

    // Create order record
    await supabase.from("orders").insert({
      buyer_id: user.id,
      product_id: productId,
      shop_id: product.shop_id,
      stripe_session_id: session.id,
      total_amount: product.price,
      platform_fee: platformFee,
      seller_amount: sellerAmount,
      status: "pending",
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
