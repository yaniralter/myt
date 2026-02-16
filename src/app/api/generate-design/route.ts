import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const STYLE_INSTRUCTIONS: Record<string, string> = {
  vintage:
    "retro vintage aesthetic, distressed texture, faded warm tones, hand-drawn feel, classic Americana style",
  minimalist:
    "clean minimalist design, simple geometric shapes, lots of negative space, single-weight line art, modern simplicity",
  streetwear:
    "bold streetwear graphic, urban culture inspired, high contrast, graffiti influence, edgy and contemporary",
  anime:
    "anime and manga inspired illustration, cel-shaded look, vibrant colors, dynamic pose, Japanese pop art style",
  abstract:
    "abstract artistic composition, bold shapes and forms, expressive brushstrokes, modern art inspired, visually striking",
  retro:
    "80s/90s retro style, neon colors, synthwave aesthetic, chrome effects, nostalgic pop culture vibes",
};

function buildEnhancedPrompt(
  userPrompt: string,
  style?: string,
  colors?: string[]
): string {
  const parts: string[] = [];

  parts.push(`T-shirt graphic design: ${userPrompt}.`);

  if (style && STYLE_INSTRUCTIONS[style]) {
    parts.push(`Art style: ${STYLE_INSTRUCTIONS[style]}.`);
  }

  if (colors && colors.length > 0) {
    const colorNames = colors.join(", ");
    parts.push(`Dominant color palette: ${colorNames}.`);
  }

  parts.push(
    "Clean vector graphic, transparent or solid white background, centered composition, suitable for screen printing, no text or lettering, high resolution, isolated design element."
  );

  return parts.join(" ");
}

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

    const imageUrl = response.data?.[0]?.url;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Failed to generate image" },
        { status: 500 }
      );
    }

    // Save the design to database
    const { data: design, error: insertError } = await supabase
      .from("designs")
      .insert({
        user_id: user.id,
        prompt: prompt.trim(),
        image_url: imageUrl,
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
