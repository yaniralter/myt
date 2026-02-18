import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout_id?: string }>;
}) {
  const { checkout_id } = await searchParams;

  // Try to find the order by the Rapyd checkout ID to show details
  let order: Record<string, unknown> | null = null;
  if (checkout_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("orders")
      .select("*, product:products(title, image_url)")
      .eq("rapyd_payment_id", checkout_id)
      .single();
    order = data;
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] px-4">
      <div className="text-center max-w-md">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2 text-primary">Order Confirmed!</h1>

        {order ? (
          <div className="bg-surface border border-border rounded-xl p-4 mb-6 text-left">
            <div className="flex items-center gap-3">
              {(order.product as Record<string, unknown> | null)?.image_url ? (
                <img
                  src={
                    (order.product as Record<string, unknown>)
                      .image_url as string
                  }
                  alt=""
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : null}
              <div>
                <p className="text-sm font-medium text-primary">
                  {(order.product as Record<string, unknown> | null)?.title
                    ? String(
                        (order.product as Record<string, unknown>).title
                      )
                    : `Order #${String(order.id).slice(0, 8)}`}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-accent font-semibold">
                    ${((order.total_amount as number) / 100).toFixed(2)}
                  </span>
                  {order.size ? (
                    <span className="text-xs px-2 py-0.5 rounded bg-surface-raised border border-border text-muted-foreground">
                      Size: {String(order.size)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground mb-6">
            Thank you for your purchase. Your t-shirt will be printed and shipped
            to you soon. You can track your order from your orders page.
          </p>
        )}

        {order ? (
          <p className="text-muted-foreground mb-6 text-sm">
            Your t-shirt will be printed and shipped to you soon. Track it from
            your orders page.
          </p>
        ) : null}

        <div className="flex gap-3 justify-center">
          <Link
            href="/orders"
            className="bg-accent text-accent-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90"
          >
            View Orders
          </Link>
          <Link
            href="/marketplace"
            className="border border-border px-6 py-2.5 rounded-lg font-medium hover:bg-surface-raised text-primary"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
