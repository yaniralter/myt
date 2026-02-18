export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "buyer" | "seller" | "admin";
  created_at: string;
  updated_at: string;
}

export interface Shop {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  bio: string | null;
  banner_url: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Design {
  id: string;
  user_id: string;
  prompt: string;
  style: string | null;
  colors: string[] | null;
  image_url: string;
  created_at: string;
}

export interface Product {
  id: string;
  shop_id: string;
  design_id: string | null;
  title: string;
  description: string | null;
  price: number; // in cents
  image_url: string;
  printify_product_id: string | null;
  is_published: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  shop?: Shop;
}

export type TShirtSize = "S" | "M" | "L" | "XL" | "2XL";

export const T_SHIRT_SIZES: TShirtSize[] = ["S", "M", "L", "XL", "2XL"];

// Printify variant IDs for Gildan Ultra Cotton Tee (Blueprint 6)
export const SIZE_TO_VARIANT_ID: Record<TShirtSize, number> = {
  S: 17116,
  M: 17117,
  L: 17118,
  XL: 17119,
  "2XL": 17120,
};

export interface Order {
  id: string;
  buyer_id: string | null;
  product_id: string | null;
  shop_id: string | null;
  rapyd_payment_id: string | null;
  printify_order_id: string | null;
  total_amount: number;
  platform_fee: number;
  seller_amount: number;
  size: TShirtSize | null;
  status: "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled";
  shipping_address: Record<string, string> | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  product?: Product;
}
