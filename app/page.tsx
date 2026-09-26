import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Joke } from "@/lib/types";

async function getJokes(): Promise<Joke[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jokes")
    .select("id, setup, punchline, category")
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Could not load jokes: ${error.message}`);
  }

  return data ?? [];
}

export default async function Home() {
  const jokes = await getJokes();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="page-shell">
      <section className="hero home-hero">
        <div>
          <p className="eyebrow">The Internet&apos;s Most Serious Joke Archive</p>
          <h1>Big laughs, neatly indexed.</h1>
          <p className="intro">
            A live collection fetched from Supabase, filed with unnecessary
            precision and delivered with impeccable timing.
          </p>
          <div className="hero-actions">
            <a className="button" href="#jokes-heading">
              Browse the archive
            </a>
            {user ? (
              <Link className="button button-secondary" href="/members">
                Enter the green room
              </Link>
            ) : (
              <Link className="button button-secondary" href="/login">
                Join the department
              </Link>
            )}
          </div>
        </div>
        <div className="hero-doodle" aria-hidden="true">
          <span>HA</span>
          <span>HA</span>
          <span>HA!</span>
        </div>
      </section>

      <section aria-labelledby="jokes-heading" className="list-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Live from Supabase</p>
            <h2 id="jokes-heading">Filed under: funny</h2>
          </div>
          <span className="count">
            {jokes.length} {jokes.length === 1 ? "joke" : "jokes"}
          </span>
        </div>

        {jokes.length > 0 ? (
          <ul className="joke-grid">
            {jokes.map((joke, index) => (
              <li className="joke-card" key={joke.id}>
                <div className="card-topline">
                  <span className="joke-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="category">{joke.category}</span>
                </div>
                <h3>{joke.setup}</h3>
                <p>{joke.punchline}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">No jokes have been added yet.</p>
        )}
      </section>

      <section className="membership-banner">
        <div>
          <p className="eyebrow">Behind the velvet rope</p>
          <h2>{user ? "Your green-room pass is active." : "There is more backstage."}</h2>
        </div>
        <p>
          {user
            ? "Visit the protected members route or keep your profile up to date."
            : "Sign in with Google to unlock a protected members route and build your profile."}
        </p>
        <Link className="button" href={user ? "/members" : "/login"}>
          {user ? "Members only →" : "Sign in with Google →"}
        </Link>
      </section>
    </main>
  );
}
