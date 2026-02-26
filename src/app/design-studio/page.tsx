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
  Upload,
  ZoomIn,
  ZoomOut,
  Wand2,
  History,
  Columns2,
  Shirt,
  PenTool,
  ChevronLeft,
  Info,
} from "lucide-react";
import type { Design } from "@/lib/types";

/* ─── Constants ─── */

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

interface ShirtColor {
  name: string;
  printifyName: string;
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
  fontSize: 80,
  color: "#1C1C1C",
  x: 50,
  y: 85,
  align: "center",
  bold: false,
  italic: false,
  outline: true,
};

interface PrintifyMockupData {
  printifyProductId: string;
  mockups: Record<string, string>;
  defaultMockup: string | null;
}

/* Version history entry */
interface DesignVersion {
  imageUrl: string;
  prompt: string;
  label: string;
  style: string | null;
  colors: string[] | null;
}

type StudioMode = "canvas" | "shirt";

/* ─── Component ─── */

export default function DesignStudioPage() {
  /* Generation controls */
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  /* Current design (may be unsaved) */
  const [currentDesign, setCurrentDesign] = useState<Design | null>(null);
  const [lastPromptUsed, setLastPromptUsed] = useState("");
  const [lastStyleUsed, setLastStyleUsed] = useState<string | null>(null);
  const [lastColorsUsed, setLastColorsUsed] = useState<string[]>([]);

  /* Gallery (saved designs from DB) */
  const [designs, setDesigns] = useState<Design[]>([]);
  const [hasShop, setHasShop] = useState(false);
  const supabase = createClient();

  /* Studio mode: canvas (default) or shirt preview */
  const [mode, setMode] = useState<StudioMode>("canvas");

  /* Canvas zoom */
  const [zoom, setZoom] = useState(100);

  /* Iterative refinement */
  const [refinementInput, setRefinementInput] = useState("");
  const [showRefinement, setShowRefinement] = useState(false);

  /* Version history (max 10) */
  const [versions, setVersions] = useState<DesignVersion[]>([]);
  const [activeVersionIndex, setActiveVersionIndex] = useState(0);

  /* Before/after comparison */
  const [showComparison, setShowComparison] = useState(false);

  /* Shirt color */
  const [selectedShirtColor, setSelectedShirtColor] = useState(SHIRT_COLORS[0]);

  /* Printify */
  const [printifyData, setPrintifyData] = useState<PrintifyMockupData | null>(null);
  const [loadingMockups, setLoadingMockups] = useState(false);
  const [mockupError, setMockupError] = useState("");

  /* Text overlay */
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [textOverlay, setTextOverlay] = useState<TextOverlay>(DEFAULT_TEXT_OVERLAY);
  const [savingComposite, setSavingComposite] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [compositePreviewUrl, setCompositePreviewUrl] = useState<string | null>(null);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

  /* Save state */
  const [isDesignSaved, setIsDesignSaved] = useState(false);
  const [savingToGallery, setSavingToGallery] = useState(false);

  /* Upload */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  /* ─── Effects ─── */

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
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

  useEffect(() => {
    setTextOverlay((prev) => ({
      ...prev,
      color: selectedShirtColor.isLight ? "#1C1C1C" : "#FFFFFF",
    }));
  }, [selectedShirtColor]);

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

  useEffect(() => {
    if (!currentDesign) { setLoadedImage(null); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setLoadedImage(img);
    img.onerror = () => setLoadedImage(null);
    img.src = currentDesign.image_url;
  }, [currentDesign?.image_url]);

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
      ctx.shadowColor = isTextDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.6)";
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
        if (ctx.measureText(testLine).width > maxWidth) {
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
        if (textOverlay.outline) ctx.strokeText(line, x, y);
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

  useEffect(() => { renderComposite(); }, [renderComposite]);

  /* ─── Helpers ─── */

  function toggleColor(colorName: string) {
    setSelectedColors((prev) => {
      if (prev.includes(colorName)) return prev.filter((c) => c !== colorName);
      if (prev.length >= 3) return prev;
      return [...prev, colorName];
    });
  }

  function addVersion(imageUrl: string, prompt: string, label: string, style: string | null, colors: string[] | null) {
    setVersions((prev) => {
      const next = [...prev, { imageUrl, prompt, label, style, colors }];
      if (next.length > 10) next.shift();
      return next;
    });
    // Set active to the newest
    setActiveVersionIndex((prev) => Math.min(prev + 1, 9));
  }

  function restoreVersion(index: number) {
    const v = versions[index];
    if (!v) return;
    const restored: Design = {
      id: `temp-${Date.now()}`,
      user_id: "",
      prompt: v.prompt,
      image_url: v.imageUrl,
      style: v.style,
      colors: v.colors,
      created_at: new Date().toISOString(),
    };
    setCurrentDesign(restored);
    setActiveVersionIndex(index);
    setIsDesignSaved(false);
    setLastPromptUsed(v.prompt);
    setCompositePreviewUrl(null);
  }

  /* ─── Printify ─── */

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

  /* ─── Generate / Refine ─── */

  async function generateDesign(designPrompt: string, style: string | null, colors: string[], versionLabel?: string) {
    if (!designPrompt.trim()) return;
    setError("");
    setGenerating(true);
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

      const tempDesign: Design = {
        id: `temp-${Date.now()}`,
        user_id: "",
        prompt: data.prompt,
        image_url: data.imageUrl,
        style: data.style,
        colors: data.colors,
        created_at: new Date().toISOString(),
      };

      setCurrentDesign(tempDesign);
      setIsDesignSaved(false);
      setLastPromptUsed(designPrompt.trim());
      setLastStyleUsed(style);
      setLastColorsUsed(colors);
      setMode("canvas");

      // Add to version history
      const label = versionLabel || `V${versions.length + 1}`;
      addVersion(data.imageUrl, data.prompt, label, data.style, data.colors);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate design");
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    // Reset version history for a brand new generation
    setVersions([]);
    setActiveVersionIndex(0);
    setShowRefinement(false);
    setShowComparison(false);
    await generateDesign(prompt, selectedStyle, selectedColors, "V1");
    setPrompt("");
  }

  async function handleRegenerate() {
    if (!lastPromptUsed) return;
    await generateDesign(lastPromptUsed, lastStyleUsed, lastColorsUsed, `V${versions.length + 1}`);
  }

  async function handleVariation() {
    if (!lastPromptUsed) return;
    const modifier = VARIATION_MODIFIERS[Math.floor(Math.random() * VARIATION_MODIFIERS.length)];
    const variedPrompt = `${lastPromptUsed}, ${modifier}`;
    await generateDesign(variedPrompt, lastStyleUsed, lastColorsUsed, `V${versions.length + 1}`);
  }

  async function handleRefine() {
    if (!refinementInput.trim() || !lastPromptUsed) return;
    const refinedPrompt = `${lastPromptUsed}, ${refinementInput.trim()}, maintaining the same composition`;
    await generateDesign(refinedPrompt, lastStyleUsed, lastColorsUsed, `V${versions.length + 1}`);
    setRefinementInput("");
  }

  /* ─── Save / Upload ─── */

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
      setIsDesignSaved(true);
      setShowTextEditor(false);
      setTextOverlay(DEFAULT_TEXT_OVERLAY);
      fetchPrintifyMockups(data.design);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save composite design");
    } finally {
      setSavingComposite(false);
    }
  }

  async function handleSaveToGallery() {
    if (!currentDesign || isDesignSaved) return;
    setError("");
    setSavingToGallery(true);
    try {
      const res = await fetch("/api/save-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: currentDesign.image_url,
          prompt: currentDesign.prompt,
          style: currentDesign.style,
          colors: currentDesign.colors,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCurrentDesign(data.design);
      setDesigns((prev) => [data.design, ...prev]);
      setIsDesignSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save design");
    } finally {
      setSavingToGallery(false);
    }
  }

  async function handleUploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    setCompositePreviewUrl(null);
    setPrintifyData(null);
    setMockupError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload-design", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const tempDesign: Design = {
        id: `temp-${Date.now()}`,
        user_id: "",
        prompt: file.name.replace(/\.[^.]+$/, ""),
        image_url: data.imageUrl,
        style: null,
        colors: null,
        created_at: new Date().toISOString(),
      };
      setCurrentDesign(tempDesign);
      setIsDesignSaved(false);
      setMode("canvas");
      setVersions([{ imageUrl: data.imageUrl, prompt: tempDesign.prompt, label: "V1", style: null, colors: null }]);
      setActiveVersionIndex(0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  /* ─── Derived state ─── */

  const printifyMockupForColor = printifyData?.mockups[selectedShirtColor.printifyName];
  const hasPrintifyMockup = !!printifyMockupForColor;
  const svgMockupImageUrl =
    showTextEditor && compositePreviewUrl ? compositePreviewUrl : currentDesign?.image_url;
  const sc = selectedShirtColor;

  const previousVersion = activeVersionIndex > 0 ? versions[activeVersionIndex - 1] : null;
  const currentVersion = versions[activeVersionIndex] || null;

  /* ─── Render ─── */

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <PenTool className="w-6 h-6 text-accent" />
            AI Design Studio
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Generate, refine, and preview your designs
          </p>
        </div>
        {/* Mode toggle */}
        {currentDesign && (
          <div className="flex bg-surface-raised border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setMode("canvas")}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                mode === "canvas"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              <PenTool className="w-4 h-4" />
              Canvas
            </button>
            <button
              onClick={() => {
                setMode("shirt");
                if (currentDesign && !printifyData && !loadingMockups) {
                  fetchPrintifyMockups(currentDesign);
                }
              }}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                mode === "shirt"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              <Shirt className="w-4 h-4" />
              Preview on Shirt
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20 mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* ═══════ Main area ═══════ */}
        <div className="min-w-0">
          {/* Generation form — shown when no design yet */}
          {!currentDesign && !generating && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <form onSubmit={handleGenerate} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-primary">Design Prompt</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="A cosmic cat riding a skateboard through a neon galaxy..."
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-3 bg-surface-raised border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-primary placeholder:text-muted-foreground resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{prompt.length}/500</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-primary">Style Preset</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {STYLE_PRESETS.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setSelectedStyle(selectedStyle === style.id ? null : style.id)}
                        className={`flex flex-col items-center gap-1 py-3 px-2 rounded-lg border text-xs font-medium transition-all ${
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

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-primary">Color Palette</label>
                    <span className="text-xs text-muted-foreground">{selectedColors.length}/3</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_SWATCHES.map((color) => {
                      const isSelected = selectedColors.includes(color.name);
                      return (
                        <button
                          key={color.name}
                          type="button"
                          onClick={() => toggleColor(color.name)}
                          title={color.name}
                          className={`relative w-8 h-8 rounded-full border-2 transition-all ${
                            isSelected ? "border-primary scale-110 ring-2 ring-accent/30" : "border-border hover:scale-105"
                          } ${!isSelected && selectedColors.length >= 3 ? "opacity-40 cursor-not-allowed" : ""}`}
                          style={{ backgroundColor: color.hex }}
                        >
                          {isSelected && (
                            <Check className={`w-4 h-4 absolute inset-0 m-auto ${color.name === "Black" ? "text-white" : "text-primary-foreground"}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!prompt.trim()}
                    className="flex-1 bg-accent text-accent-foreground py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate Design
                  </button>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-3 border border-border rounded-lg font-medium hover:bg-surface-raised transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-primary text-sm"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploading ? "Uploading..." : "Upload"}
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUploadImage} className="hidden" />
              </form>

              {/* Empty state placeholder */}
              <div className="border border-dashed border-border rounded-xl bg-surface aspect-video flex flex-col items-center justify-center gap-3 text-center px-8">
                <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-accent" />
                </div>
                <p className="font-medium text-sm text-primary">Your design preview</p>
                <p className="text-xs text-muted-foreground">
                  Enter a prompt, choose a style, and hit Generate to start designing.
                </p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {generating && (
            <div className="border border-border rounded-xl bg-surface flex flex-col items-center justify-center gap-4 py-32">
              <Loader2 className="w-10 h-10 animate-spin text-accent" />
              <div className="text-center">
                <p className="font-medium text-sm text-primary">
                  {versions.length > 0 ? "Refining your design..." : "Creating your design"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">This usually takes 10-20 seconds</p>
              </div>
            </div>
          )}

          {/* ═══ CANVAS MODE ═══ */}
          {currentDesign && !generating && mode === "canvas" && (
            <div className="space-y-4">
              {/* Canvas toolbar */}
              <div className="flex items-center justify-between bg-surface-raised border border-border rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  {/* Zoom controls */}
                  <button
                    onClick={() => setZoom((z) => Math.max(50, z - 25))}
                    className="p-1.5 rounded hover:bg-surface transition-colors text-muted-foreground hover:text-primary"
                    title="Zoom out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono text-muted-foreground w-12 text-center">{zoom}%</span>
                  <button
                    onClick={() => setZoom((z) => Math.min(200, z + 25))}
                    className="p-1.5 rounded hover:bg-surface transition-colors text-muted-foreground hover:text-primary"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setZoom(100)}
                    className="text-xs text-muted-foreground hover:text-primary px-2 py-1 rounded hover:bg-surface transition-colors"
                  >
                    Fit
                  </button>
                  <div className="w-px h-5 bg-border mx-1" />
                  {/* Compare toggle */}
                  {previousVersion && (
                    <button
                      onClick={() => setShowComparison((v) => !v)}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                        showComparison
                          ? "bg-accent/10 text-accent border border-accent/30"
                          : "text-muted-foreground hover:text-primary hover:bg-surface"
                      }`}
                    >
                      <Columns2 className="w-3.5 h-3.5" />
                      Compare
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="w-3.5 h-3.5" />
                  1024 x 1024px
                </div>
              </div>

              {/* Canvas area */}
              {showComparison && previousVersion ? (
                /* Before/After comparison */
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground text-center">
                      Before ({previousVersion.label})
                    </div>
                    <div className="border border-border rounded-xl overflow-hidden bg-[#f0f0f0] flex items-center justify-center" style={{ minHeight: 300 }}>
                      <img
                        src={previousVersion.imageUrl}
                        alt="Previous version"
                        className="max-w-full max-h-full object-contain"
                        style={{ width: `${zoom * 0.5}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-accent text-center">
                      After ({currentVersion?.label || "Current"})
                    </div>
                    <div className="border-2 border-accent/30 rounded-xl overflow-hidden bg-[#f0f0f0] flex items-center justify-center" style={{ minHeight: 300 }}>
                      <img
                        src={currentDesign.image_url}
                        alt="Current version"
                        className="max-w-full max-h-full object-contain"
                        style={{ width: `${zoom * 0.5}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Single canvas view */
                <div
                  className="border border-border rounded-xl overflow-auto bg-[#f0f0f0] flex items-center justify-center relative"
                  style={{ minHeight: 500 }}
                >
                  {/* Checkerboard pattern hint for transparency */}
                  <img
                    src={currentDesign.image_url}
                    alt={currentDesign.prompt}
                    className="transition-transform duration-200"
                    style={{
                      width: `${Math.min(zoom, 100)}%`,
                      maxWidth: `${zoom}%`,
                      imageRendering: zoom > 150 ? "pixelated" : "auto",
                    }}
                    draggable={false}
                  />
                </div>
              )}

              {/* Refinement bar */}
              <div className="bg-surface-raised border border-border rounded-lg p-3">
                {!showRefinement ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setShowRefinement(true)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      <Wand2 className="w-4 h-4" />
                      Refine Design
                    </button>
                    <button
                      onClick={handleRegenerate}
                      disabled={generating || !lastPromptUsed}
                      className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm font-medium hover:bg-surface transition-colors disabled:opacity-50 text-primary"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Regenerate
                    </button>
                    <button
                      onClick={handleVariation}
                      disabled={generating || !lastPromptUsed}
                      className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm font-medium hover:bg-surface transition-colors disabled:opacity-50 text-primary"
                    >
                      <Shuffle className="w-4 h-4" />
                      Variation
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={() => {
                        setMode("shirt");
                        if (!printifyData && !loadingMockups) fetchPrintifyMockups(currentDesign);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      <Shirt className="w-4 h-4" />
                      Preview on Shirt
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-accent flex-shrink-0" />
                      <span className="text-sm font-medium text-primary">What would you like to change?</span>
                      <button onClick={() => setShowRefinement(false)} className="ml-auto text-muted-foreground hover:text-primary">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={refinementInput}
                        onChange={(e) => setRefinementInput(e.target.value)}
                        placeholder="e.g. make it blue, add more contrast, remove background elements..."
                        onKeyDown={(e) => { if (e.key === "Enter") handleRefine(); }}
                        className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-primary placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      <button
                        onClick={handleRefine}
                        disabled={!refinementInput.trim() || generating}
                        className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        Apply
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Tip: Be specific. &quot;Make the background dark blue&quot; works better than &quot;change colors&quot;.
                    </p>
                  </div>
                )}
              </div>

              {/* Prompt info */}
              <p className="text-xs text-muted-foreground truncate">
                Prompt: &quot;{currentDesign.prompt}&quot;
              </p>

              {/* New design form (collapsed) */}
              <details className="bg-surface-raised border border-border rounded-lg">
                <summary className="px-4 py-3 text-sm font-medium text-primary cursor-pointer hover:text-accent flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Start a New Design
                </summary>
                <form onSubmit={handleGenerate} className="px-4 pb-4 space-y-3">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your new design..."
                    rows={2}
                    maxLength={500}
                    disabled={generating}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-primary placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={generating || !prompt.trim()}
                      className="flex-1 bg-accent text-accent-foreground py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate
                    </button>
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 border border-border rounded-lg text-sm hover:bg-surface transition-colors disabled:opacity-50 flex items-center gap-1.5 text-primary"
                    >
                      <Upload className="w-4 h-4" />
                      Upload
                    </button>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUploadImage} className="hidden" />
                </form>
              </details>
            </div>
          )}

          {/* ═══ SHIRT PREVIEW MODE ═══ */}
          {currentDesign && !generating && mode === "shirt" && (
            <div className="space-y-4">
              {/* Back to canvas */}
              <button
                onClick={() => setMode("canvas")}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Canvas
              </button>

              {/* Shirt color selector */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Palette className="w-4 h-4 text-accent" />
                  Shirt Color
                </label>
                <div className="flex gap-2">
                  {SHIRT_COLORS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedShirtColor(color)}
                      title={color.name}
                      className={`relative w-8 h-8 rounded-full border-2 transition-all ${
                        selectedShirtColor.name === color.name
                          ? "border-accent scale-110 ring-2 ring-accent/30"
                          : "border-border hover:scale-105"
                      }`}
                      style={{ backgroundColor: color.fill }}
                    >
                      {selectedShirtColor.name === color.name && (
                        <Check className={`w-3.5 h-3.5 absolute inset-0 m-auto ${color.isLight ? "text-gray-700" : "text-white"}`} />
                      )}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {selectedShirtColor.name}
                  {loadingMockups && " — loading..."}
                  {hasPrintifyMockup && (
                    <span className="inline-flex items-center gap-1 ml-1 text-accent">
                      <ImageIcon className="w-3 h-3" /> Printify
                    </span>
                  )}
                </span>
              </div>

              {/* Mockup display */}
              <div className="border border-border rounded-xl overflow-hidden bg-gradient-to-b from-[#e8e8ec] to-[#d1d1d8] relative flex items-center justify-center" style={{ minHeight: 500 }}>
                {loadingMockups && (
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-surface/80 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading Printify mockup...
                  </div>
                )}

                {hasPrintifyMockup ? (
                  <img
                    src={printifyMockupForColor}
                    alt={`${selectedShirtColor.name} t-shirt mockup`}
                    className="w-full h-full object-contain p-4"
                    style={{ maxHeight: 600 }}
                  />
                ) : (
                  <svg viewBox="0 0 400 480" className="drop-shadow-lg p-4" style={{ maxHeight: 560, width: "auto" }} xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <filter id="fabric" x="-5%" y="-5%" width="110%" height="110%">
                        <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="6" seed="5" result="noise" />
                        <feColorMatrix type="saturate" values="0" in="noise" result="gray" />
                        <feBlend in="SourceGraphic" in2="gray" mode="multiply" result="tex" />
                        <feComposite in="tex" in2="SourceGraphic" operator="in" />
                      </filter>
                      <linearGradient id="sleeve-l" x1="0" y1="0" x2="1" y2="0.3"><stop offset="0%" stopColor={sc.foldDark} /><stop offset="100%" stopColor="transparent" /></linearGradient>
                      <linearGradient id="sleeve-r" x1="1" y1="0" x2="0" y2="0.3"><stop offset="0%" stopColor={sc.foldDark} /><stop offset="100%" stopColor="transparent" /></linearGradient>
                      <linearGradient id="center-hl" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="transparent" /><stop offset="35%" stopColor={sc.foldLight} /><stop offset="65%" stopColor="transparent" /></linearGradient>
                      <linearGradient id="body-v" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={sc.foldLight} /><stop offset="40%" stopColor="transparent" /><stop offset="100%" stopColor={sc.foldDark} /></linearGradient>
                      <radialGradient id="chest-hl" cx="50%" cy="35%" r="35%"><stop offset="0%" stopColor={sc.foldLight} /><stop offset="100%" stopColor="transparent" /></radialGradient>
                      <clipPath id="shirt-shape"><path d="M105,62 L62,82 L18,148 L72,168 L92,115 L88,420 L312,420 L308,115 L328,168 L382,148 L338,82 L295,62 L258,48 Q232,82 200,82 Q168,82 142,48 Z" /></clipPath>
                      <clipPath id="print-area"><rect x="110" y="105" width="180" height="200" rx="4" /></clipPath>
                    </defs>
                    <ellipse cx="200" cy="448" rx="140" ry="12" fill="rgba(0,0,0,0.10)" />
                    <path d="M105,62 L62,82 L18,148 L72,168 L92,115 L88,420 L312,420 L308,115 L328,168 L382,148 L338,82 L295,62 L258,48 Q232,82 200,82 Q168,82 142,48 Z" fill={sc.fill} stroke={sc.stroke} strokeWidth="1" filter="url(#fabric)" />
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
                    <image href={svgMockupImageUrl} x="110" y="105" width="180" height="200" preserveAspectRatio="xMidYMid meet" clipPath="url(#print-area)" opacity="0.9" style={{ mixBlendMode: "multiply" }} />
                    <rect x="110" y="105" width="180" height="200" fill="url(#center-hl)" clipPath="url(#print-area)" opacity="0.08" />
                  </svg>
                )}
              </div>

              {mockupError && (
                <p className="text-xs text-muted-foreground">
                  Printify unavailable — using preview mockup
                </p>
              )}

              {/* Text overlay editor (in shirt mode) */}
              {showTextEditor && (
                <div className="p-4 border border-accent/30 rounded-xl bg-surface-raised space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                      <Type className="w-4 h-4 text-accent" />
                      Text Overlay
                    </h3>
                    <button onClick={() => { setShowTextEditor(false); setTextOverlay(DEFAULT_TEXT_OVERLAY); setCompositePreviewUrl(null); }} className="text-muted-foreground hover:text-primary">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={textOverlay.text}
                    onChange={(e) => setTextOverlay((prev) => ({ ...prev, text: e.target.value.slice(0, 100) }))}
                    placeholder="Enter text to add..."
                    maxLength={100}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-primary placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={textOverlay.font}
                      onChange={(e) => setTextOverlay((prev) => ({ ...prev, font: e.target.value }))}
                      className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                    <div>
                      <span className="text-xs text-muted-foreground">Size: {textOverlay.fontSize}px</span>
                      <input type="range" min={20} max={200} value={textOverlay.fontSize} onChange={(e) => setTextOverlay((prev) => ({ ...prev, fontSize: Number(e.target.value) }))} className="w-full accent-accent" />
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="flex items-center gap-2">
                      <input type="color" value={textOverlay.color} onChange={(e) => setTextOverlay((prev) => ({ ...prev, color: e.target.value }))} className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent" />
                      <span className="text-xs text-muted-foreground font-mono">{textOverlay.color.toUpperCase()}</span>
                    </div>
                    <button type="button" onClick={() => setTextOverlay((prev) => ({ ...prev, bold: !prev.bold }))} className={`p-2 rounded-lg border text-sm transition-colors ${textOverlay.bold ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground"}`}><Bold className="w-4 h-4" /></button>
                    <button type="button" onClick={() => setTextOverlay((prev) => ({ ...prev, italic: !prev.italic }))} className={`p-2 rounded-lg border text-sm transition-colors ${textOverlay.italic ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground"}`}><Italic className="w-4 h-4" /></button>
                    <button type="button" onClick={() => setTextOverlay((prev) => ({ ...prev, outline: !prev.outline }))} className={`px-2 py-2 rounded-lg border text-xs font-medium transition-colors ${textOverlay.outline ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground"}`}>{textOverlay.outline ? "Outline ON" : "Outline OFF"}</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-0.5"><span>X</span><span>{textOverlay.x}%</span></div>
                      <input type="range" min={0} max={100} value={textOverlay.x} onChange={(e) => setTextOverlay((prev) => ({ ...prev, x: Number(e.target.value) }))} className="w-full accent-accent" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-0.5"><span>Y</span><span>{textOverlay.y}%</span></div>
                      <input type="range" min={0} max={100} value={textOverlay.y} onChange={(e) => setTextOverlay((prev) => ({ ...prev, y: Number(e.target.value) }))} className="w-full accent-accent" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {([{ value: "left", icon: AlignLeft }, { value: "center", icon: AlignCenter }, { value: "right", icon: AlignRight }] as const).map(({ value, icon: Icon }) => (
                      <button key={value} type="button" onClick={() => setTextOverlay((prev) => ({ ...prev, align: value }))} className={`flex-1 py-2 rounded-lg border flex items-center justify-center transition-colors ${textOverlay.align === value ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground"}`}><Icon className="w-4 h-4" /></button>
                    ))}
                  </div>
                  <button onClick={handleSaveComposite} disabled={savingComposite || !textOverlay.text.trim()} className="w-full bg-accent text-accent-foreground py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                    {savingComposite ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {savingComposite ? "Saving..." : "Save Design with Text"}
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {!showTextEditor && (
                  <button onClick={() => setShowTextEditor(true)} className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm font-medium hover:bg-surface-raised transition-colors text-primary">
                    <Type className="w-4 h-4" />
                    Add Text
                  </button>
                )}
                {!isDesignSaved && (
                  <button onClick={handleSaveToGallery} disabled={savingToGallery} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                    {savingToGallery ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {savingToGallery ? "Saving..." : "Save to Gallery"}
                  </button>
                )}
                {isDesignSaved && (
                  <span className="flex items-center gap-1 px-3 py-2 text-xs text-green-600"><Check className="w-3 h-3" /> Saved</span>
                )}
                {hasShop && isDesignSaved ? (
                  <Link href={`/product/new?design=${currentDesign.id}${printifyData ? `&printifyProduct=${printifyData.printifyProductId}` : ""}`} className="flex items-center gap-1.5 px-3 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:opacity-90">
                    <ShoppingBag className="w-4 h-4" />
                    Publish to Shop
                  </Link>
                ) : hasShop && !isDesignSaved ? (
                  <button disabled className="flex items-center gap-1.5 px-3 py-2 bg-accent/50 text-accent-foreground rounded-lg text-sm opacity-50 cursor-not-allowed">
                    <ShoppingBag className="w-4 h-4" />
                    Save first to publish
                  </button>
                ) : (
                  <Link href="/shop/new" className="flex items-center gap-1.5 px-3 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:opacity-90">
                    <ShoppingBag className="w-4 h-4" />
                    Open a Shop
                  </Link>
                )}
                <a href={currentDesign.image_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-primary hover:bg-surface-raised">
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* ═══════ Right sidebar ═══════ */}
        <div className="space-y-4 lg:border-l lg:border-border lg:pl-6">
          {/* Version History */}
          {versions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-primary flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-accent" />
                Version History
              </h3>
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {versions.map((v, i) => (
                  <button
                    key={`${v.label}-${i}`}
                    onClick={() => restoreVersion(i)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg border transition-colors text-left ${
                      i === activeVersionIndex
                        ? "border-accent bg-accent/10 ring-1 ring-accent/20"
                        : "border-border hover:border-accent/40 bg-surface"
                    }`}
                  >
                    <img
                      src={v.imageUrl}
                      alt={v.label}
                      className="w-14 h-14 rounded-md object-cover border border-border flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold ${i === activeVersionIndex ? "text-accent" : "text-muted-foreground"}`}>
                          {v.label}
                        </span>
                        {i === activeVersionIndex && (
                          <span className="text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full font-medium">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{v.prompt}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Gallery */}
          {designs.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-primary mb-3">Your Gallery</h3>
              <div className="grid grid-cols-3 gap-2">
                {designs.map((design) => (
                  <button
                    key={design.id}
                    onClick={() => {
                      setCurrentDesign(design);
                      setIsDesignSaved(true);
                      setLastPromptUsed(design.prompt);
                      setShowTextEditor(false);
                      setTextOverlay(DEFAULT_TEXT_OVERLAY);
                      setCompositePreviewUrl(null);
                      setPrintifyData(null);
                      setMode("canvas");
                      setVersions([{ imageUrl: design.image_url, prompt: design.prompt, label: "V1", style: design.style, colors: design.colors }]);
                      setActiveVersionIndex(0);
                      setShowComparison(false);
                    }}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                      currentDesign?.id === design.id
                        ? "border-accent ring-2 ring-accent/20"
                        : "border-border hover:border-accent/50"
                    }`}
                  >
                    <img src={design.image_url} alt={design.prompt} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
