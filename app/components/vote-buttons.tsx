"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  captionId: string;
  downvotes: number;
  initialVote: -1 | 0 | 1;
  signedIn: boolean;
  upvotes: number;
};

export function VoteButtons({
  captionId,
  downvotes: initialDownvotes,
  initialVote,
  signedIn,
  upvotes: initialUpvotes,
}: Props) {
  const router = useRouter();
  const [vote, setVote] = useState(initialVote);
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <Link className="vote-signin" href="/login">
        Sign in to rate →
      </Link>
    );
  }

  async function submitVote(selection: -1 | 1) {
    if (pending) return;

    const nextVote = vote === selection ? 0 : selection;
    const previous = { vote, upvotes, downvotes };
    let nextUpvotes = upvotes;
    let nextDownvotes = downvotes;

    if (vote === 1) nextUpvotes -= 1;
    if (vote === -1) nextDownvotes -= 1;
    if (nextVote === 1) nextUpvotes += 1;
    if (nextVote === -1) nextDownvotes += 1;

    setVote(nextVote);
    setUpvotes(nextUpvotes);
    setDownvotes(nextDownvotes);
    setPending(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captionId, value: nextVote }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Could not save your vote.");
      }
      setNotice(nextVote === 0 ? "Vote removed." : "Vote saved.");
      router.refresh();
    } catch (requestError) {
      setVote(previous.vote);
      setUpvotes(previous.upvotes);
      setDownvotes(previous.downvotes);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not save your vote.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="vote-area" aria-busy={pending}>
      <div className="vote-buttons" aria-label="Rate this caption">
        <button
          aria-label={`Funny, ${upvotes} votes`}
          aria-pressed={vote === 1}
          className={vote === 1 ? "active up" : ""}
          disabled={pending}
          onClick={() => submitVote(1)}
          type="button"
        >
          <span className="vote-icon" aria-hidden="true">
            ↗
          </span>
          <span className="vote-label">Funny</span>
          <b>{upvotes}</b>
        </button>
        <button
          aria-label={`Not funny, ${downvotes} votes`}
          aria-pressed={vote === -1}
          className={vote === -1 ? "active down" : ""}
          disabled={pending}
          onClick={() => submitVote(-1)}
          type="button"
        >
          <span className="vote-icon" aria-hidden="true">
            ↘
          </span>
          <span className="vote-label">Not yet</span>
          <b>{downvotes}</b>
        </button>
      </div>
      {error ? (
        <span className="vote-error" role="alert">
          {error}
        </span>
      ) : notice ? (
        <span className="vote-status" role="status">
          {notice}
        </span>
      ) : null}
    </div>
  );
}
