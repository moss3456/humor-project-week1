import { connection } from "next/server";
import { createSupabaseClient } from "@/lib/supabase";

type Joke = {
  id: number;
  setup: string;
  punchline: string;
  category: string;
};

async function getJokes(): Promise<Joke[]> {
  const supabase = createSupabaseClient();
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
  await connection();
  const jokes = await getJokes();

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Humor Database</p>
        <h1>A small collection of big laughs.</h1>
        <p className="intro">
          These jokes are fetched live from a Supabase table and rendered by
          Next.js.
        </p>
      </section>

      <section aria-labelledby="jokes-heading" className="list-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">From Supabase</p>
            <h2 id="jokes-heading">Joke list</h2>
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
    </main>
  );
}
