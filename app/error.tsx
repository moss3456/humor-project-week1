"use client";

import Link from "next/link";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main className="page-shell narrow-shell">
      <section className="message-card error-card" role="alert">
        <p className="eyebrow">Unexpected intermission</p>
        <h1>The punchline took a wrong turn.</h1>
        <p className="intro">
          Nothing you submitted was erased. Try the scene again, or head back
          to the Caption Lab while the stage resets.
        </p>
        <div className="hero-actions">
          <button className="button" onClick={() => retry()} type="button">
            Try again
          </button>
          <Link className="button button-secondary" href="/images">
            Open Caption Lab
          </Link>
        </div>
      </section>
    </main>
  );
}
