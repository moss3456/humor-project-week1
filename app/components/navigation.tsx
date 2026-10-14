import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function Initials({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return <span className="nav-avatar">{initials || "?"}</span>;
}

export async function Navigation() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName =
    user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Member";

  return (
    <header className="site-header">
      <nav className="nav-shell" aria-label="Primary navigation">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            H!
          </span>
          <span>Humor Dept.</span>
        </Link>

        <div className="nav-links">
          <Link className="nav-jokes" href="/">Jokes</Link>
          <Link className="nav-caption" href="/images">Caption Lab</Link>
          {user ? (
            <>
              <Link href="/members">Members</Link>
              <Link className="profile-link" href="/profile">
                <Initials name={displayName} />
                <span>Profile</span>
              </Link>
              <form action="/auth/signout" method="post">
                <button className="text-button" type="submit">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link className="button button-small" href="/login">
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
