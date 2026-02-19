import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadFromBuffer } from "@/lib/cloudinary";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { imageData, prompt, style, colors } = body as {
    imageData: string; // base64 data URL
    prompt: string;
    style?: string;
    colors?: string[];
  };

  if (!imageData || !prompt) {
    return NextResponse.json(
      { error: "Image data and prompt are required" },
      { status: 400 }
    );
  }

  try {
    // Strip the data URL prefix to get raw base64
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Upload composite image to Cloudinary
    const imageUrl = await uploadFromBuffer(buffer, "myt-designs");

    // Ensure profile exists
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      await supabase.from("profiles").insert({
        id: user.id,
        email: user.email || "",
        full_name: user.user_metadata?.full_name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
      });
    }

    // Save as a new design
    const { data: design, error: insertError } = await supabase
      .from("designs")
      .insert({
        user_id: user.id,
        prompt: prompt.trim(),
        image_url: imageUrl,
        style: style || null,
        colors: colors || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[save-composite] Supabase insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save design: " + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ design });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to save composite design";
    console.error("[save-composite] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
