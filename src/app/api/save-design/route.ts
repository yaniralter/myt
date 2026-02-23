import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ensure the user has a profile row (foreign key for designs table)
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    const { error: profileError } = await supabase.from("profiles").insert({
      id: user.id,
      email: user.email || "",
      full_name: user.user_metadata?.full_name || null,
      avatar_url: user.user_metadata?.avatar_url || null,
    });
    if (profileError) {
      return NextResponse.json(
        { error: "Failed to initialize user profile: " + profileError.message },
        { status: 500 }
      );
    }
  }

  const { imageUrl, prompt, style, colors } = await request.json();

  if (!imageUrl || !prompt) {
    return NextResponse.json(
      { error: "imageUrl and prompt are required" },
      { status: 400 }
    );
  }

  const { data: design, error: insertError } = await supabase
    .from("designs")
    .insert({
      user_id: user.id,
      prompt,
      image_url: imageUrl,
      style: style || null,
      colors: colors || null,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: "Failed to save design: " + insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ design });
}
