"use client";

import { useState } from "react";
import { Loader2, ShoppingCart } from "lucide-react";
import { T_SHIRT_SIZES, type TShirtSize } from "@/lib/types";

export default function CheckoutButton({
  productId,
}: {
  productId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [size, setSize] = useState<TShirtSize>("L");

  async function handleCheckout() {
    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, size }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Redirect to Rapyd checkout
      window.location.href = data.url;
    } catch {
      alert("Failed to start checkout. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Size selector */}
      <div>
        <label className="block text-sm font-semibold text-primary mb-2">
          Size
        </label>
        <div className="flex gap-2">
          {T_SHIRT_SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                size === s
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-surface-raised border-border text-muted-foreground hover:border-accent/40 hover:text-primary"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Buy button */}
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full bg-accent text-accent-foreground py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ShoppingCart className="w-4 h-4" />
        )}
        {loading ? "Starting checkout..." : "Buy Now"}
      </button>
    </div>
  );
}
