const PRINTIFY_API_BASE = "https://api.printify.com/v1";

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

export async function createPrintifyProduct(params: {
  title: string;
  description: string;
  imageUrl: string;
}) {
  const shopId = process.env.PRINTIFY_SHOP_ID;

  // Blueprint 6 = Unisex Gildan Ultra Cotton Tee
  // Print provider 99 = generic DTG provider
  const product = await printifyFetch(`/shops/${shopId}/products.json`, {
    method: "POST",
    body: JSON.stringify({
      title: params.title,
      description: params.description,
      blueprint_id: 6,
      print_provider_id: 99,
      variants: [
        { id: 17116, price: 0, is_enabled: true }, // S
        { id: 17117, price: 0, is_enabled: true }, // M
        { id: 17118, price: 0, is_enabled: true }, // L
        { id: 17119, price: 0, is_enabled: true }, // XL
        { id: 17120, price: 0, is_enabled: true }, // 2XL
      ],
      print_areas: [
        {
          variant_ids: [17116, 17117, 17118, 17119, 17120],
          placeholders: [
            {
              position: "front",
              images: [
                {
                  id: "design",
                  src: params.imageUrl,
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

  return product;
}

export async function createPrintifyOrder(params: {
  productId: string;
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
          variant_id: 17118, // Default to L
          quantity: 1,
        },
      ],
      shipping_method: 1,
      address_to: params.shippingAddress,
    }),
  });

  return order;
}
