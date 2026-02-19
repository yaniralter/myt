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

type TextPosition = "top" | "center" | "bottom";
type TextAlign = "left" | "center" | "right";

interface TextOverlay {
  text: string;
  font: string;
  fontSize: number;
  color: string;
  position: TextPosition;
  align: TextAlign;
  bold: boolean;
  italic: boolean;
}

const DEFAULT_TEXT_OVERLAY: TextOverlay = {
  text: "",
  font: "Arial, sans-serif",
  fontSize: 40,
  color: "#FFFFFF",
  position: "bottom",
  align: "center",
  bold: false,
  italic: false,
};

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

  // Load the design image when currentDesign changes
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

    // Draw the original design image
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(loadedImage, 0, 0, size, size);

    // Draw text overlay if there's text
    if (textOverlay.text.trim()) {
      const fontWeight = textOverlay.bold ? "bold" : "normal";
      const fontStyle = textOverlay.italic ? "italic" : "normal";
      ctx.font = `${fontStyle} ${fontWeight} ${textOverlay.fontSize}px ${textOverlay.font}`;
      ctx.fillStyle = textOverlay.color;

      // Text alignment
      if (textOverlay.align === "left") {
        ctx.textAlign = "left";
      } else if (textOverlay.align === "right") {
        ctx.textAlign = "right";
      } else {
        ctx.textAlign = "center";
      }

      // Calculate X position based on alignment
      let x: number;
      if (textOverlay.align === "left") {
        x = 40;
      } else if (textOverlay.align === "right") {
        x = size - 40;
      } else {
        x = size / 2;
      }

      // Calculate Y position
      let y: number;
      if (textOverlay.position === "top") {
        y = textOverlay.fontSize + 30;
      } else if (textOverlay.position === "bottom") {
        y = size - 30;
      } else {
        y = size / 2 + textOverlay.fontSize / 3;
      }

      // Draw text shadow for readability
      ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // Word wrapping
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

      // Adjust Y for multi-line centering
      const lineHeight = textOverlay.fontSize * 1.2;
      const totalHeight = lines.length * lineHeight;
      if (textOverlay.position === "center") {
        y = (size - totalHeight) / 2 + textOverlay.fontSize;
      } else if (textOverlay.position === "top") {
        y = textOverlay.fontSize + 30;
      } else {
        y = size - totalHeight - 10 + textOverlay.fontSize;
      }

      for (const line of lines) {
        ctx.fillText(line, x, y);
        y += lineHeight;
      }

      // Reset shadow
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
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save composite design";
      setError(message);
    } finally {
      setSavingComposite(false);
    }
  }

  // The image to show on the mockup: composite preview when editing text, otherwise original
  const mockupImageUrl =
    showTextEditor && compositePreviewUrl
      ? compositePreviewUrl
      : currentDesign?.image_url;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hidden canvas for compositing */}
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

              {/* Position */}
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">
                  Position
                </label>
                <div className="flex gap-2">
                  {(["top", "center", "bottom"] as const).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() =>
                        setTextOverlay((prev) => ({ ...prev, position: pos }))
                      }
                      className={`flex-1 py-2 rounded-lg border text-xs font-medium capitalize transition-colors ${
                        textOverlay.position === pos
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border text-muted-foreground hover:text-primary"
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alignment */}
              <div>
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
                    href={mockupImageUrl}
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
