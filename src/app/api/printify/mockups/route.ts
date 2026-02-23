import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createProductAndGetMockups,
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

  // Check if Printify API key is configured (shop ID is auto-discovered)
  if (!isPrintifyConfigured()) {
    console.warn(
      "[Printify Mockups] API key not configured. PRINTIFY_API_KEY:",
      process.env.PRINTIFY_API_KEY ? `set (${process.env.PRINTIFY_API_KEY.length} chars)` : "NOT SET"
    );
    return NextResponse.json(
      { error: "Printify not configured — set PRINTIFY_API_KEY in .env.local" },
      { status: 503 }
    );
  }

  try {
    console.log("[Printify Mockups] Starting mockup generation for:", title);
    console.log("[Printify Mockups] Image URL:", imageUrl.slice(0, 80) + "...");

    const result = await createProductAndGetMockups({
      title,
      description: `AI-generated design: ${title}`,
      imageUrl,
    });

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
    if (err instanceof Error && err.stack) {
      console.error("[Printify Mockups] Stack:", err.stack);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
