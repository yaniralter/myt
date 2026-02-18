import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadFromBuffer } from "@/lib/cloudinary";

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const fullName = formData.get("full_name") as string | null;
  const avatarFile = formData.get("avatar") as File | null;

  const updates: Record<string, string> = {
    updated_at: new Date().toISOString(),
  };

  if (fullName !== null) {
    updates.full_name = fullName.trim();
  }

  // Upload avatar to Cloudinary if provided
  if (avatarFile && avatarFile.size > 0) {
    const buffer = Buffer.from(await avatarFile.arrayBuffer());
    const avatarUrl = await uploadFromBuffer(buffer, "myt-avatars");
    updates.avatar_url = avatarUrl;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }

  return NextResponse.json({ profile });
}
