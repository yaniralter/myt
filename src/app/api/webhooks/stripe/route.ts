import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createPrintifyOrder } from "@/lib/printify";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(request: Request) {
  const supabase = getSupabase();
  const body = await request.text();
  const sig = request.headers.get("stripe-signature")!;

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const metadata = session.metadata || {};

    // Access shipping details via type assertion (Stripe expands these when configured)
    const sessionAny = session as unknown as Record<string, unknown>;
    const shippingDetails = sessionAny.shipping_details as
      | { address?: Record<string, string>; name?: string }
      | undefined;

    // Update order status
    await supabase
      .from("orders")
      .update({
        status: "paid",
        stripe_payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null,
        shipping_address: shippingDetails?.address || null,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_session_id", session.id);

    // Get the product to check for Printify integration
    if (metadata.product_id) {
      const { data: product } = await supabase
        .from("products")
        .select("printify_product_id")
        .eq("id", metadata.product_id)
        .single();

      // Create Printify order if product has a Printify product ID
      if (product?.printify_product_id && shippingDetails?.address) {
        try {
          const addr = shippingDetails.address;
          const printifyOrder = await createPrintifyOrder({
            productId: product.printify_product_id,
            shippingAddress: {
              first_name: session.customer_details?.name?.split(" ")[0] || "",
              last_name:
                session.customer_details?.name?.split(" ").slice(1).join(" ") ||
                "",
              email: session.customer_details?.email || "",
              address1: addr.line1 || "",
              city: addr.city || "",
              region: addr.state || "",
              zip: addr.postal_code || "",
              country: addr.country || "",
            },
          });

          await supabase
            .from("orders")
            .update({
              printify_order_id: printifyOrder.id,
              status: "processing",
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_session_id", session.id);
        } catch {
          console.error("Failed to create Printify order");
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
