import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Sparkles, Store, ShoppingBag, ArrowRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: featuredProducts } = await supabase
    .from("products")
    .select("*, shop:shops(name, slug)")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(8);

  const { data: shops } = await supabase
    .from("shops")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(6);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-primary">
              Design. Print.{" "}
              <span className="text-accent">Sell.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mt-6 max-w-2xl mx-auto leading-relaxed">
              Create unique AI-generated t-shirt designs and sell them to the
              world. Open your shop in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
              <Link
                href="/design-studio"
                className="inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-8 py-3.5 rounded-xl font-medium hover:opacity-90 transition-opacity text-sm"
              >
                <Sparkles className="w-4 h-4" />
                Start Designing
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center gap-2 bg-surface border border-border text-primary px-8 py-3.5 rounded-xl font-medium hover:border-accent/40 transition-colors text-sm"
              >
                <ShoppingBag className="w-4 h-4" />
                Browse Marketplace
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center text-primary mb-14">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Sparkles,
                step: "1",
                title: "Design with AI",
                desc: "Type a description and our AI creates a unique t-shirt design for you in seconds.",
              },
              {
                icon: Store,
                step: "2",
                title: "Open Your Shop",
                desc: "Set up your shop, list your designs with custom pricing, and start selling.",
              },
              {
                icon: ShoppingBag,
                step: "3",
                title: "Earn Money",
                desc: "When someone buys your design, we handle printing and shipping. You keep 85%.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center group">
                <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:bg-accent/20 transition-colors">
                  <item.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-semibold text-primary mb-2">
                  {item.step}. {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts && featuredProducts.length > 0 ? (
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-primary">
                Latest Designs
              </h2>
              <Link
                href="/marketplace"
                className="text-sm text-accent hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {featuredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  title={product.title}
                  price={product.price}
                  imageUrl={product.image_url}
                  shopName={
                    product.shop
                      ? (product.shop as { name: string }).name
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-primary mb-8">
              Latest Designs
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="bg-surface border border-border rounded-xl overflow-hidden"
                >
                  <div className="aspect-square bg-surface-raised flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-border" />
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-surface-raised rounded w-3/4" />
                    <div className="h-4 bg-surface-raised rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-muted-foreground text-sm mt-6">
              No products yet. Be the first to{" "}
              <Link
                href="/design-studio"
                className="text-accent hover:underline"
              >
                create a design
              </Link>{" "}
              and list it for sale.
            </p>
          </div>
        </section>
      )}

      {/* Shops */}
      {shops && shops.length > 0 && (
        <section className="py-20 bg-surface">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-primary">Shops</h2>
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
                  href={`/shop/${shop.id}`}
                  className="bg-surface-raised border border-border rounded-xl overflow-hidden hover:border-accent/40 transition-all"
                >
                  <div className="h-24 bg-gradient-to-r from-accent/10 to-purple-500/10">
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
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center -mt-7 border-2 border-surface-raised">
                        <Store className="w-4 h-4 text-accent" />
                      </div>
                      <h3 className="font-semibold text-sm text-primary">
                        {shop.name}
                      </h3>
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
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            Ready to start your t-shirt business?
          </h2>
          <p className="text-muted-foreground mb-10 leading-relaxed">
            Join MYT today and turn your creativity into income. No inventory,
            no hassle.
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-10 py-3.5 rounded-xl font-medium hover:opacity-90 transition-opacity text-sm"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
