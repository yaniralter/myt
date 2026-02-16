import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createPrintifyOrder } from "@/lib/printify";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(request: Request) {
  const supabase = getSupabase();
  const body = await request.json();

  // Rapyd sends webhook events with a type field
  const eventType = body.type;

  if (eventType === "PAYMENT_COMPLETED" || eventType === "CHECKOUT_COMPLETED") {
    const data = body.data;
    const metadata = data?.metadata || {};

    // Update order status
    if (metadata.product_id) {
      await supabase
        .from("orders")
        .update({
          status: "paid",
          rapyd_payment_id: data.id || data.payment?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("rapyd_payment_id", data.id);

      // Get the product to check for Printify integration
      const { data: product } = await supabase
        .from("products")
        .select("printify_product_id")
        .eq("id", metadata.product_id)
        .single();

      // Create Printify order if product has a Printify product ID
      if (product?.printify_product_id) {
        try {
          const shippingAddress = data.shipping_address || {};
          const printifyOrder = await createPrintifyOrder({
            productId: product.printify_product_id,
            shippingAddress: {
              first_name: shippingAddress.first_name || "",
              last_name: shippingAddress.last_name || "",
              email: metadata.buyer_email || "",
              address1: shippingAddress.line_1 || "",
              city: shippingAddress.city || "",
              region: shippingAddress.state || "",
              zip: shippingAddress.zip || "",
              country: shippingAddress.country || "",
            },
          });

          await supabase
            .from("orders")
            .update({
              printify_order_id: printifyOrder.id,
              status: "processing",
              updated_at: new Date().toISOString(),
            })
            .eq("rapyd_payment_id", data.id);
        } catch {
          console.error("Failed to create Printify order");
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
