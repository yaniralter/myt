import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Palette, Store, Package, ShoppingCart } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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

  // Buyer orders
  const { data: buyerOrders } = await supabase
    .from("orders")
    .select("*, product:products(*)")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">
            Hello, {profile?.full_name || profile?.email}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {shop ? `Shop: ${shop.name}` : "Welcome to your dashboard"}
          </p>
        </div>
        <div className="flex gap-3 mt-4 sm:mt-0">
          <Link
            href="/design"
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
          >
            <Palette className="w-4 h-4" />
            New Design
          </Link>
          {!shop && (
            <Link
              href="/shop/new"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
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
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Products</p>
            <p className="text-2xl font-bold">{products?.length || 0}</p>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Designs</p>
            <p className="text-2xl font-bold">{designs?.length || 0}</p>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Orders</p>
            <p className="text-2xl font-bold">{orders?.length || 0}</p>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Revenue</p>
            <p className="text-2xl font-bold">
              $
              {(
                (orders
                  ?.filter((o: Record<string, unknown>) => o.status === "paid" || o.status === "delivered")
                  .reduce((sum: number, o: Record<string, unknown>) => sum + (o.seller_amount as number), 0) || 0) / 100
              ).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Recent designs */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Your Designs</h2>
          <Link
            href="/design"
            className="text-sm text-accent hover:underline"
          >
            Create new
          </Link>
        </div>
        {designs && designs.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {designs.map((design: Record<string, unknown>) => (
              <div
                key={design.id as string}
                className="aspect-square rounded-lg overflow-hidden bg-muted border border-border"
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
          <div className="bg-muted rounded-lg p-8 text-center">
            <Palette className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">
              No designs yet.{" "}
              <Link href="/design" className="text-accent hover:underline">
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
            <h2 className="text-lg font-semibold">Your Products</h2>
          </div>
          {products && products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product: Record<string, unknown>) => (
                <div
                  key={product.id as string}
                  className="border border-border rounded-lg overflow-hidden"
                >
                  <div className="aspect-square bg-muted">
                    <img
                      src={product.image_url as string}
                      alt={product.title as string}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-sm truncate">
                      {product.title as string}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      ${((product.price as number) / 100).toFixed(2)}
                    </p>
                    <span
                      className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                        product.is_published
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {product.is_published ? "Published" : "Draft"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-muted rounded-lg p-8 text-center">
              <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                No products yet. Create a design first, then list it as a product.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Buyer Orders */}
      {buyerOrders && buyerOrders.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Your Purchases</h2>
          <div className="space-y-3">
            {buyerOrders.map((order: Record<string, unknown>) => (
              <div
                key={order.id as string}
                className="flex items-center gap-4 border border-border rounded-lg p-4"
              >
                <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    Order #{(order.id as string).slice(0, 8)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ${((order.total_amount as number) / 100).toFixed(2)} &middot;{" "}
                    {order.status as string}
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
