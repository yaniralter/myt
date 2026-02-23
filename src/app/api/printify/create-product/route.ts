import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  uploadImageToPrintify,
  createPrintifyProduct,
  isPrintifyConfigured,
} from "@/lib/printify";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify user has a shop
  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!shop) {
    return NextResponse.json({ error: "No shop found" }, { status: 403 });
  }

  if (!isPrintifyConfigured()) {
    return NextResponse.json(
      { error: "Printify not configured" },
      { status: 503 }
    );
  }

  const { title, description, imageUrl } = await request.json();

  try {
    // Upload image to Printify first, then create product
    const uploaded = await uploadImageToPrintify(imageUrl);
    const { product } = await createPrintifyProduct({
      title,
      description: description || title,
      printifyImageId: uploaded.id,
    });

    return NextResponse.json({ productId: product.id });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create Printify product";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
