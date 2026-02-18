import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ShoppingBag, Package, Truck, CheckCircle, Clock, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof Clock; className: string }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-yellow-500/10 text-yellow-400",
  },
  paid: {
    label: "Paid",
    icon: CheckCircle,
    className: "bg-blue-500/10 text-blue-400",
  },
  processing: {
    label: "Processing",
    icon: Package,
    className: "bg-purple-500/10 text-purple-400",
  },
  shipped: {
    label: "Shipped",
    icon: Truck,
    className: "bg-accent/10 text-accent",
  },
  delivered: {
    label: "Delivered",
    icon: CheckCircle,
    className: "bg-green-500/10 text-green-400",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive",
  },
};

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: orders } = await supabase
    .from("orders")
    .select("*, product:products(*, shop:shops(name, slug))")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-primary mb-6">Your Orders</h1>

      {orders && orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order: Record<string, unknown>) => {
            const product = order.product as Record<string, unknown> | null;
            const shop = product?.shop as Record<string, unknown> | null;
            const status = (order.status as string) || "pending";
            const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
            const StatusIcon = config.icon;

            return (
              <div
                key={order.id as string}
                className="bg-surface border border-border rounded-xl overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Product image */}
                  {product?.image_url ? (
                    <div className="sm:w-32 sm:h-32 w-full h-48 flex-shrink-0">
                      <img
                        src={product.image_url as string}
                        alt={product.title as string}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : null}

                  {/* Order info */}
                  <div className="flex-1 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div>
                        <h3 className="font-medium text-primary">
                          {product
                            ? String(product.title)
                            : `Order #${String(order.id).slice(0, 8)}`}
                        </h3>
                        {shop ? (
                          <Link
                            href={`/shop/${shop.slug}`}
                            className="text-xs text-accent hover:underline"
                          >
                            {String(shop.name)}
                          </Link>
                        ) : null}
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full w-fit ${config.className}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="text-primary font-semibold">
                        ${((order.total_amount as number) / 100).toFixed(2)}
                      </span>
                      {order.size ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-surface-raised border border-border text-muted-foreground">
                          Size: {String(order.size)}
                        </span>
                      ) : null}
                      <span className="text-muted-foreground">
                        {new Date(
                          order.created_at as string
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        ID: {(order.id as string).slice(0, 8)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-medium text-primary mb-1">
            No orders yet
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            When you purchase a t-shirt, it will appear here.
          </p>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90"
          >
            Browse Marketplace
          </Link>
        </div>
      )}
    </div>
  );
}
