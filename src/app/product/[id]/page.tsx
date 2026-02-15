import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Store } from "lucide-react";
import CheckoutButton from "./checkout-button";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("*, shop:shops(*)")
    .eq("id", id)
    .single();

  if (!product || !product.is_published) notFound();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product image with T-shirt mockup */}
        <div>
          <div className="border border-border rounded-lg overflow-hidden bg-gray-50 relative aspect-square flex items-center justify-center">
            <svg
              viewBox="0 0 400 450"
              className="w-full h-full"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M100,60 L60,80 L20,140 L70,160 L90,110 L90,400 L310,400 L310,110 L330,160 L380,140 L340,80 L300,60 L260,50 Q230,80 200,80 Q170,80 140,50 Z"
                fill="#ffffff"
                stroke="#e5e7eb"
                strokeWidth="2"
              />
              <image
                href={product.image_url}
                x="120"
                y="120"
                width="160"
                height="160"
                preserveAspectRatio="xMidYMid meet"
              />
            </svg>
          </div>
          {/* Raw design below */}
          <div className="mt-4 border border-border rounded-lg overflow-hidden">
            <img
              src={product.image_url}
              alt={product.title}
              className="w-full aspect-square object-cover"
            />
          </div>
        </div>

        {/* Product details */}
        <div>
          <div className="mb-4">
            {product.shop && (
              <Link
                href={`/shop/${product.shop.slug}`}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-2"
              >
                <Store className="w-3 h-3" />
                {product.shop.name}
              </Link>
            )}
            <h1 className="text-3xl font-bold">{product.title}</h1>
          </div>

          <p className="text-3xl font-bold text-accent mb-6">
            ${(product.price / 100).toFixed(2)}
          </p>

          {product.description && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold mb-2">Description</h2>
              <p className="text-muted-foreground">{product.description}</p>
            </div>
          )}

          <CheckoutButton productId={product.id} />

          <div className="mt-8 border-t border-border pt-6">
            <h3 className="text-sm font-semibold mb-3">Product Details</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>&bull; Premium quality cotton t-shirt</li>
              <li>&bull; Available in multiple sizes</li>
              <li>&bull; Printed on demand</li>
              <li>&bull; Ships worldwide</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
