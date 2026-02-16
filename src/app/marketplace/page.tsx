import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Store, Search } from "lucide-react";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("products")
    .select("*, shop:shops(name, id)")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  const { data: shops } = await supabase
    .from("shops")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary">Marketplace</h1>
        <p className="text-muted-foreground mt-1">
          Discover unique AI-generated t-shirt designs
        </p>
      </div>

      {/* Shops section */}
      {shops && shops.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-primary">Shops</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
            {shops.map((shop) => (
              <Link
                key={shop.id}
                href={`/shop/${shop.id}`}
                className="flex-shrink-0 w-48 border border-border rounded-lg overflow-hidden hover:shadow-lg hover:shadow-accent/5 transition-shadow bg-surface"
              >
                <div className="h-16 bg-gradient-to-r from-accent/20 to-accent/5">
                  {shop.banner_url && (
                    <img
                      src={shop.banner_url}
                      alt={shop.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-surface-raised rounded-full flex items-center justify-center -mt-5 border-2 border-surface">
                      <Store className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium text-sm truncate text-primary">
                      {shop.name}
                    </h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* All products */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-primary">
          All Products ({products?.length || 0})
        </h2>
        {products && products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                title={product.title}
                price={product.price}
                imageUrl={product.image_url}
                shopName={(product.shop as { name: string } | null)?.name}
              />
            ))}
          </div>
        ) : (
          <div className="bg-surface rounded-lg p-16 text-center border border-border">
            <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-1 text-primary">No products yet</h3>
            <p className="text-sm text-muted-foreground">
              Be the first to{" "}
              <Link href="/design-studio" className="text-accent hover:underline">
                create a design
              </Link>{" "}
              and list it for sale.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
