import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <main className="page-shell narrow-shell">
      <section className="message-card">
        <p className="eyebrow">Authentication hiccup</p>
        <h1>That sign-in link did not land.</h1>
        <p className="intro">
          The authorization code was missing or expired. Nothing was changed;
          please start the Google sign-in flow again.
        </p>
        <Link className="button" href="/login">
          Try again
        </Link>
      </section>
    </main>
  );
}
