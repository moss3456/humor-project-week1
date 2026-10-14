export default function Loading() {
  return (
    <main className="page-shell" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Loading the Humor Department…</span>
      <div className="loading-stage" aria-hidden="true">
        <div className="loading-line loading-kicker" />
        <div className="loading-line loading-title" />
        <div className="loading-line loading-copy" />
        <div className="loading-card" />
      </div>
    </main>
  );
}
