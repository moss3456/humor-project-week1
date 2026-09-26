import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export default async function MembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  const profile = data as Profile | null;

  if (!profile?.first_name || !profile.last_name) redirect("/profile");

  return (
    <main className="page-shell">
      <section className="member-hero">
        <div>
          <p className="eyebrow">Members only · credentials checked</p>
          <h1>Welcome backstage, {profile.first_name}.</h1>
          <p className="intro">
            This route is rendered only after the server verifies your Supabase
            session. The velvet rope is mostly HTTP cookies.
          </p>
        </div>
        <div className="access-stamp" aria-label="Access granted">
          <span>Access</span>
          <strong>Granted</strong>
          <small>AUTH · 200</small>
        </div>
      </section>

      <section className="green-room" aria-labelledby="green-room-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Secret set list</p>
            <h2 id="green-room-title">The green room</h2>
          </div>
          <span className="count">Private route</span>
        </div>
        <div className="member-grid">
          <article>
            <span className="member-number">01</span>
            <h3>Warm-up prompt</h3>
            <p>
              Explain OAuth to a rubber duck. If the duck asks for your client
              secret, end the meeting.
            </p>
          </article>
          <article>
            <span className="member-number">02</span>
            <h3>House rule</h3>
            <p>
              Authentication proves who you are. Authorization decides whether
              you get the good snacks.
            </p>
          </article>
          <article>
            <span className="member-number">03</span>
            <h3>Your badge</h3>
            <p>
              {profile.first_name} {profile.last_name} · Verified member
            </p>
            <Link href="/profile">Edit your profile →</Link>
          </article>
        </div>
      </section>
    </main>
  );
}
