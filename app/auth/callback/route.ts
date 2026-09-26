import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function redirectFromRequest(request: Request, path: string) {
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const base = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : requestUrl.origin;

  return NextResponse.redirect(new URL(path, base));
}

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (!code) {
    return redirectFromRequest(request, "/auth/auth-code-error");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return redirectFromRequest(request, "/auth/auth-code-error");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectFromRequest(request, "/auth/auth-code-error");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  const destination =
    profile?.first_name && profile?.last_name ? "/members" : "/profile";
  return redirectFromRequest(request, destination);
}
