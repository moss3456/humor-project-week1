import { createClient } from "@/lib/supabase/server";

type ProfileBody = {
  firstName?: unknown;
  lastName?: unknown;
};

function cleanName(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 80) : "";
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  let body: ProfileBody;
  try {
    body = (await request.json()) as ProfileBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const firstName = cleanName(body.firstName);
  const lastName = cleanName(body.lastName);
  if (!firstName || !lastName) {
    return Response.json(
      { error: "First and last name are required." },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    first_name: firstName,
    last_name: lastName,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
