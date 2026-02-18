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
      // Fall back to the temporary URL if Cloudinary upload fails
      permanentUrl = tempImageUrl;
    }

    // Save the design to database with the permanent Cloudinary URL
    const { data: design, error: insertError } = await supabase
      .from("designs")
      .insert({
        user_id: user.id,
        prompt: prompt.trim(),
        image_url: permanentUrl,
        style: style || null,
        colors: colors || null,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to save design" },
        { status: 500 }
      );
    }

    return NextResponse.json({ design });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to generate design";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
