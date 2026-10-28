import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleSignIn } from "@/app/components/google-sign-in";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/profile");

  return (
    <main className="page-shell auth-shell">
      <section className="auth-card">
        <div className="auth-copy">
          <p className="eyebrow">Members entrance</p>
          <h1>Come for the jokes. Stay for the callback.</h1>
          <p className="intro">
            Sign in securely with Google to unlock the members-only green room
            and create your profile.
          </p>
        </div>
        <div className="auth-action">
          <div className="squiggle" aria-hidden="true">
            ~ ~ ~
          </div>
          <GoogleSignIn />
          {error === "signup-not-allowed" ? (
            <p className="form-message error">
              This e-mail address is not on the current signup allowlist. Contact an administrator.
            </p>
          ) : null}
          <p className="fine-print">
            We only request your basic identity details. No Google password is
            ever shared with this app.
          </p>
          <Link className="back-link" href="/">
            ← Back to the joke list
          </Link>
        </div>
      </section>
    </main>
  );
}
