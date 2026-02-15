"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, Loader2, ShoppingBag, Download } from "lucide-react";
import type { Design } from "@/lib/types";

export default function DesignStudioPage() {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [currentDesign, setCurrentDesign] = useState<Design | null>(null);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [error, setError] = useState("");
  const [hasShop, setHasShop] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: designsData } = await supabase
        .from("designs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (designsData) setDesigns(designsData);

      const { data: shop } = await supabase
        .from("shops")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (shop) setHasShop(true);
    }
    load();
  }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setError("");
    setGenerating(true);

    try {
      const res = await fetch("/api/generate-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCurrentDesign(data.design);
      setDesigns((prev) => [data.design, ...prev]);
      setPrompt("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate design";
      setError(message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">AI Design Studio</h1>
        <p className="text-muted-foreground mt-2">
          Describe your t-shirt design and let AI bring it to life
        </p>
      </div>

      {/* Generator */}
      <div className="max-w-2xl mx-auto mb-12">
        <form onSubmit={handleGenerate} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-destructive text-sm p-3 rounded-lg">
              {error}
            </div>
          )}
          <div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your t-shirt design... e.g., 'A cosmic cat riding a skateboard through a neon galaxy'"
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {prompt.length}/500 characters
            </p>
          </div>
          <button
            type="submit"
            disabled={generating || !prompt.trim()}
            className="w-full bg-accent text-accent-foreground py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {generating ? "Generating your design..." : "Generate Design"}
          </button>
        </form>
      </div>

      {/* Current design preview with T-shirt mockup */}
      {currentDesign && (
        <div className="max-w-2xl mx-auto mb-12">
          <h2 className="text-lg font-semibold mb-4">Your Design</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Raw design */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Design</p>
              <div className="border border-border rounded-lg overflow-hidden bg-muted">
                <img
                  src={currentDesign.image_url}
                  alt={currentDesign.prompt}
                  className="w-full aspect-square object-cover"
                />
              </div>
            </div>

            {/* T-shirt mockup */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                T-Shirt Preview
              </p>
              <div className="border border-border rounded-lg overflow-hidden bg-gray-50 relative aspect-square flex items-center justify-center">
                {/* Simple T-shirt SVG mockup */}
                <svg
                  viewBox="0 0 400 450"
                  className="w-full h-full"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* T-shirt shape */}
                  <path
                    d="M100,60 L60,80 L20,140 L70,160 L90,110 L90,400 L310,400 L310,110 L330,160 L380,140 L340,80 L300,60 L260,50 Q230,80 200,80 Q170,80 140,50 Z"
                    fill="#ffffff"
                    stroke="#e5e7eb"
                    strokeWidth="2"
                  />
                  {/* Design overlay */}
                  <image
                    href={currentDesign.image_url}
                    x="120"
                    y="120"
                    width="160"
                    height="160"
                    preserveAspectRatio="xMidYMid meet"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-4">
            {hasShop ? (
              <Link
                href={`/product/new?design=${currentDesign.id}`}
                className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg font-medium hover:opacity-90 flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                List as Product
              </Link>
            ) : (
              <Link
                href="/shop/new"
                className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg font-medium hover:opacity-90 flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                Open a Shop to Sell
              </Link>
            )}
            <a
              href={currentDesign.image_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 border border-border rounded-lg hover:bg-muted flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </a>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Prompt: &quot;{currentDesign.prompt}&quot;
          </p>
        </div>
      )}

      {/* Previous designs */}
      {designs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Your Designs</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {designs.map((design) => (
              <button
                key={design.id}
                onClick={() => setCurrentDesign(design)}
                className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                  currentDesign?.id === design.id
                    ? "border-accent"
                    : "border-border hover:border-accent/50"
                }`}
              >
                <img
                  src={design.image_url}
                  alt={design.prompt}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
