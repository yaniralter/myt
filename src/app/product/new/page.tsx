"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Package, DollarSign } from "lucide-react";
import type { Design, Shop } from "@/lib/types";

function NewProductForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [design, setDesign] = useState<Design | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const designId = searchParams.get("design");
  const existingPrintifyProductId = searchParams.get("printifyProduct");
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      const { data: shopData } = await supabase
        .from("shops")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (!shopData) {
        router.push("/shop/new");
        return;
      }
      setShop(shopData);

      const { data: designsData } = await supabase
        .from("designs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (designsData) {
        setDesigns(designsData);
        if (designId) {
          const found = designsData.find((d: Design) => d.id === designId);
          if (found) setDesign(found);
        }
      }

      setLoading(false);
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shop || !design) return;
    setError("");
    setSaving(true);

    const priceInCents = Math.round(parseFloat(price) * 100);
    if (isNaN(priceInCents) || priceInCents < 100) {
      setError("Price must be at least $1.00");
      setSaving(false);
      return;
    }

    // Use existing Printify product ID from Design Studio, or create a new one
    let printifyProductId = existingPrintifyProductId || null;
    if (!printifyProductId) {
      try {
        const printifyRes = await fetch("/api/printify/create-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            imageUrl: design.image_url,
          }),
        });
        if (printifyRes.ok) {
          const printifyData = await printifyRes.json();
          printifyProductId = printifyData.productId;
        }
      } catch {
        // Printify integration is optional - continue without it
      }
    }

    const { error: insertError } = await supabase.from("products").insert({
      shop_id: shop.id,
      design_id: design.id,
      title,
      description,
      price: priceInCents,
      image_url: design.image_url,
      printify_product_id: printifyProductId,
      is_published: true,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    router.push("/seller-dashboard");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-primary">List a New Product</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20">
            {error}
          </div>
        )}

        {/* Select design */}
        <div>
          <label className="block text-sm font-medium mb-2 text-primary">
            Select a Design *
          </label>
          {designs.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {designs.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDesign(d)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                    design?.id === d.id
                      ? "border-accent ring-2 ring-accent/20"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <img
                    src={d.image_url}
                    alt={d.prompt}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No designs yet.{" "}
              <a href="/design-studio" className="text-accent hover:underline">
                Create one first
              </a>
            </p>
          )}
        </div>

        {/* Preview */}
        {design && (
          <div className="bg-surface-raised rounded-lg p-4 flex items-center gap-4 border border-border">
            <img
              src={design.image_url}
              alt="Selected design"
              className="w-20 h-20 rounded object-cover"
            />
            <div>
              <p className="text-sm font-medium text-primary">Selected Design</p>
              <p className="text-xs text-muted-foreground truncate max-w-md">
                {design.prompt}
              </p>
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1 text-primary">
            Product Title *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={100}
            className="w-full px-3 py-2 bg-surface-raised border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-primary placeholder:text-muted-foreground"
            placeholder="Cosmic Cat T-Shirt"
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium mb-1 text-primary"
          >
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={1000}
            className="w-full px-3 py-2 bg-surface-raised border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-primary placeholder:text-muted-foreground resize-none"
            placeholder="Describe your product..."
          />
        </div>

        {/* Price */}
        <div>
          <label htmlFor="price" className="block text-sm font-medium mb-1 text-primary">
            Price (USD) *
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              min="1"
              step="0.01"
              className="w-full pl-8 pr-3 py-2 bg-surface-raised border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-primary placeholder:text-muted-foreground"
              placeholder="29.99"
            />
          </div>
          {price && parseFloat(price) > 0 && (
            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
              <p>
                Platform fee (15%): $
                {(parseFloat(price) * 0.15).toFixed(2)}
              </p>
              <p>
                You earn: $
                {(parseFloat(price) * 0.85).toFixed(2)}
              </p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={saving || !design || !title || !price}
          className="w-full bg-accent text-accent-foreground py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Package className="w-4 h-4" />
          )}
          {saving ? "Publishing..." : "Publish Product"}
        </button>
      </form>
    </div>
  );
}

export default function NewProductPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <NewProductForm />
    </Suspense>
  );
}
