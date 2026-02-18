import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createPrintifyOrder } from "@/lib/printify";
import { SIZE_TO_VARIANT_ID, type TShirtSize } from "@/lib/types";
import crypto from "crypto";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function verifyWebhookSignature(
  body: string,
  signature: string | null,
  salt: string | null,
  timestamp: string | null
): boolean {
  if (!signature || !salt || !timestamp) {
    console.error("[Rapyd Webhook] Missing signature headers:", {
      hasSignature: !!signature,
      hasSalt: !!salt,
      hasTimestamp: !!timestamp,
    });
    return false;
  }

  const webhookSecret = process.env.RAPYD_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Rapyd Webhook] RAPYD_WEBHOOK_SECRET is not configured");
    return false;
  }

  const toSign =
    process.env.RAPYD_WEBHOOK_PATH +
    salt +
    timestamp +
    process.env.RAPYD_ACCESS_KEY +
    webhookSecret +
    body;

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(toSign)
    .digest("base64");

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "base64"),
      Buffer.from(expectedSignature, "base64")
    );
  } catch (err) {
    console.error("[Rapyd Webhook] Signature comparison failed:", err);
    return false;
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  // Verify Rapyd webhook signature
  const signature = request.headers.get("signature");
  const salt = request.headers.get("salt");
  const timestamp = request.headers.get("timestamp");

  if (!verifyWebhookSignature(rawBody, signature, salt, timestamp)) {
    console.error("[Rapyd Webhook] Signature verification failed for request");
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 }
    );
  }

  const supabase = getSupabase();
  const body = JSON.parse(rawBody);

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

          // Resolve variant ID from the size stored in metadata
          const size = metadata.size as TShirtSize | undefined;
          const variantId = size ? SIZE_TO_VARIANT_ID[size] : undefined;

          const printifyOrder = await createPrintifyOrder({
            productId: product.printify_product_id,
            variantId,
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
        } catch (err) {
          console.error("[Rapyd Webhook] Failed to create Printify order:", err);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
