import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckout, calculateFees } from "@/lib/rapyd";

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
    const checkout = await createCheckout({
      amount: product.price / 100,
      currency: "USD",
      productName: product.title,
      completeUrl: `${appUrl}/checkout/success?checkout_id={checkout_id}`,
      cancelUrl: `${appUrl}/product/${productId}`,
      metadata: {
        product_id: productId,
        shop_id: product.shop_id,
        buyer_id: user.id,
        platform_fee: platformFee.toString(),
        seller_amount: sellerAmount.toString(),
      },
    });

    // Create order record
    await supabase.from("orders").insert({
      buyer_id: user.id,
      product_id: productId,
      shop_id: product.shop_id,
      rapyd_payment_id: checkout.id,
      total_amount: product.price,
      platform_fee: platformFee,
      seller_amount: sellerAmount,
      status: "pending",
    });

    return NextResponse.json({ url: checkout.redirect_url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
