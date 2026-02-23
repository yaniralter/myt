"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  Type,
  Bold,
  Italic,
  Save,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Move,
  Image as ImageIcon,
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

const FONT_OPTIONS = [
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "Impact, sans-serif", label: "Impact" },
  { value: "'Bebas Neue', sans-serif", label: "Bebas Neue" },
  { value: "Pacifico, cursive", label: "Pacifico" },
  { value: "Roboto, sans-serif", label: "Roboto" },
  { value: "'Courier New', monospace", label: "Courier" },
];

// Shirt colors for the SVG fallback mockup and Printify color selector
interface ShirtColor {
  name: string;
  printifyName: string; // Maps to Printify's color name
  fill: string;
  stroke: string;
  foldLight: string;
  foldDark: string;
  isLight: boolean;
}

const SHIRT_COLORS: ShirtColor[] = [
  { name: "White", printifyName: "White", fill: "#F5F5F5", stroke: "#D4D4D4", foldLight: "rgba(255,255,255,0.5)", foldDark: "rgba(0,0,0,0.06)", isLight: true },
  { name: "Black", printifyName: "Black", fill: "#1C1C1C", stroke: "#333333", foldLight: "rgba(255,255,255,0.08)", foldDark: "rgba(0,0,0,0.25)", isLight: false },
  { name: "Gray", printifyName: "Sport Grey", fill: "#9CA3AF", stroke: "#7B8294", foldLight: "rgba(255,255,255,0.25)", foldDark: "rgba(0,0,0,0.12)", isLight: true },
  { name: "Navy", printifyName: "Navy", fill: "#1E3A5F", stroke: "#152C4A", foldLight: "rgba(255,255,255,0.08)", foldDark: "rgba(0,0,0,0.2)", isLight: false },
  { name: "Red", printifyName: "Red", fill: "#DC2626", stroke: "#B91C1C", foldLight: "rgba(255,255,255,0.12)", foldDark: "rgba(0,0,0,0.15)", isLight: false },
];

type TextAlign = "left" | "center" | "right";

interface TextOverlay {
  text: string;
  font: string;
  fontSize: number;
  color: string;
  x: number;
  y: number;
  align: TextAlign;
  bold: boolean;
  italic: boolean;
  outline: boolean;
}

const DEFAULT_TEXT_OVERLAY: TextOverlay = {
  text: "",
  font: "Arial, sans-serif",
  fontSize: 40,
  color: "#1C1C1C",
  x: 50,
  y: 85,
  align: "center",
  bold: false,
  italic: false,
  outline: true,
};

// Printify mockup data per design
interface PrintifyMockupData {
  printifyProductId: string;
  mockups: Record<string, string>; // color name → mockup image URL
  defaultMockup: string | null;
}

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

  // Shirt color selection
  const [selectedShirtColor, setSelectedShirtColor] = useState(SHIRT_COLORS[0]);

  // Printify mockup state
  const [printifyData, setPrintifyData] = useState<PrintifyMockupData | null>(null);
  const [loadingMockups, setLoadingMockups] = useState(false);
  const [mockupError, setMockupError] = useState("");

  // Text overlay state
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [textOverlay, setTextOverlay] = useState<TextOverlay>(DEFAULT_TEXT_OVERLAY);
  const [savingComposite, setSavingComposite] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [compositePreviewUrl, setCompositePreviewUrl] = useState<string | null>(null);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

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

  // Auto-adjust text color for contrast when shirt color changes
  useEffect(() => {
    setTextOverlay((prev) => ({
      ...prev,
      color: selectedShirtColor.isLight ? "#1C1C1C" : "#FFFFFF",
    }));
  }, [selectedShirtColor]);

  // Load Google Fonts for text overlay
  useEffect(() => {
    if (typeof document === "undefined") return;
    const existing = document.getElementById("myt-google-fonts");
    if (existing) return;
    const link = document.createElement("link");
    link.id = "myt-google-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Pacifico&family=Roboto:wght@400;700&display=swap";
    document.head.appendChild(link);
  }, []);

  // Load the design image when currentDesign changes (for text overlay compositing)
  useEffect(() => {
    if (!currentDesign) {
      setLoadedImage(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setLoadedImage(img);
    img.onerror = () => setLoadedImage(null);
    img.src = currentDesign.image_url;
  }, [currentDesign?.image_url]);

  // Render composite whenever text overlay or loaded image changes
  const renderComposite = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loadedImage) return;

    const size = 1024;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(loadedImage, 0, 0, size, size);

    if (textOverlay.text.trim()) {
      const fontWeight = textOverlay.bold ? "bold" : "normal";
      const fontStyle = textOverlay.italic ? "italic" : "normal";
      ctx.font = `${fontStyle} ${fontWeight} ${textOverlay.fontSize}px ${textOverlay.font}`;
      ctx.fillStyle = textOverlay.color;
      ctx.textAlign = textOverlay.align;

      const x = (textOverlay.x / 100) * size;
      const baseY = (textOverlay.y / 100) * size;

      const isTextDark =
        parseInt(textOverlay.color.slice(1, 3), 16) * 0.299 +
        parseInt(textOverlay.color.slice(3, 5), 16) * 0.587 +
        parseInt(textOverlay.color.slice(5, 7), 16) * 0.114 < 128;

      ctx.shadowColor = isTextDark ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.6)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      if (textOverlay.outline) {
        ctx.strokeStyle = isTextDark ? "#FFFFFF" : "#000000";
        ctx.lineWidth = Math.max(2, textOverlay.fontSize / 12);
        ctx.lineJoin = "round";
      }

      const maxWidth = size - 80;
      const words = textOverlay.text.split(" ");
      const lines: string[] = [];
      let currentLine = words[0] || "";

      for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + " " + words[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth) {
          lines.push(currentLine);
          currentLine = words[i];
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine);

      const lineHeight = textOverlay.fontSize * 1.2;
      const totalHeight = lines.length * lineHeight;
      let y = baseY - totalHeight / 2 + textOverlay.fontSize;

      for (const line of lines) {
        if (textOverlay.outline) {
          ctx.strokeText(line, x, y);
        }
        ctx.fillText(line, x, y);
        y += lineHeight;
      }

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    setCompositePreviewUrl(canvas.toDataURL("image/png"));
  }, [loadedImage, textOverlay]);

  useEffect(() => {
    renderComposite();
  }, [renderComposite]);

  function toggleColor(colorName: string) {
    setSelectedColors((prev) => {
      if (prev.includes(colorName)) {
        return prev.filter((c) => c !== colorName);
      }
      if (prev.length >= 3) return prev;
      return [...prev, colorName];
    });
  }

  // Fetch Printify mockups for a design (runs in background)
  async function fetchPrintifyMockups(design: Design) {
    setLoadingMockups(true);
    setMockupError("");

    try {
      const res = await fetch("/api/printify/mockups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: design.image_url,
          title: design.prompt.slice(0, 60),
          designId: design.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Mockup generation failed");
      }

      const data = await res.json();
      setPrintifyData({
        printifyProductId: data.printifyProductId,
        mockups: data.mockups,
        defaultMockup: data.defaultMockup,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Mockup generation failed";
      setMockupError(message);
      console.warn("[Printify] Mockup fetch failed, using SVG fallback:", message);
    } finally {
      setLoadingMockups(false);
    }
  }

  async function generateDesign(
    designPrompt: string,
    style: string | null,
    colors: string[]
  ) {
    if (!designPrompt.trim()) return;
    setError("");
    setGenerating(true);
    setShowTextEditor(false);
    setTextOverlay(DEFAULT_TEXT_OVERLAY);
    setCompositePreviewUrl(null);
    setPrintifyData(null);
    setMockupError("");

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

      // Fetch Printify mockups in background (non-blocking)
      fetchPrintifyMockups(data.design);
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

  async function handleSaveComposite() {
    if (!currentDesign || !canvasRef.current) return;
    setError("");
    setSavingComposite(true);

    try {
      const imageData = canvasRef.current.toDataURL("image/png");
      const promptWithText = textOverlay.text.trim()
        ? `${currentDesign.prompt} [text: "${textOverlay.text.trim()}"]`
        : currentDesign.prompt;

      const res = await fetch("/api/save-composite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData,
          prompt: promptWithText,
          style: currentDesign.style,
          colors: currentDesign.colors,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCurrentDesign(data.design);
      setDesigns((prev) => [data.design, ...prev]);
      setShowTextEditor(false);
      setTextOverlay(DEFAULT_TEXT_OVERLAY);

      // Fetch new Printify mockups for the composite design
      fetchPrintifyMockups(data.design);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save composite design";
      setError(message);
    } finally {
      setSavingComposite(false);
    }
  }

  // Determine which mockup image to show
  const printifyMockupForColor = printifyData?.mockups[selectedShirtColor.printifyName];
  const hasPrintifyMockup = !!printifyMockupForColor;

  // The design image shown on the SVG fallback mockup
  const svgMockupImageUrl =
    showTextEditor && compositePreviewUrl
      ? compositePreviewUrl
      : currentDesign?.image_url;

  const sc = selectedShirtColor; // Shorthand for SVG usage

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hidden canvas for text compositing */}
      <canvas ref={canvasRef} className="hidden" />

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

          {/* Text Overlay Editor */}
          {showTextEditor && currentDesign && (
            <div className="mt-6 p-5 border border-accent/30 rounded-xl bg-surface-raised space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <Type className="w-4 h-4 text-accent" />
                  Text Overlay
                </h3>
                <button
                  onClick={() => {
                    setShowTextEditor(false);
                    setTextOverlay(DEFAULT_TEXT_OVERLAY);
                    setCompositePreviewUrl(null);
                  }}
                  className="text-muted-foreground hover:text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Text input */}
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">
                  Text
                </label>
                <input
                  type="text"
                  value={textOverlay.text}
                  onChange={(e) =>
                    setTextOverlay((prev) => ({
                      ...prev,
                      text: e.target.value.slice(0, 100),
                    }))
                  }
                  placeholder="Enter text to add..."
                  maxLength={100}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-primary placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {textOverlay.text.length}/100
                </p>
              </div>

              {/* Font selector + size */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">
                    Font
                  </label>
                  <select
                    value={textOverlay.font}
                    onChange={(e) =>
                      setTextOverlay((prev) => ({
                        ...prev,
                        font: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">
                    Size: {textOverlay.fontSize}px
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={textOverlay.fontSize}
                    onChange={(e) =>
                      setTextOverlay((prev) => ({
                        ...prev,
                        fontSize: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-accent mt-1"
                  />
                </div>
              </div>

              {/* Color picker + Bold/Italic */}
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">
                    Text Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={textOverlay.color}
                      onChange={(e) =>
                        setTextOverlay((prev) => ({
                          ...prev,
                          color: e.target.value,
                        }))
                      }
                      className="w-10 h-10 rounded border border-border cursor-pointer bg-transparent"
                    />
                    <span className="text-xs text-muted-foreground font-mono">
                      {textOverlay.color.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setTextOverlay((prev) => ({ ...prev, bold: !prev.bold }))
                    }
                    className={`p-2 rounded-lg border text-sm transition-colors ${
                      textOverlay.bold
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-muted-foreground hover:text-primary"
                    }`}
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTextOverlay((prev) => ({
                        ...prev,
                        italic: !prev.italic,
                      }))
                    }
                    className={`p-2 rounded-lg border text-sm transition-colors ${
                      textOverlay.italic
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-muted-foreground hover:text-primary"
                    }`}
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Free Position X/Y */}
              <div>
                <label className="flex items-center gap-2 text-xs font-medium mb-1 text-muted-foreground">
                  <Move className="w-3 h-3" />
                  Position
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-0.5">
                      <span>X</span>
                      <span>{textOverlay.x}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={textOverlay.x}
                      onChange={(e) =>
                        setTextOverlay((prev) => ({
                          ...prev,
                          x: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-accent"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-0.5">
                      <span>Y</span>
                      <span>{textOverlay.y}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={textOverlay.y}
                      onChange={(e) =>
                        setTextOverlay((prev) => ({
                          ...prev,
                          y: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Alignment + Outline */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">
                    Alignment
                  </label>
                  <div className="flex gap-2">
                    {(
                      [
                        { value: "left", icon: AlignLeft },
                        { value: "center", icon: AlignCenter },
                        { value: "right", icon: AlignRight },
                      ] as const
                    ).map(({ value, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setTextOverlay((prev) => ({ ...prev, align: value }))
                        }
                        className={`flex-1 py-2 rounded-lg border flex items-center justify-center transition-colors ${
                          textOverlay.align === value
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border text-muted-foreground hover:text-primary"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">
                    Outline
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setTextOverlay((prev) => ({
                        ...prev,
                        outline: !prev.outline,
                      }))
                    }
                    className={`w-full py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                      textOverlay.outline
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-muted-foreground hover:text-primary"
                    }`}
                  >
                    {textOverlay.outline ? "ON" : "OFF"}
                  </button>
                </div>
              </div>

              {/* Save button */}
              <button
                onClick={handleSaveComposite}
                disabled={savingComposite || !textOverlay.text.trim()}
                className="w-full bg-accent text-accent-foreground py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {savingComposite ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {savingComposite
                  ? "Saving..."
                  : "Save Design with Text"}
              </button>
            </div>
          )}

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
                      setShowTextEditor(false);
                      setTextOverlay(DEFAULT_TEXT_OVERLAY);
                      setCompositePreviewUrl(null);
                      setPrintifyData(null);
                      // Fetch Printify mockups for this gallery design
                      fetchPrintifyMockups(design);
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
              {/* Shirt Color Selector */}
              <div className="mb-3">
                <label className="flex items-center gap-2 text-sm font-semibold mb-2 text-primary">
                  <Palette className="w-4 h-4 text-accent" />
                  Shirt Color
                </label>
                <div className="flex gap-2">
                  {SHIRT_COLORS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedShirtColor(color)}
                      title={color.name}
                      className={`relative w-9 h-9 rounded-full border-2 transition-all ${
                        selectedShirtColor.name === color.name
                          ? "border-accent scale-110 ring-2 ring-accent/30"
                          : "border-border hover:scale-105"
                      }`}
                      style={{ backgroundColor: color.fill }}
                    >
                      {selectedShirtColor.name === color.name && (
                        <Check
                          className={`w-4 h-4 absolute inset-0 m-auto ${
                            color.isLight ? "text-gray-700" : "text-white"
                          }`}
                        />
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedShirtColor.name}
                  {loadingMockups && " — generating mockup..."}
                  {hasPrintifyMockup && (
                    <span className="inline-flex items-center gap-1 ml-1 text-accent">
                      <ImageIcon className="w-3 h-3" /> Printify
                    </span>
                  )}
                </p>
              </div>

              {/* Mockup Display */}
              <div className="border border-border rounded-xl overflow-hidden bg-gradient-to-b from-[#e8e8ec] to-[#d1d1d8] relative aspect-square flex items-center justify-center">
                {loadingMockups && (
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-surface/80 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading Printify mockup...
                  </div>
                )}

                {hasPrintifyMockup ? (
                  /* Printify photorealistic mockup */
                  <img
                    src={printifyMockupForColor}
                    alt={`${selectedShirtColor.name} t-shirt mockup`}
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  /* SVG fallback mockup */
                  <svg
                    viewBox="0 0 400 480"
                    className="w-full h-full drop-shadow-lg p-4"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <filter id="fabric" x="-5%" y="-5%" width="110%" height="110%">
                        <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="6" seed="5" result="noise" />
                        <feColorMatrix type="saturate" values="0" in="noise" result="gray" />
                        <feBlend in="SourceGraphic" in2="gray" mode="multiply" result="tex" />
                        <feComposite in="tex" in2="SourceGraphic" operator="in" />
                      </filter>
                      <linearGradient id="sleeve-l" x1="0" y1="0" x2="1" y2="0.3">
                        <stop offset="0%" stopColor={sc.foldDark} />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                      <linearGradient id="sleeve-r" x1="1" y1="0" x2="0" y2="0.3">
                        <stop offset="0%" stopColor={sc.foldDark} />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                      <linearGradient id="center-hl" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="transparent" />
                        <stop offset="35%" stopColor={sc.foldLight} />
                        <stop offset="65%" stopColor="transparent" />
                      </linearGradient>
                      <linearGradient id="body-v" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={sc.foldLight} />
                        <stop offset="40%" stopColor="transparent" />
                        <stop offset="100%" stopColor={sc.foldDark} />
                      </linearGradient>
                      <radialGradient id="chest-hl" cx="50%" cy="35%" r="35%">
                        <stop offset="0%" stopColor={sc.foldLight} />
                        <stop offset="100%" stopColor="transparent" />
                      </radialGradient>
                      <clipPath id="shirt-shape">
                        <path d="M105,62 L62,82 L18,148 L72,168 L92,115 L88,420 L312,420 L308,115 L328,168 L382,148 L338,82 L295,62 L258,48 Q232,82 200,82 Q168,82 142,48 Z" />
                      </clipPath>
                      <clipPath id="print-area">
                        <rect x="110" y="105" width="180" height="200" rx="4" />
                      </clipPath>
                    </defs>
                    <ellipse cx="200" cy="448" rx="140" ry="12" fill="rgba(0,0,0,0.10)" />
                    <path
                      d="M105,62 L62,82 L18,148 L72,168 L92,115 L88,420 L312,420 L308,115 L328,168 L382,148 L338,82 L295,62 L258,48 Q232,82 200,82 Q168,82 142,48 Z"
                      fill={sc.fill}
                      stroke={sc.stroke}
                      strokeWidth="1"
                      filter="url(#fabric)"
                    />
                    <g clipPath="url(#shirt-shape)">
                      <rect x="85" y="60" width="230" height="365" fill="url(#body-v)" opacity="0.25" />
                      <rect x="85" y="60" width="230" height="365" fill="url(#chest-hl)" opacity="0.2" />
                      <rect x="85" y="100" width="70" height="320" fill="url(#sleeve-l)" opacity="0.4" />
                      <rect x="245" y="100" width="70" height="320" fill="url(#sleeve-r)" opacity="0.4" />
                      <rect x="175" y="80" width="50" height="340" fill="url(#center-hl)" opacity="0.3" />
                      <path d="M62,82 L92,115 L87,175 L52,125 Z" fill={sc.foldDark} opacity="0.25" />
                      <path d="M338,82 L308,115 L313,175 L348,125 Z" fill={sc.foldDark} opacity="0.25" />
                      <path d="M110,185 Q200,190 290,183" fill="none" stroke={sc.foldDark} strokeWidth="0.6" opacity="0.2" />
                      <path d="M115,250 Q195,256 285,248" fill="none" stroke={sc.foldDark} strokeWidth="0.5" opacity="0.18" />
                      <path d="M108,320 Q200,326 292,318" fill="none" stroke={sc.foldDark} strokeWidth="0.5" opacity="0.15" />
                      <path d="M95,120 Q130,170 145,230" fill="none" stroke={sc.foldDark} strokeWidth="0.5" opacity="0.15" />
                      <path d="M305,120 Q270,170 255,230" fill="none" stroke={sc.foldDark} strokeWidth="0.5" opacity="0.15" />
                    </g>
                    <path d="M142,48 Q168,80 200,80 Q232,80 258,48" fill="none" stroke={sc.stroke} strokeWidth="2" />
                    <path d="M147,52 Q170,74 200,74 Q230,74 253,52" fill="none" stroke={sc.foldDark} strokeWidth="1.5" opacity="0.4" />
                    <line x1="88" y1="115" x2="88" y2="420" stroke={sc.stroke} strokeWidth="0.4" opacity="0.3" />
                    <line x1="312" y1="115" x2="312" y2="420" stroke={sc.stroke} strokeWidth="0.4" opacity="0.3" />
                    <image
                      href={svgMockupImageUrl}
                      x="110"
                      y="105"
                      width="180"
                      height="200"
                      preserveAspectRatio="xMidYMid meet"
                      clipPath="url(#print-area)"
                      opacity="0.9"
                      style={{ mixBlendMode: "multiply" }}
                    />
                    <rect
                      x="110"
                      y="105"
                      width="180"
                      height="200"
                      fill="url(#center-hl)"
                      clipPath="url(#print-area)"
                      opacity="0.08"
                    />
                  </svg>
                )}
              </div>

              {/* Mockup status */}
              {mockupError && (
                <p className="text-xs text-muted-foreground mt-1">
                  Printify unavailable — using preview mockup
                </p>
              )}

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

              {/* Add Text button */}
              {!showTextEditor && (
                <button
                  onClick={() => setShowTextEditor(true)}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-surface-raised transition-colors text-primary"
                >
                  <Type className="w-4 h-4" />
                  Add Text
                </button>
              )}

              {/* Publish / Download */}
              <div className="flex gap-2 mt-2">
                {hasShop ? (
                  <Link
                    href={`/product/new?design=${currentDesign.id}${printifyData ? `&printifyProduct=${printifyData.printifyProductId}` : ""}`}
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
