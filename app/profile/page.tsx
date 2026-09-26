import { redirect } from "next/navigation";
import { ProfileForm } from "@/app/components/profile-form";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export default async function ProfilePage() {
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

  const profile: Profile = (data as Profile | null) ?? {
    id: user.id,
    first_name: null,
    last_name: null,
    avatar_url: null,
  };

  return (
    <main className="page-shell">
      <section className="page-intro">
        <p className="eyebrow">Profile</p>
        <h1>Put a name to the punchline.</h1>
        <p className="intro">
          Keep your member card current. Your image lives in object storage;
          the database stores only its URL.
        </p>
      </section>
      <ProfileForm email={user.email ?? ""} profile={profile} />
    </main>
  );
}
