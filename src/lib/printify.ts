const PRINTIFY_API_BASE = "https://api.printify.com/v1";

// Blueprint 6 = Unisex Gildan Ultra Cotton Tee 6400
// Print provider 99 = generic DTG provider
const BLUEPRINT_ID = 6;
const PRINT_PROVIDER_ID = 99;

// Known color-keyed variant IDs for Blueprint 6 / Provider 99
// Each entry maps a color name to an array of variant IDs (one per size S-2XL)
const COLOR_VARIANTS: Record<string, number[]> = {
  White: [17116, 17117, 17118, 17119, 17120],
  Black: [17390, 17391, 17392, 17393, 17394],
  "Sport Grey": [17350, 17351, 17352, 17353, 17354],
  Navy: [17308, 17309, 17310, 17311, 17312],
  Red: [17336, 17337, 17338, 17339, 17340],
};

// All variant IDs flattened (for product creation with all colors)
const ALL_VARIANT_IDS = Object.values(COLOR_VARIANTS).flat();

async function printifyFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${PRINTIFY_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.PRINTIFY_API_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Printify API error: ${res.status} - ${error}`);
  }

  return res.json();
}

/** Upload a design image to Printify's image library */
export async function uploadImageToPrintify(
  imageUrl: string,
  fileName: string = "design.png"
): Promise<{ id: string; preview_url: string }> {
  return printifyFetch("/uploads/images.json", {
    method: "POST",
    body: JSON.stringify({ file_name: fileName, url: imageUrl }),
  });
}

/** Create a Printify product with all color variants */
export async function createPrintifyProduct(params: {
  title: string;
  description: string;
  imageUrl: string;
  printifyImageId?: string;
}) {
  const shopId = process.env.PRINTIFY_SHOP_ID;

  const variants = ALL_VARIANT_IDS.map((id) => ({
    id,
    price: 0,
    is_enabled: true,
  }));

  // Use either the Printify-uploaded image ID or fall back to raw URL
  const imageEntry = params.printifyImageId
    ? { id: params.printifyImageId, x: 0.5, y: 0.5, scale: 1, angle: 0 }
    : { id: "design", src: params.imageUrl, x: 0.5, y: 0.5, scale: 1, angle: 0 };

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
          variant_ids: ALL_VARIANT_IDS,
          placeholders: [
            {
              position: "front",
              images: [imageEntry],
            },
          ],
        },
      ],
    }),
  });

  return product;
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
  const shopId = process.env.PRINTIFY_SHOP_ID;
  return printifyFetch(`/shops/${shopId}/products/${productId}.json`);
}

/**
 * Map mockup images to color names.
 * Printify product images have variant_ids — we match those to our color map.
 */
export function mapMockupsToColors(
  images: Array<{ src: string; variant_ids: number[]; position: string }>
): Record<string, string> {
  const colorMockups: Record<string, string> = {};

  for (const img of images) {
    if (img.position !== "front") continue;

    for (const [colorName, variantIds] of Object.entries(COLOR_VARIANTS)) {
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
 * Returns the Printify product ID and a mapping of color name → mockup image URL.
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
  // Step 1: Upload image to Printify
  let printifyImageId: string | undefined;
  try {
    const uploaded = await uploadImageToPrintify(params.imageUrl);
    printifyImageId = uploaded.id;
  } catch {
    console.warn("[Printify] Image upload failed, using raw URL fallback");
  }

  // Step 2: Create the product
  const product = await createPrintifyProduct({
    ...params,
    printifyImageId,
  });

  // Step 3: Map product images to colors
  const mockups = mapMockupsToColors(product.images || []);
  const defaultMockup =
    product.images?.find((img: { is_default: boolean }) => img.is_default)?.src ||
    product.images?.[0]?.src ||
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
  const shopId = process.env.PRINTIFY_SHOP_ID;

  const order = await printifyFetch(`/shops/${shopId}/orders.json`, {
    method: "POST",
    body: JSON.stringify({
      external_id: `myt-${Date.now()}`,
      line_items: [
        {
          product_id: params.productId,
          variant_id: params.variantId || 17118,
          quantity: 1,
        },
      ],
      shipping_method: 1,
      address_to: params.shippingAddress,
    }),
  });

  return order;
}

/** Exported color list for frontend use */
export const PRINTIFY_COLORS = Object.keys(COLOR_VARIANTS);
