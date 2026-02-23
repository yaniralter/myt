import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createProductAndGetMockups } from "@/lib/printify";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { imageUrl, title, designId } = (await request.json()) as {
    imageUrl: string;
    title: string;
    designId?: string;
  };

  if (!imageUrl || !title) {
    return NextResponse.json(
      { error: "imageUrl and title are required" },
      { status: 400 }
    );
  }

  // Check if Printify is configured
  if (!process.env.PRINTIFY_API_KEY || !process.env.PRINTIFY_SHOP_ID) {
    return NextResponse.json(
      { error: "Printify not configured" },
      { status: 503 }
    );
  }

  try {
    const result = await createProductAndGetMockups({
      title,
      description: `AI-generated design: ${title}`,
      imageUrl,
    });

    // If a designId was provided, store the Printify product ID in the design record
    // (We'll add a printify_product_id column if needed, but for now just return it)
    console.log(
      `[Printify Mockups] Product ${result.printifyProductId} created with ${Object.keys(result.mockups).length} color mockups`
    );

    return NextResponse.json({
      printifyProductId: result.printifyProductId,
      mockups: result.mockups,
      defaultMockup: result.defaultMockup,
      designId,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to generate Printify mockups";
    console.error("[Printify Mockups] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
