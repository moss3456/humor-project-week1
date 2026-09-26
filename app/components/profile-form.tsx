"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";

type Props = {
  email: string;
  profile: Profile;
};

export function ProfileForm({ email, profile }: Props) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState(profile.first_name ?? "");
  const [lastName, setLastName] = useState(profile.last_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const needsNames = !profile.first_name || !profile.last_name;

  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() ||
    email[0]?.toUpperCase() ||
    "?";

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName }),
    });
    const result = (await response.json()) as { error?: string };

    setSaving(false);
    if (!response.ok) {
      setMessage(result.error ?? "Could not save your profile.");
      return;
    }

    setMessage("Profile saved.");
    router.refresh();
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);
    const body = new FormData();
    body.set("avatar", file);

    const response = await fetch("/api/avatar", { method: "POST", body });
    const result = (await response.json()) as {
      avatarUrl?: string;
      error?: string;
    };

    setUploading(false);
    if (!response.ok || !result.avatarUrl) {
      setMessage(result.error ?? "Could not upload that photo.");
      return;
    }

    setAvatarUrl(result.avatarUrl);
    setMessage("Photo updated.");
    router.refresh();
  }

  return (
    <div className="profile-grid">
      <section className="profile-card avatar-card" aria-labelledby="photo-title">
        <div className="avatar-preview">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="Your profile" />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div>
          <p className="eyebrow">Your face, your call</p>
          <h2 id="photo-title">Profile photo</h2>
          <p className="muted-copy">JPG, PNG, GIF or WebP. Maximum 5 MB.</p>
        </div>
        <input
          ref={fileInput}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={uploadAvatar}
        />
        <button
          className="button button-secondary"
          disabled={uploading}
          onClick={() => fileInput.current?.click()}
          type="button"
        >
          {uploading ? "Uploading…" : avatarUrl ? "Change photo" : "Upload photo"}
        </button>
      </section>

      <section className="profile-card details-card" aria-labelledby="details-title">
        {needsNames ? (
          <div className="onboarding-note" role="status">
            <span aria-hidden="true">✦</span>
            <p>
              One last thing: tell us your name to finish setting up your
              account.
            </p>
          </div>
        ) : null}
        <p className="eyebrow">The official record</p>
        <h2 id="details-title">Personal details</h2>
        <form className="profile-form" onSubmit={saveProfile}>
          <div className="field-row">
            <label>
              <span>First name</span>
              <input
                autoComplete="given-name"
                maxLength={80}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Ada"
                required
                value={firstName}
              />
            </label>
            <label>
              <span>Last name</span>
              <input
                autoComplete="family-name"
                maxLength={80}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Lovelace"
                required
                value={lastName}
              />
            </label>
          </div>
          <label>
            <span>Email</span>
            <input disabled type="email" value={email} />
          </label>
          <div className="form-footer">
            <button className="button" disabled={saving} type="submit">
              {saving ? "Saving…" : "Save profile"}
            </button>
            {message ? <p className="form-message">{message}</p> : null}
          </div>
        </form>
      </section>
    </div>
  );
}
