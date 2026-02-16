"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Store, Loader2, Upload } from "lucide-react";

export default function NewShopPage() {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  }

  function generateSlug(shopName: string) {
    return shopName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in");
      setLoading(false);
      return;
    }

    let bannerUrl = "";
    if (bannerFile) {
      const fileExt = bannerFile.name.split(".").pop();
      const filePath = `banners/${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("shop-assets")
        .upload(filePath, bannerFile);

      if (uploadError) {
        setError("Failed to upload banner image");
        setLoading(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("shop-assets").getPublicUrl(filePath);
      bannerUrl = publicUrl;
    }

    const slug = generateSlug(name);

    const { error: insertError } = await supabase.from("shops").insert({
      owner_id: user.id,
      name,
      slug,
      bio,
      banner_url: bannerUrl || null,
    });

    if (insertError) {
      if (insertError.message.includes("duplicate")) {
        setError("A shop with this name already exists. Try a different name.");
      } else {
        setError(insertError.message);
      }
      setLoading(false);
      return;
    }

    // Update profile role to seller
    await supabase
      .from("profiles")
      .update({ role: "seller" })
      .eq("id", user.id);

    router.push("/seller-dashboard");
    router.refresh();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <Store className="w-10 h-10 mx-auto mb-3 text-accent" />
        <h1 className="text-2xl font-bold text-primary">Open Your Shop</h1>
        <p className="text-muted-foreground mt-1">
          Set up your shop and start selling custom t-shirts
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20">
            {error}
          </div>
        )}

        {/* Banner upload */}
        <div>
          <label className="block text-sm font-medium mb-2 text-primary">
            Shop Banner
          </label>
          <div
            className="relative border-2 border-dashed border-border rounded-lg overflow-hidden cursor-pointer hover:border-accent transition-colors"
            onClick={() =>
              document.getElementById("banner-input")?.click()
            }
          >
            {bannerPreview ? (
              <img
                src={bannerPreview}
                alt="Banner preview"
                className="w-full h-48 object-cover"
              />
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground bg-surface">
                <Upload className="w-8 h-8 mb-2" />
                <p className="text-sm">Click to upload a banner image</p>
                <p className="text-xs mt-1">Recommended: 1200x400px</p>
              </div>
            )}
            <input
              id="banner-input"
              type="file"
              accept="image/*"
              onChange={handleBannerChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Shop name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1 text-primary">
            Shop Name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={50}
            className="w-full px-3 py-2 bg-surface-raised border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-primary placeholder:text-muted-foreground"
            placeholder="My Awesome T-Shirt Shop"
          />
          {name && (
            <p className="text-xs text-muted-foreground mt-1">
              URL: myt.com/shop/{generateSlug(name)}
            </p>
          )}
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium mb-1 text-primary">
            Shop Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            rows={4}
            className="w-full px-3 py-2 bg-surface-raised border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-primary placeholder:text-muted-foreground resize-none"
            placeholder="Tell customers about your shop and what makes your designs special..."
          />
          <p className="text-xs text-muted-foreground mt-1">
            {bio.length}/500 characters
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !name}
          className="w-full bg-accent text-accent-foreground py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Store className="w-4 h-4" />
          )}
          {loading ? "Creating shop..." : "Create Shop"}
        </button>
      </form>
    </div>
  );
}
