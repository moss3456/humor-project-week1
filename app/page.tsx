import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { CaptionTone } from "@/lib/types";

type ChampionCaption = {
  id: string;
  text: string;
  tone: CaptionTone;
  display_order: number;
  upvotes: number;
  downvotes: number;
};

type ChampionImageRow = {
  id: string;
  storage_path: string;
  description: string | null;
  created_at: string;
  captions: ChampionCaption[];
};

type Champion = {
  imageId: string;
  imageUrl: string;
  description: string;
  createdAt: string;
  caption: ChampionCaption;
};

function compareCaptions(a: ChampionCaption, b: ChampionCaption) {
  const likeDifference = b.upvotes - a.upvotes;
  if (likeDifference !== 0) return likeDifference;

  const netDifference =
    b.upvotes - b.downvotes - (a.upvotes - a.downvotes);
  if (netDifference !== 0) return netDifference;

  const ballotDifference =
    b.upvotes + b.downvotes - (a.upvotes + a.downvotes);
  if (ballotDifference !== 0) return ballotDifference;

  return a.display_order - b.display_order;
}

async function getHomeData() {
  const supabase = await createClient();
  const userPromise = supabase.auth.getUser();
  const championPromise = supabase
    .from("images")
    .select(
      "id, storage_path, description, created_at, captions(id, text, tone, display_order, upvotes, downvotes)",
    )
    .eq("generation_status", "ready")
    .order("created_at", { ascending: false });

  const [
    {
      data: { user },
    },
    { data, error },
  ] = await Promise.all([userPromise, championPromise]);

  if (error) {
    return { champion: null, unavailable: true, user };
  }

  const rows = (data ?? []) as unknown as ChampionImageRow[];
  const candidates = rows.flatMap((image) =>
    image.captions.map((caption) => ({ image, caption })),
  );

  candidates.sort((a, b) => {
    const captionDifference = compareCaptions(a.caption, b.caption);
    if (captionDifference !== 0) return captionDifference;

    return (
      new Date(b.image.created_at).getTime() -
      new Date(a.image.created_at).getTime()
    );
  });

  const winner = candidates[0];
  if (!winner) {
    return { champion: null, unavailable: false, user };
  }

  const { data: publicUrl } = supabase.storage
    .from("caption-images")
    .getPublicUrl(winner.image.storage_path);
  const champion: Champion = {
    imageId: winner.image.id,
    imageUrl: publicUrl.publicUrl,
    description:
      winner.image.description ?? "The current crowd-favorite meme.",
    createdAt: winner.image.created_at,
    caption: winner.caption,
  };

  return { champion, unavailable: false, user };
}

const toneLabels: Record<CaptionTone, string> = {
  deadpan: "Deadpan desk",
  absurd: "Absurdity unit",
  observational: "Field notes",
  wildcard: "Wild card",
};

export default async function Home() {
  const { champion, unavailable, user } = await getHomeData();
  const championHref = champion
    ? `/images?sort=popular#image-${champion.imageId}`
    : "/images";

  return (
    <main className="page-shell">
      <section className="hero home-hero">
        <div>
          <p className="eyebrow">AI captions. Human verdicts.</p>
          <h1>The crowd has spoken.</h1>
          <p className="intro">
            Meet the most-liked AI caption in the department, then head to the
            Caption Lab to judge every contender or put your own image on stage.
          </p>
          <div className="hero-actions">
            <a className="button" href="#crowd-champion">
              Meet the champion
            </a>
            {user ? (
              <Link className="button button-secondary" href="/images">
                Enter the Caption Lab
              </Link>
            ) : (
              <Link className="button button-secondary" href="/login">
                Sign in to vote
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

      <section
        aria-labelledby="champion-heading"
        className="champion-section"
        id="crowd-champion"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Live from Supabase</p>
            <h2 id="champion-heading">The crowd champion</h2>
          </div>
          <span className="count">Most liked</span>
        </div>

        {unavailable ? (
          <div className="empty-state archive-error">
            <strong>The leaderboard missed its cue.</strong>
            <span>
              The champion is temporarily unavailable, but the Caption Lab is
              still open.
            </span>
            <Link className="button button-secondary" href="/images">
              Visit the Caption Lab
            </Link>
          </div>
        ) : champion ? (
          <article className="champion-card">
            <Link
              aria-label="Open the champion meme in the Caption Lab"
              className="champion-image-link"
              href={championHref}
            >
              <div className="champion-image-wrap">
                <Image
                  alt={champion.description}
                  fill
                  priority
                  sizes="(max-width: 840px) 100vw, 52vw"
                  src={champion.imageUrl}
                />
              </div>
              <span className="champion-ribbon">
                <span aria-hidden="true">★</span> Current champion
              </span>
            </Link>

            <div className="champion-copy">
              <div className="champion-meta">
                <span className={`tone tone-${champion.caption.tone}`}>
                  {toneLabels[champion.caption.tone]}
                </span>
                <time dateTime={champion.createdAt}>
                  {new Intl.DateTimeFormat("en", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(new Date(champion.createdAt))}
                </time>
              </div>
              <blockquote>“{champion.caption.text}”</blockquote>
              <div className="champion-score" aria-label="Champion vote totals">
                <div>
                  <strong>{champion.caption.upvotes}</strong>
                  <span>Funny votes</span>
                </div>
                <div>
                  <strong>
                    {champion.caption.upvotes - champion.caption.downvotes >= 0
                      ? "+"
                      : ""}
                    {champion.caption.upvotes - champion.caption.downvotes}
                  </strong>
                  <span>Net score</span>
                </div>
              </div>
              <p className="champion-note">
                Think another line deserves the crown? Open the full matchup to
                see every caption and cast your vote.
              </p>
              <Link className="button" href={championHref}>
                View all captions &amp; vote →
              </Link>
            </div>
          </article>
        ) : (
          <div className="empty-state">
            <strong>No champion has taken the stage yet.</strong>
            <span>Submit the first image and let the crowd choose a winner.</span>
            <Link className="button" href="/images">
              Open the Caption Lab
            </Link>
          </div>
        )}
      </section>

      <section className="membership-banner">
        <div>
          <p className="eyebrow">Behind the velvet rope</p>
          <h2>
            {user
              ? "Your green-room pass is active."
              : "There is more backstage."}
          </h2>
        </div>
        <p>
          {user
            ? "Submit an image, vote on AI captions, or keep your profile up to date."
            : "Sign in with Google to submit images, vote on captions, and unlock the members route."}
        </p>
        <Link className="button" href={user ? "/images" : "/login"}>
          {user ? "Create a matchup →" : "Sign in with Google →"}
        </Link>
      </section>
    </main>
  );
}
