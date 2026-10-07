import { createClient } from "@/lib/supabase/server";

type VoteBody = {
  captionId?: unknown;
  value?: unknown;
};

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  let body: VoteBody;
  try {
    body = (await request.json()) as VoteBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isUuid(body.captionId) || ![-1, 0, 1].includes(Number(body.value))) {
    return Response.json({ error: "Invalid vote." }, { status: 400 });
  }

  const value = Number(body.value) as -1 | 0 | 1;
  if (value === 0) {
    const { error } = await supabase
      .from("caption_votes")
      .delete()
      .eq("caption_id", body.captionId)
      .eq("user_id", user.id);

    if (error) {
      return Response.json({ error: "Could not remove the vote." }, { status: 500 });
    }
    return Response.json({ vote: 0 });
  }

  const { error } = await supabase.from("caption_votes").upsert(
    {
      caption_id: body.captionId,
      user_id: user.id,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "caption_id,user_id" },
  );

  if (error) {
    return Response.json({ error: "Could not save the vote." }, { status: 500 });
  }

  return Response.json({ vote: value });
}
