"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function CaptionUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);
  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setStatus("idle");
    setMessage(null);
  }

  async function generate() {
    if (!file) {
      inputRef.current?.click();
      return;
    }

    setStatus("working");
    setMessage("The visual scout is describing the scene…");
    const body = new FormData();
    body.set("image", file);

    try {
      const response = await fetch("/api/images", { method: "POST", body });
      const result = (await response.json()) as {
        imageId?: string;
        error?: string;
      };

      if (!response.ok || !result.imageId) {
        throw new Error(result.error ?? "Could not generate captions.");
      }

      setStatus("done");
      setMessage("Four fresh lines, straight from the writers' room.");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
      window.setTimeout(() => {
        document.getElementById(`image-${result.imageId}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 250);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Could not generate captions.",
      );
    }
  }

  return (
    <section className="upload-stage" aria-labelledby="upload-title">
      <div className="upload-copy">
        <p className="eyebrow">Open call · members only</p>
        <h2 id="upload-title">Feed the writers&apos; room.</h2>
        <p>
          Drop in one image. Our visual scout describes it first, then four
          comedy specialists write competing captions from that brief.
        </p>
        <div className="chain-diagram" aria-label="Prompt chain">
          <span>Image</span>
          <b aria-hidden="true">→</b>
          <span>Visual brief</span>
          <b aria-hidden="true">→</b>
          <span>4 captions</span>
        </div>
      </div>

      <div className={`upload-dropzone ${previewUrl ? "has-preview" : ""}`}>
        {previewUrl ? (
          // A local object URL does not need Next.js image optimization.
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="Selected upload preview" src={previewUrl} />
        ) : (
          <div className="upload-placeholder" aria-hidden="true">
            <span>+</span>
            <strong>Unexpected image goes here</strong>
          </div>
        )}
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={chooseFile}
        />
        <div className="upload-controls">
          <button
            className="button button-secondary"
            disabled={status === "working"}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            {file ? "Choose another" : "Choose an image"}
          </button>
          <button
            className="button"
            disabled={status === "working"}
            onClick={generate}
            type="button"
          >
            {status === "working" ? "Writing…" : "Generate captions"}
          </button>
        </div>
        <p className="upload-limits">JPG, PNG or WebP · 4 MB max · 5 per hour</p>
        {message ? (
          <p
            className={`upload-message ${status === "error" ? "error" : ""}`}
            role="status"
          >
            {status === "working" ? <span className="status-dot" /> : null}
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
