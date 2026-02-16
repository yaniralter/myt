import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Sparkles, Store, ShoppingBag, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();

  // Get featured products
  const { data: featuredProducts } = await supabase
    .from("products")
    .select("*, shop:shops(name, slug)")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(8);

  // Get active shops
  const { data: shops } = await supabase
    .from("shops")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(6);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-accent/5 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Design. Print. Sell.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mt-4 max-w-2xl mx-auto">
              Create unique AI-generated t-shirt designs and sell them to the
              world. Open your shop in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <Link
                href="/design-studio"
                className="inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                <Sparkles className="w-4 h-4" />
                Start Designing
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center gap-2 border border-border px-6 py-3 rounded-lg font-medium hover:bg-muted transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                Browse Marketplace
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">1. Design with AI</h3>
              <p className="text-sm text-muted-foreground">
                Type a description and our AI creates a unique t-shirt design
                for you in seconds.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Store className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">2. Open Your Shop</h3>
              <p className="text-sm text-muted-foreground">
                Set up your shop, list your designs with custom pricing, and
                start selling.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">3. Earn Money</h3>
              <p className="text-sm text-muted-foreground">
                When someone buys your design, we handle printing and shipping.
                You keep 85% of every sale.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts && featuredProducts.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">Latest Designs</h2>
              <Link
                href="/marketplace"
                className="text-sm text-accent hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {featuredProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/product/${product.id}`}
                  className="group border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-sm truncate">
                      {product.title}
                    </h3>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-accent font-semibold text-sm">
                        ${(product.price / 100).toFixed(2)}
                      </p>
                      {product.shop && (
                        <p className="text-xs text-muted-foreground truncate ml-2">
                          {(product.shop as { name: string }).name}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Shops */}
      {shops && shops.length > 0 && (
        <section className="py-16 bg-muted/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">Shops</h2>
              <Link
                href="/marketplace"
                className="text-sm text-accent hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {shops.map((shop) => (
                <Link
                  key={shop.id}
                  href={`/shop/${shop.slug}`}
                  className="border border-border rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow"
                >
                  <div className="h-24 bg-gradient-to-r from-accent/20 to-accent/5">
                    {shop.banner_url && (
                      <img
                        src={shop.banner_url}
                        alt={shop.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center -mt-6 border-2 border-white">
                        <Store className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold text-sm">{shop.name}</h3>
                    </div>
                    {shop.bio && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {shop.bio}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to start your t-shirt business?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join MYT today and turn your creativity into income. No inventory,
            no hassle.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
