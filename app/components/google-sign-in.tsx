"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function GoogleSignIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    }
  }

  return (
    <div className="oauth-block">
      <button className="google-button" disabled={loading} onClick={signIn}>
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path
            d="M21.8 12.23c0-.72-.06-1.25-.2-1.8h-9.4v3.4h5.52a4.7 4.7 0 0 1-2.05 3.09l-.02.11 2.98 2.31.21.02c1.93-1.78 2.96-4.4 2.96-7.13Z"
            fill="#4285F4"
          />
          <path
            d="M12.2 22c2.76 0 5.08-.91 6.77-2.48l-3.22-2.5c-.86.6-2.02 1.02-3.55 1.02a6.16 6.16 0 0 1-5.84-4.25l-.1.01-3.1 2.4-.04.1A10.22 10.22 0 0 0 12.2 22Z"
            fill="#34A853"
          />
          <path
            d="M6.36 13.79a6.3 6.3 0 0 1-.34-2.03c0-.71.12-1.4.33-2.03v-.12L3.21 7.17l-.1.05a10.25 10.25 0 0 0 0 9.08l3.25-2.51Z"
            fill="#FBBC05"
          />
          <path
            d="M12.2 5.48c1.92 0 3.21.83 3.95 1.52l2.89-2.82A9.82 9.82 0 0 0 12.2 1.5a10.22 10.22 0 0 0-9.08 5.72l3.23 2.51a6.18 6.18 0 0 1 5.85-4.25Z"
            fill="#EB4335"
          />
        </svg>
        {loading ? "Opening Google…" : "Continue with Google"}
      </button>
      {error ? <p className="form-message error">{error}</p> : null}
    </div>
  );
}
