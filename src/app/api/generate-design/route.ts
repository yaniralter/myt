import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOpenAI, buildEnhancedPrompt } from "@/lib/openai";
import { uploadImage } from "@/lib/cloudinary";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { prompt, style, colors } = body as {
    prompt: string;
    style?: string;
    colors?: string[];
  };

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return NextResponse.json(
      { error: "Prompt is required" },
      { status: 400 }
    );
  }

  const enhancedPrompt = buildEnhancedPrompt(prompt.trim(), style, colors);
  console.log("[DALL-E] Prompt being sent:", enhancedPrompt);

  try {
    const response = await getOpenAI().images.generate({
      model: "dall-e-3",
      prompt: enhancedPrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const tempImageUrl = response.data?.[0]?.url;

    if (!tempImageUrl) {
      return NextResponse.json(
        { error: "Failed to generate image" },
        { status: 500 }
      );
    }

    // Upload to Cloudinary for permanent storage
    let permanentUrl: string;
    try {
      permanentUrl = await uploadImage(tempImageUrl, "myt-designs");
    } catch {
      permanentUrl = tempImageUrl;
    }

    // Return image data WITHOUT saving to database.
    // User must explicitly click "Save to Gallery" to persist.
    return NextResponse.json({
      imageUrl: permanentUrl,
      prompt: prompt.trim(),
      style: style || null,
      colors: colors || null,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to generate design";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
