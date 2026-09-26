import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const formData = await request.formData();
  const avatar = formData.get("avatar");
  if (!(avatar instanceof File)) {
    return Response.json({ error: "Choose an image to upload." }, { status: 400 });
  }
  if (!IMAGE_TYPES.has(avatar.type)) {
    return Response.json(
      { error: "Use a JPG, PNG, GIF or WebP image." },
      { status: 415 },
    );
  }
  if (avatar.size > MAX_AVATAR_SIZE) {
    return Response.json(
      { error: "The image must be 5 MB or smaller." },
      { status: 413 },
    );
  }

  try {
    const admin = createAdminClient();
    const extension = avatar.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await admin.storage
      .from("avatars")
      .upload(path, await avatar.arrayBuffer(), {
        cacheControl: "31536000",
        contentType: avatar.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = admin.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = data.publicUrl;
    const { error: profileError } = await admin.from("profiles").upsert({
      id: user.id,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    });

    if (profileError) throw profileError;
    return Response.json({ avatarUrl });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not upload the photo.";
    return Response.json({ error: message }, { status: 500 });
  }
}
