import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Store } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ShopPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: shop } = await supabase
    .from("shops")
    .select("*")
    .eq("slug", slug)
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
      <div className="relative h-48 md:h-64 bg-muted">
        {shop.banner_url ? (
          <img
            src={shop.banner_url}
            alt={shop.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-accent/20 to-accent/5" />
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Shop info */}
        <div className="flex items-start gap-4 mb-8 -mt-12 relative z-10">
          <div className="w-20 h-20 bg-white rounded-full border-4 border-white shadow flex items-center justify-center">
            <Store className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="pt-8">
            <h1 className="text-2xl font-bold">{shop.name}</h1>
            {shop.bio && (
              <p className="text-muted-foreground mt-1 max-w-2xl">
                {shop.bio}
              </p>
            )}
          </div>
        </div>

        {/* Products grid */}
        <h2 className="text-lg font-semibold mb-4">
          Products ({products?.length || 0})
        </h2>
        {products && products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/product/${product.id}`}
                className="group border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-muted">
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
                  <p className="text-accent font-semibold text-sm mt-1">
                    ${(product.price / 100).toFixed(2)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-muted rounded-lg p-12 text-center">
            <p className="text-muted-foreground">
              This shop doesn&apos;t have any products yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
