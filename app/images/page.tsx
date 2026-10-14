import Image from "next/image";
import Link from "next/link";
import { CaptionUpload } from "@/app/components/caption-upload";
import { VoteButtons } from "@/app/components/vote-buttons";
import { createClient } from "@/lib/supabase/server";
import type {
  CaptionTone,
  GalleryCaption,
  GalleryImage,
} from "@/lib/types";

type ImageRow = {
  id: string;
  storage_path: string;
  description: string | null;
  created_at: string;
  captions: Array<{
    id: string;
    text: string;
    tone: CaptionTone;
    display_order: number;
    upvotes: number;
    downvotes: number;
  }>;
};

type GallerySort = "newest" | "popular";

type ImagesPageProps = {
  searchParams: Promise<{
    sort?: string | string[];
  }>;
};

function getBallotCount(image: GalleryImage) {
  return image.captions.reduce(
    (total, caption) => total + caption.upvotes + caption.downvotes,
    0,
  );
}

function getBestScore(image: GalleryImage) {
  return Math.max(
    0,
    ...image.captions.map((caption) => caption.upvotes - caption.downvotes),
  );
}

function getLeaderId(image: GalleryImage) {
  const bestScore = getBestScore(image);
  if (bestScore <= 0) return null;

  const leaders = image.captions.filter(
    (caption) => caption.upvotes - caption.downvotes === bestScore,
  );

  return leaders.length === 1 ? leaders[0].id : null;
}

async function getGallery() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("images")
    .select(
      "id, storage_path, description, created_at, captions(id, text, tone, display_order, upvotes, downvotes)",
    )
    .eq("generation_status", "ready")
    .order("created_at", { ascending: false });

  if (error) {
    return { images: [] as GalleryImage[], setupPending: true, user };
  }

  const rows = (data ?? []) as unknown as ImageRow[];
  const captionIds = rows.flatMap((image) =>
    image.captions.map((caption) => caption.id),
  );
  const viewerVotes = new Map<string, -1 | 1>();

  if (user && captionIds.length > 0) {
    const { data: votes } = await supabase
      .from("caption_votes")
      .select("caption_id, value")
      .in("caption_id", captionIds)
      .eq("user_id", user.id);

    for (const vote of votes ?? []) {
      if (vote.value === 1 || vote.value === -1) {
        viewerVotes.set(vote.caption_id, vote.value);
      }
    }
  }

  const images = rows.map((image): GalleryImage => {
    const { data: publicUrl } = supabase.storage
      .from("caption-images")
      .getPublicUrl(image.storage_path);

    return {
      id: image.id,
      description: image.description ?? "A mystery scene awaiting its close-up.",
      image_url: publicUrl.publicUrl,
      created_at: image.created_at,
      captions: image.captions
        .map(
          (caption): GalleryCaption => ({
            ...caption,
            viewer_vote: viewerVotes.get(caption.id) ?? 0,
          }),
        )
        .sort((a, b) => a.display_order - b.display_order),
    };
  });

  return { images, setupPending: false, user };
}

const toneLabels: Record<CaptionTone, string> = {
  deadpan: "Deadpan desk",
  absurd: "Absurdity unit",
  observational: "Field notes",
  wildcard: "Wild card",
};

export default async function ImagesPage({ searchParams }: ImagesPageProps) {
  const { images, setupPending, user } = await getGallery();
  const requestedSort = (await searchParams).sort;
  const sort: GallerySort =
    requestedSort === "popular" ? "popular" : "newest";
  const sortedImages = [...images].sort((a, b) => {
    if (sort === "popular") {
      const scoreDifference = getBestScore(b) - getBestScore(a);
      if (scoreDifference !== 0) return scoreDifference;

      const ballotDifference = getBallotCount(b) - getBallotCount(a);
      if (ballotDifference !== 0) return ballotDifference;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  const captionCount = images.reduce(
    (total, image) => total + image.captions.length,
    0,
  );
  const ballotCount = images.reduce(
    (total, image) => total + getBallotCount(image),
    0,
  );

  return (
    <main className="page-shell caption-page">
      <section className="caption-hero">
        <div>
          <p className="eyebrow">The public writers&apos; room</p>
          <h1>Four captions enter. Your vote decides who leaves funny.</h1>
          <p className="intro">
            Members submit a photo. One model scouts the scene. A second model
            writes the jokes. Everyone gets a ballot; only signed-in humans get
            to use it.
          </p>
          <div className="hero-actions">
            <a className="button" href="#gallery-heading">
              Judge the latest
            </a>
            {!user ? (
              <Link className="button button-secondary" href="/login">
                Sign in to submit
              </Link>
            ) : null}
          </div>
        </div>
        <div className="caption-marquee" aria-hidden="true">
          <span>SETUP</span>
          <strong>↘</strong>
          <span>PUNCH</span>
          <strong>↗</strong>
          <span>VOTE</span>
        </div>
      </section>

      {user ? (
        <CaptionUpload />
      ) : (
        <section className="login-callout">
          <p className="eyebrow">Your image could be next</p>
          <h2>Get a backstage pass to submit and vote.</h2>
          <Link className="button" href="/login">
            Continue with Google →
          </Link>
        </section>
      )}

      <section className="lab-stats" aria-label="Caption Lab activity">
        <div>
          <strong>{images.length}</strong>
          <span>Images on stage</span>
        </div>
        <div>
          <strong>{captionCount}</strong>
          <span>Lines in play</span>
        </div>
        <div>
          <strong>{ballotCount}</strong>
          <span>Ballots cast</span>
        </div>
      </section>

      <section className="caption-gallery" aria-labelledby="gallery-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Audience participation encouraged</p>
            <h2 id="gallery-heading">Tonight&apos;s contenders</h2>
          </div>
          <span className="count">
            {images.length} {images.length === 1 ? "image" : "images"}
          </span>
        </div>

        {!setupPending && images.length > 0 ? (
          <div className="gallery-toolbar" aria-label="Sort caption gallery">
            <div>
              <strong>Choose the running order</strong>
              <span>Come back after voting to see the room reshuffle.</span>
            </div>
            <div className="sort-links">
              <Link
                aria-current={sort === "newest" ? "page" : undefined}
                className={sort === "newest" ? "active" : ""}
                href="/images"
              >
                Newest
              </Link>
              <Link
                aria-current={sort === "popular" ? "page" : undefined}
                className={sort === "popular" ? "active" : ""}
                href="/images?sort=popular"
              >
                Crowd picks
              </Link>
            </div>
          </div>
        ) : null}

        {setupPending ? (
          <div className="empty-state">
            <strong>The caption archive missed its cue.</strong>
            <span>
              The gallery is temporarily unavailable. Try again in a moment.
            </span>
            <Link className="button button-secondary" href="/images">
              Reload the gallery
            </Link>
          </div>
        ) : images.length === 0 ? (
          <div className="empty-stage">
            <span aria-hidden="true">HA?</span>
            <h3>The stage is suspiciously empty.</h3>
            <p>Be the first member to submit an image and start the contest.</p>
          </div>
        ) : (
          <div className="image-feed">
            {sortedImages.map((galleryImage, imageIndex) => {
              const leaderId = getLeaderId(galleryImage);

              return (
                <article
                  className="caption-showdown"
                  id={`image-${galleryImage.id}`}
                  key={galleryImage.id}
                >
                  <div className="showdown-image-column">
                    <div className="polaroid">
                      <div className="gallery-image-wrap">
                        <Image
                          fill
                          loading={imageIndex === 0 ? "eager" : "lazy"}
                          sizes="(max-width: 800px) 100vw, 42vw"
                          src={galleryImage.image_url}
                          alt={galleryImage.description}
                        />
                      </div>
                      <div className="polaroid-caption">
                        <span>
                          Exhibit {String(imageIndex + 1).padStart(2, "0")}
                        </span>
                        <time dateTime={galleryImage.created_at}>
                          {new Intl.DateTimeFormat("en", {
                            month: "short",
                            day: "numeric",
                          }).format(new Date(galleryImage.created_at))}
                        </time>
                      </div>
                    </div>
                    <details className="visual-brief">
                      <summary>Read the visual scout&apos;s brief</summary>
                      <p>{galleryImage.description}</p>
                    </details>
                  </div>

                  <div className="caption-contenders">
                    <div className="contender-heading">
                      <span>Writers&apos; room transcript</span>
                      <strong>{getBallotCount(galleryImage)} ballots cast</strong>
                    </div>
                    {galleryImage.captions.map((caption, captionIndex) => (
                      <div
                        className={`caption-entry ${leaderId === caption.id ? "is-leading" : ""}`}
                        key={caption.id}
                      >
                        <div className="caption-index">
                          {String.fromCharCode(65 + captionIndex)}
                        </div>
                        <div className="caption-copy">
                          <div className="caption-meta">
                            <span className={`tone tone-${caption.tone}`}>
                              {toneLabels[caption.tone]}
                            </span>
                            {leaderId === caption.id ? (
                              <span className="crowd-favorite">
                                <span aria-hidden="true">★</span> Crowd favorite
                              </span>
                            ) : null}
                            <span className="net-score">
                              Net{" "}
                              {caption.upvotes - caption.downvotes >= 0
                                ? "+"
                                : ""}
                              {caption.upvotes - caption.downvotes}
                            </span>
                          </div>
                          <blockquote>“{caption.text}”</blockquote>
                          <VoteButtons
                            captionId={caption.id}
                            downvotes={caption.downvotes}
                            initialVote={caption.viewer_vote}
                            signedIn={Boolean(user)}
                            upvotes={caption.upvotes}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
