"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Sparkles,
  Loader2,
  ShoppingBag,
  Download,
  RefreshCw,
  Shuffle,
  X,
  Check,
} from "lucide-react";
import type { Design } from "@/lib/types";

const STYLE_PRESETS = [
  { id: "vintage", label: "Vintage", emoji: "\u{1F3B6}" },
  { id: "minimalist", label: "Minimalist", emoji: "\u{25CB}" },
  { id: "streetwear", label: "Streetwear", emoji: "\u{1F525}" },
  { id: "anime", label: "Anime", emoji: "\u{2B50}" },
  { id: "abstract", label: "Abstract", emoji: "\u{1F3A8}" },
  { id: "retro", label: "Retro", emoji: "\u{1F579}" },
] as const;

const COLOR_SWATCHES = [
  { name: "Red", hex: "#EF4444" },
  { name: "Orange", hex: "#F97316" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Yellow", hex: "#EAB308" },
  { name: "Lime", hex: "#84CC16" },
  { name: "Green", hex: "#22C55E" },
  { name: "Teal", hex: "#14B8A6" },
  { name: "Cyan", hex: "#06B6D4" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "Indigo", hex: "#6366F1" },
  { name: "Purple", hex: "#A855F7" },
  { name: "Pink", hex: "#EC4899" },
  { name: "Rose", hex: "#F43F5E" },
  { name: "Black", hex: "#171717" },
  { name: "White", hex: "#FAFAFA" },
  { name: "Gold", hex: "#CA8A04" },
];

const VARIATION_MODIFIERS = [
  "with a slightly different composition",
  "with an alternative perspective",
  "with bolder contrast",
  "reimagined with more detail",
  "with a more dynamic layout",
];

export default function DesignStudioPage() {
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [currentDesign, setCurrentDesign] = useState<Design | null>(null);
  const [lastPromptUsed, setLastPromptUsed] = useState("");
  const [lastStyleUsed, setLastStyleUsed] = useState<string | null>(null);
  const [lastColorsUsed, setLastColorsUsed] = useState<string[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [error, setError] = useState("");
  const [hasShop, setHasShop] = useState(false);
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

  function toggleColor(colorName: string) {
    setSelectedColors((prev) => {
      if (prev.includes(colorName)) {
        return prev.filter((c) => c !== colorName);
      }
      if (prev.length >= 3) return prev;
      return [...prev, colorName];
    });
  }

  async function generateDesign(
    designPrompt: string,
    style: string | null,
    colors: string[]
  ) {
    if (!designPrompt.trim()) return;
    setError("");
    setGenerating(true);

    try {
      const res = await fetch("/api/generate-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: designPrompt.trim(),
          style: style || undefined,
          colors: colors.length > 0 ? colors : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCurrentDesign(data.design);
      setDesigns((prev) => [data.design, ...prev]);
      setLastPromptUsed(designPrompt.trim());
      setLastStyleUsed(style);
      setLastColorsUsed(colors);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to generate design";
      setError(message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    await generateDesign(prompt, selectedStyle, selectedColors);
    setPrompt("");
  }

  async function handleRegenerate() {
    if (!lastPromptUsed) return;
    await generateDesign(lastPromptUsed, lastStyleUsed, lastColorsUsed);
  }

  async function handleVariation() {
    if (!lastPromptUsed) return;
    const modifier =
      VARIATION_MODIFIERS[Math.floor(Math.random() * VARIATION_MODIFIERS.length)];
    const variedPrompt = `${lastPromptUsed}, ${modifier}`;
    await generateDesign(variedPrompt, lastStyleUsed, lastColorsUsed);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-primary">
          AI Design Studio
        </h1>
        <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
          Describe your vision, pick a style and colors, and watch AI create
          your next bestselling t-shirt design.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left column: Controls */}
        <div>
          <form onSubmit={handleGenerate} className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20">
                {error}
              </div>
            )}

            {/* Prompt */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-primary">
                Design Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A cosmic cat riding a skateboard through a neon galaxy..."
                rows={3}
                maxLength={500}
                disabled={generating}
                className="w-full px-4 py-3 bg-surface-raised border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-primary placeholder:text-muted-foreground resize-none disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {prompt.length}/500 characters
              </p>
            </div>

            {/* Style Presets */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-primary">
                Style Preset
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {STYLE_PRESETS.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    disabled={generating}
                    onClick={() =>
                      setSelectedStyle(
                        selectedStyle === style.id ? null : style.id
                      )
                    }
                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-lg border text-xs font-medium transition-all disabled:opacity-50 ${
                      selectedStyle === style.id
                        ? "border-accent bg-accent/10 text-accent ring-1 ring-accent/30"
                        : "border-border bg-surface hover:border-accent/40 text-muted-foreground hover:text-primary"
                    }`}
                  >
                    <span className="text-base">{style.emoji}</span>
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Palette */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-primary">
                  Color Palette
                </label>
                <span className="text-xs text-muted-foreground">
                  {selectedColors.length}/3 selected
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {COLOR_SWATCHES.map((color) => {
                  const isSelected = selectedColors.includes(color.name);
                  return (
                    <button
                      key={color.name}
                      type="button"
                      disabled={generating}
                      onClick={() => toggleColor(color.name)}
                      title={color.name}
                      className={`relative w-8 h-8 rounded-full border-2 transition-all disabled:opacity-50 ${
                        isSelected
                          ? "border-primary scale-110 ring-2 ring-accent/30"
                          : "border-border hover:scale-105"
                      } ${
                        !isSelected && selectedColors.length >= 3
                          ? "opacity-40 cursor-not-allowed"
                          : ""
                      }`}
                      style={{ backgroundColor: color.hex }}
                    >
                      {isSelected && (
                        <Check
                          className={`w-4 h-4 absolute inset-0 m-auto ${
                            color.name === "Black"
                              ? "text-white"
                              : "text-primary-foreground"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedColors.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex gap-1">
                    {selectedColors.map((name) => {
                      const swatch = COLOR_SWATCHES.find(
                        (c) => c.name === name
                      );
                      return (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 text-xs bg-surface-raised px-2 py-1 rounded-full text-primary"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-border"
                            style={{
                              backgroundColor: swatch?.hex,
                            }}
                          />
                          {name}
                          <button
                            type="button"
                            onClick={() => toggleColor(name)}
                            className="ml-0.5 hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedColors([])}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Generate Button */}
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
              {generating ? "Generating design..." : "Generate Design"}
            </button>
          </form>

          {/* Gallery */}
          {designs.length > 0 && (
            <div className="mt-10">
              <h2 className="text-sm font-semibold mb-3 text-primary">Your Gallery</h2>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {designs.map((design) => (
                  <button
                    key={design.id}
                    onClick={() => {
                      setCurrentDesign(design);
                      setLastPromptUsed(design.prompt);
                    }}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                      currentDesign?.id === design.id
                        ? "border-accent ring-2 ring-accent/20"
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

        {/* Right column: Preview */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          {generating ? (
            <div className="border border-border rounded-xl bg-surface aspect-square flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <Loader2 className="w-10 h-10 animate-spin text-accent" />
              </div>
              <div className="text-center">
                <p className="font-medium text-sm text-primary">Creating your design</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This usually takes 10-20 seconds...
                </p>
              </div>
            </div>
          ) : currentDesign ? (
            <div>
              {/* T-Shirt Mockup */}
              <div className="border border-border rounded-xl overflow-hidden bg-gradient-to-b from-surface to-surface-raised relative aspect-square flex items-center justify-center">
                <svg
                  viewBox="0 0 400 450"
                  className="w-full h-full"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <ellipse
                    cx="200"
                    cy="430"
                    rx="120"
                    ry="8"
                    fill="#ffffff08"
                  />
                  <path
                    d="M100,60 L60,80 L20,140 L70,160 L90,110 L90,400 L310,400 L310,110 L330,160 L380,140 L340,80 L300,60 L260,50 Q230,80 200,80 Q170,80 140,50 Z"
                    fill="#1a1a2e"
                    stroke="#27273a"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M140,50 Q170,75 200,75 Q230,75 260,50"
                    fill="none"
                    stroke="#27273a"
                    strokeWidth="1"
                  />
                  <image
                    href={currentDesign.image_url}
                    x="115"
                    y="110"
                    width="170"
                    height="170"
                    preserveAspectRatio="xMidYMid meet"
                    clipPath="inset(0)"
                  />
                </svg>
              </div>

              {/* Actions row */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleRegenerate}
                  disabled={generating || !lastPromptUsed}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-surface-raised transition-colors disabled:opacity-50 text-primary"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </button>
                <button
                  onClick={handleVariation}
                  disabled={generating || !lastPromptUsed}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-surface-raised transition-colors disabled:opacity-50 text-primary"
                >
                  <Shuffle className="w-4 h-4" />
                  Variation
                </button>
              </div>

              {/* Publish / Download */}
              <div className="flex gap-2 mt-2">
                {hasShop ? (
                  <Link
                    href={`/product/new?design=${currentDesign.id}`}
                    className="flex-1 bg-accent text-accent-foreground py-2.5 rounded-lg font-medium hover:opacity-90 flex items-center justify-center gap-2 text-sm"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Publish to Shop
                  </Link>
                ) : (
                  <Link
                    href="/shop/new"
                    className="flex-1 bg-accent text-accent-foreground py-2.5 rounded-lg font-medium hover:opacity-90 flex items-center justify-center gap-2 text-sm"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Open a Shop to Sell
                  </Link>
                )}
                <a
                  href={currentDesign.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 border border-border rounded-lg hover:bg-surface-raised flex items-center gap-2 text-sm text-primary"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>

              {/* Prompt info */}
              <p className="text-xs text-muted-foreground mt-3 truncate">
                Prompt: &quot;{currentDesign.prompt}&quot;
              </p>
            </div>
          ) : (
            <div className="border border-dashed border-border rounded-xl bg-surface aspect-square flex flex-col items-center justify-center gap-3 text-center px-8">
              <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-accent" />
              </div>
              <div>
                <p className="font-medium text-sm text-primary">Your design preview</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter a prompt, choose a style, and hit Generate to see your
                  design on a t-shirt mockup.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
