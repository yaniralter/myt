import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Palette,
  Store,
  Package,
  ShoppingCart,
  TrendingUp,
  Plus,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SellerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: shop } = await supabase
    .from("shops")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  const { data: designs } = await supabase
    .from("designs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(6);

  let products: Record<string, unknown>[] = [];
  let orders: Record<string, unknown>[] = [];

  if (shop) {
    const { data: shopProducts } = await supabase
      .from("products")
      .select("*")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false });
    products = shopProducts || [];

    const { data: shopOrders } = await supabase
      .from("orders")
      .select("*, product:products(*)")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false })
      .limit(10);
    orders = shopOrders || [];
  }

  const { data: buyerOrders } = await supabase
    .from("orders")
    .select("*, product:products(*)")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const totalRevenue =
    orders
      ?.filter(
        (o) => o.status === "paid" || o.status === "delivered"
      )
      .reduce((sum, o) => sum + (o.seller_amount as number), 0) || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            Hello, {profile?.full_name || profile?.email}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {shop
              ? `Managing: ${shop.name}`
              : "Welcome to your dashboard"}
          </p>
        </div>
        <div className="flex gap-3 mt-4 sm:mt-0">
          <Link
            href="/design-studio"
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
          >
            <Palette className="w-4 h-4" />
            New Design
          </Link>
          {!shop && (
            <Link
              href="/shop/new"
              className="inline-flex items-center gap-2 bg-surface-raised border border-border text-primary px-4 py-2 rounded-lg text-sm font-medium hover:border-accent/40"
            >
              <Store className="w-4 h-4" />
              Open a Shop
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      {shop && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Products", value: products.length, icon: Package },
            { label: "Designs", value: designs?.length || 0, icon: Palette },
            { label: "Orders", value: orders.length, icon: ShoppingCart },
            {
              label: "Revenue",
              value: `$${(totalRevenue / 100).toFixed(2)}`,
              icon: TrendingUp,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-surface border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="w-4 h-4 text-accent" />
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {stat.label}
                </p>
              </div>
              <p className="text-2xl font-bold text-primary">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Designs */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-primary">Your Designs</h2>
          <Link
            href="/design-studio"
            className="text-sm text-accent hover:underline"
          >
            Create new
          </Link>
        </div>
        {designs && designs.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {designs.map((design: Record<string, unknown>) => (
              <div
                key={design.id as string}
                className="aspect-square rounded-xl overflow-hidden bg-surface border border-border"
              >
                <img
                  src={design.image_url as string}
                  alt={design.prompt as string}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-xl p-8 text-center">
            <Palette className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">
              No designs yet.{" "}
              <Link
                href="/design-studio"
                className="text-accent hover:underline"
              >
                Create your first design
              </Link>
            </p>
          </div>
        )}
      </section>

      {/* Products */}
      {shop && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-primary">
              Your Products
            </h2>
            {products.length > 0 && (
              <Link
                href="/product/new"
                className="text-sm text-accent hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add new
              </Link>
            )}
          </div>
          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <div
                  key={product.id as string}
                  className="bg-surface border border-border rounded-xl overflow-hidden"
                >
                  <div className="aspect-square bg-surface-raised">
                    <img
                      src={product.image_url as string}
                      alt={product.title as string}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-sm text-primary truncate">
                      {product.title as string}
                    </h3>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-accent text-sm font-semibold">
                        ${((product.price as number) / 100).toFixed(2)}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          product.is_published
                            ? "bg-green-500/10 text-green-400"
                            : "bg-yellow-500/10 text-yellow-400"
                        }`}
                      >
                        {product.is_published ? "Published" : "Draft"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-xl p-8 text-center">
              <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                No products yet. Create a design first, then list it for sale.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Purchases */}
      {buyerOrders && buyerOrders.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-primary mb-4">
            Your Purchases
          </h2>
          <div className="space-y-3">
            {buyerOrders.map((order: Record<string, unknown>) => (
              <div
                key={order.id as string}
                className="flex items-center gap-4 bg-surface border border-border rounded-xl p-4"
              >
                <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary">
                    Order #{(order.id as string).slice(0, 8)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ${((order.total_amount as number) / 100).toFixed(2)}{" "}
                    {order.size ? <>&middot; Size {order.size as string} </> : null}
                    &middot; {order.status as string}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
