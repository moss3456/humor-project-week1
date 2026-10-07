import {
  describeImage,
  generateCaptions,
  getCaptionModel,
  isCaptionGenerationConfigured,
} from "@/lib/ai/captions";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const MAX_IMAGE_SIZE = 4 * 1024 * 1024;
const MAX_UPLOADS_PER_HOUR = 5;
const IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function safeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "Caption generation is not configured yet.") {
      return error.message;
    }
    if (error.message.toLowerCase().includes("content")) {
      return "That image could not be captioned safely. Try a different one.";
    }
  }

  return "The writers' room hit a snag. Please try again.";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  if (!isCaptionGenerationConfigured()) {
    return Response.json(
      { error: "Caption generation is not configured yet." },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const image = formData.get("image");
  if (!(image instanceof File)) {
    return Response.json({ error: "Choose an image to caption." }, { status: 400 });
  }

  const extension = IMAGE_TYPES.get(image.type);
  if (!extension) {
    return Response.json(
      { error: "Use a JPG, PNG, or WebP image." },
      { status: 415 },
    );
  }
  if (image.size === 0 || image.size > MAX_IMAGE_SIZE) {
    return Response.json(
      { error: "The image must be smaller than 4 MB." },
      { status: 413 },
    );
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("images")
    .select("id", { count: "exact", head: true })
    .eq("uploader_id", user.id)
    .gte("created_at", oneHourAgo);

  if (countError) {
    return Response.json(
      { error: "The caption database is not ready yet." },
      { status: 503 },
    );
  }
  if ((count ?? 0) >= MAX_UPLOADS_PER_HOUR) {
    return Response.json(
      { error: "You have reached the five-image hourly limit." },
      { status: 429 },
    );
  }

  const storagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("caption-images")
    .upload(storagePath, await image.arrayBuffer(), {
      cacheControl: "31536000",
      contentType: image.type,
      upsert: false,
    });

  if (uploadError) {
    return Response.json(
      { error: "The image could not be uploaded." },
      { status: 500 },
    );
  }

  const { data: imageRow, error: imageError } = await supabase
    .from("images")
    .insert({
      uploader_id: user.id,
      storage_path: storagePath,
      generation_status: "processing",
    })
    .select("id")
    .single();

  if (imageError || !imageRow) {
    return Response.json(
      { error: "The image record could not be created." },
      { status: 500 },
    );
  }

  try {
    const description = await describeImage(image);
    const generatedCaptions = await generateCaptions(description);
    const { error: captionError } = await supabase.from("captions").insert(
      generatedCaptions.map((caption, index) => ({
        image_id: imageRow.id,
        text: caption.text,
        tone: caption.tone,
        display_order: index + 1,
        model: getCaptionModel(),
        prompt_version: "week4-v1",
      })),
    );

    if (captionError) throw captionError;

    const { error: readyError } = await supabase
      .from("images")
      .update({
        description,
        generation_status: "ready",
        updated_at: new Date().toISOString(),
      })
      .eq("id", imageRow.id)
      .eq("uploader_id", user.id);

    if (readyError) throw readyError;
    return Response.json({ imageId: imageRow.id }, { status: 201 });
  } catch (error) {
    await supabase
      .from("images")
      .update({
        generation_status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", imageRow.id)
      .eq("uploader_id", user.id);

    return Response.json({ error: safeErrorMessage(error) }, { status: 502 });
  }
}
