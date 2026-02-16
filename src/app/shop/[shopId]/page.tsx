import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Store } from "lucide-react";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function ShopPage({
  params,
}: {
  params: Promise<{ shopId: string }>;
}) {
  const { shopId } = await params;
  const supabase = await createClient();

  const { data: shop } = await supabase
    .from("shops")
    .select("*")
    .eq("id", shopId)
    .single();

  if (!shop) notFound();

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("shop_id", shop.id)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  return (
    <div>
      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-surface-raised">
        {shop.banner_url ? (
          <img
            src={shop.banner_url}
            alt={shop.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-accent/10 to-purple-500/10" />
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Shop info */}
        <div className="flex items-start gap-4 mb-8 -mt-12 relative z-10">
          <div className="w-20 h-20 bg-surface rounded-full border-4 border-bg shadow-lg flex items-center justify-center">
            <Store className="w-8 h-8 text-accent" />
          </div>
          <div className="pt-8">
            <h1 className="text-2xl font-bold text-primary">{shop.name}</h1>
            {shop.bio && (
              <p className="text-muted-foreground mt-1 max-w-2xl">
                {shop.bio}
              </p>
            )}
          </div>
        </div>

        {/* Products grid */}
        <h2 className="text-lg font-semibold text-primary mb-4">
          Products ({products?.length || 0})
        </h2>
        {products && products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                title={product.title}
                price={product.price}
                imageUrl={product.image_url}
              />
            ))}
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-xl p-12 text-center">
            <p className="text-muted-foreground">
              This shop doesn&apos;t have any products yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
