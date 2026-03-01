const PRINTIFY_API_BASE = "https://api.printify.com/v1";

// Blueprint 6 = Unisex Gildan Ultra Cotton Tee 6400
// Print provider 99 = generic DTG provider
const BLUEPRINT_ID = 6;
const PRINT_PROVIDER_ID = 99;

// Cached shop ID (auto-discovered on first use)
let _cachedShopId: string | null = null;

// Cached variant IDs per color (fetched from catalog on first use)
let _cachedColorVariants: Record<string, number[]> | null = null;

// Fallback variant IDs in case catalog fetch fails (White only, known-good)
const FALLBACK_WHITE_VARIANTS = [17116, 17117, 17118, 17119, 17120];

function getApiKey(): string {
  const key = process.env.PRINTIFY_API_KEY;
  if (!key) throw new Error("PRINTIFY_API_KEY is not set");
  return key;
}

async function printifyFetch(path: string, options: RequestInit = {}) {
  const url = `${PRINTIFY_API_BASE}${path}`;
  const method = options.method || "GET";
  console.log(`[Printify] ${method} ${url}`);

  const MAX_RETRIES = 3;
  const BACKOFF_MS = [2000, 4000, 8000];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${getApiKey()}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
        signal: AbortSignal.timeout(15000), // 15s timeout per request
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[Printify] ${res.status} response from ${url}:`, errorText);

        // Don't retry client errors (4xx) except 429 (rate limit)
        if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          throw new Error(`Printify API ${res.status}: ${errorText}`);
        }

        // Retry server errors and rate limits
        if (attempt < MAX_RETRIES) {
          const delay = BACKOFF_MS[attempt] || 8000;
          console.log(`[Printify] Retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        throw new Error(`Printify API ${res.status}: ${errorText}`);
      }

      return res.json();
    } catch (err) {
      const isNetworkError =
        err instanceof TypeError ||
        (err instanceof Error && (err.name === "AbortError" || err.message.includes("fetch failed")));

      if (isNetworkError && attempt < MAX_RETRIES) {
        const delay = BACKOFF_MS[attempt] || 8000;
        console.warn(`[Printify] Network error on attempt ${attempt + 1}, retrying in ${delay}ms...`, err instanceof Error ? err.message : err);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      throw err;
    }
  }

  throw new Error("Printify API: max retries exceeded");
}

/** Discover the shop ID from Printify API (auto-finds the user's first shop) */
async function resolveShopId(): Promise<string> {
  // 1. If we've already resolved it, return cached value
  if (_cachedShopId) return _cachedShopId;

  // 2. If env var is set and looks like a real ID (not a placeholder), use it
  const envShopId = process.env.PRINTIFY_SHOP_ID;
  if (envShopId && !envShopId.startsWith("your_") && envShopId.length > 3) {
    _cachedShopId = envShopId;
    return envShopId;
  }

  // 3. Auto-discover from the API
  console.log("[Printify] PRINTIFY_SHOP_ID is placeholder, auto-discovering...");
  const shops = await printifyFetch("/shops.json");

  if (!Array.isArray(shops) || shops.length === 0) {
    throw new Error(
      "No Printify shops found. Create a shop at printify.com first, then set PRINTIFY_SHOP_ID in .env.local"
    );
  }

  _cachedShopId = String(shops[0].id);
  console.log(`[Printify] Auto-discovered shop ID: ${_cachedShopId} (${shops[0].title})`);
  return _cachedShopId;
}

/**
 * Fetch variant IDs from the Printify catalog for Blueprint 6 / Provider 99.
 * Groups them by color name so we can create multi-color products.
 */
async function resolveColorVariants(): Promise<Record<string, number[]>> {
  if (_cachedColorVariants) return _cachedColorVariants;

  console.log("[Printify] Fetching catalog variants for blueprint 6 / provider 99...");

  try {
    const variants = await printifyFetch(
      `/catalog/blueprints/${BLUEPRINT_ID}/print_providers/${PRINT_PROVIDER_ID}/variants.json`
    );

    // Group variant IDs by color
    const colorMap: Record<string, number[]> = {};

    for (const v of variants) {
      // Printify variant objects have: id, title, options (with color, size)
      const color: string =
        v.options?.color || v.title?.split(" / ")?.[0] || "Unknown";

      if (!colorMap[color]) colorMap[color] = [];
      colorMap[color].push(v.id);
    }

    console.log(
      `[Printify] Found ${Object.keys(colorMap).length} colors:`,
      Object.keys(colorMap).join(", ")
    );

    _cachedColorVariants = colorMap;
    return colorMap;
  } catch (err) {
    console.warn("[Printify] Failed to fetch catalog variants:", err);
    // Return minimal fallback
    _cachedColorVariants = { White: FALLBACK_WHITE_VARIANTS };
    return _cachedColorVariants;
  }
}

/** Pick the best matching variant IDs for our target colors */
const TARGET_COLORS = ["White", "Black", "Sport Grey", "Navy", "Red"];

function pickTargetColorVariants(
  catalogColors: Record<string, number[]>
): { allVariantIds: number[]; colorVariants: Record<string, number[]> } {
  const colorVariants: Record<string, number[]> = {};
  const allVariantIds: number[] = [];

  for (const target of TARGET_COLORS) {
    // Try exact match first, then fuzzy
    const match =
      catalogColors[target] ||
      Object.entries(catalogColors).find(([k]) =>
        k.toLowerCase().includes(target.toLowerCase())
      )?.[1];

    if (match) {
      colorVariants[target] = match;
      allVariantIds.push(...match);
    }
  }

  // If nothing matched, at least use White or the first available color
  if (allVariantIds.length === 0) {
    const firstColor = Object.entries(catalogColors)[0];
    if (firstColor) {
      colorVariants[firstColor[0]] = firstColor[1];
      allVariantIds.push(...firstColor[1]);
    }
  }

  return { allVariantIds, colorVariants };
}

/** Upload a design image to Printify's image library */
export async function uploadImageToPrintify(
  imageUrl: string,
  fileName: string = "design.png"
): Promise<{ id: string; preview_url: string }> {
  console.log("[Printify] Uploading image:", imageUrl.slice(0, 80) + "...");
  return printifyFetch("/uploads/images.json", {
    method: "POST",
    body: JSON.stringify({ file_name: fileName, url: imageUrl }),
  });
}

/** Create a Printify product with resolved color variants */
export async function createPrintifyProduct(params: {
  title: string;
  description: string;
  printifyImageId: string;
}) {
  const shopId = await resolveShopId();
  const catalogColors = await resolveColorVariants();
  const { allVariantIds, colorVariants } = pickTargetColorVariants(catalogColors);

  console.log(
    `[Printify] Creating product with ${allVariantIds.length} variants across ${Object.keys(colorVariants).length} colors`
  );

  const variants = allVariantIds.map((id) => ({
    id,
    price: 0,
    is_enabled: true,
  }));

  const product = await printifyFetch(`/shops/${shopId}/products.json`, {
    method: "POST",
    body: JSON.stringify({
      title: params.title,
      description: params.description,
      blueprint_id: BLUEPRINT_ID,
      print_provider_id: PRINT_PROVIDER_ID,
      variants,
      print_areas: [
        {
          variant_ids: allVariantIds,
          placeholders: [
            {
              position: "front",
              images: [
                {
                  id: params.printifyImageId,
                  x: 0.5,
                  y: 0.5,
                  scale: 1,
                  angle: 0,
                },
              ],
            },
          ],
        },
      ],
    }),
  });

  return { product, colorVariants };
}

/** Fetch a product to get its images/mockups */
export async function getProduct(
  productId: string
): Promise<{
  id: string;
  title: string;
  images: Array<{
    src: string;
    variant_ids: number[];
    position: string;
    is_default: boolean;
  }>;
}> {
  const shopId = await resolveShopId();
  return printifyFetch(`/shops/${shopId}/products/${productId}.json`);
}

/**
 * Map mockup images to color names.
 * Printify product images have variant_ids — we match those to our resolved color map.
 */
export function mapMockupsToColors(
  images: Array<{ src: string; variant_ids: number[]; position: string }>,
  colorVariants: Record<string, number[]>
): Record<string, string> {
  const colorMockups: Record<string, string> = {};

  for (const img of images) {
    if (img.position !== "front") continue;

    for (const [colorName, variantIds] of Object.entries(colorVariants)) {
      const hasMatch = img.variant_ids.some((vid) => variantIds.includes(vid));
      if (hasMatch && !colorMockups[colorName]) {
        colorMockups[colorName] = img.src;
      }
    }
  }

  return colorMockups;
}

/**
 * Full workflow: upload image → create product → return mockup URLs per color.
 */
export async function createProductAndGetMockups(params: {
  title: string;
  description: string;
  imageUrl: string;
}): Promise<{
  printifyProductId: string;
  mockups: Record<string, string>;
  defaultMockup: string | null;
}> {
  // Step 1: Upload image to Printify (required — raw URLs are not supported)
  console.log("[Printify] Step 1: Uploading image to Printify...");
  const uploaded = await uploadImageToPrintify(params.imageUrl);
  console.log("[Printify] Image uploaded, ID:", uploaded.id);

  // Step 2: Create the product with all color variants
  console.log("[Printify] Step 2: Creating product...");
  const { product, colorVariants } = await createPrintifyProduct({
    title: params.title,
    description: params.description,
    printifyImageId: uploaded.id,
  });
  console.log("[Printify] Product created, ID:", product.id);

  // Step 3: Map product images to colors
  const images = product.images || [];
  console.log(`[Printify] Step 3: Product has ${images.length} mockup images`);

  const mockups = mapMockupsToColors(images, colorVariants);
  console.log("[Printify] Color mockups mapped:", Object.keys(mockups));

  const defaultMockup =
    images.find((img: { is_default: boolean }) => img.is_default)?.src ||
    images[0]?.src ||
    null;

  return {
    printifyProductId: product.id,
    mockups,
    defaultMockup,
  };
}

/** Create a Printify order for fulfillment */
export async function createPrintifyOrder(params: {
  productId: string;
  variantId?: number;
  shippingAddress: {
    first_name: string;
    last_name: string;
    email: string;
    address1: string;
    city: string;
    region: string;
    zip: string;
    country: string;
  };
}) {
  const shopId = await resolveShopId();

  const order = await printifyFetch(`/shops/${shopId}/orders.json`, {
    method: "POST",
    body: JSON.stringify({
      external_id: `myt-${Date.now()}`,
      line_items: [
        {
          product_id: params.productId,
          variant_id: params.variantId || FALLBACK_WHITE_VARIANTS[2], // default to L
          quantity: 1,
        },
      ],
      shipping_method: 1,
      address_to: params.shippingAddress,
    }),
  });

  return order;
}

/** Check if Printify API key is configured */
export function isPrintifyConfigured(): boolean {
  const key = process.env.PRINTIFY_API_KEY;
  return !!key && key.length > 10 && !key.startsWith("your_");
}

/** Exported target color names for frontend use */
export const PRINTIFY_COLORS = TARGET_COLORS;
