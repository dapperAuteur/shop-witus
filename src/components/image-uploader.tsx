"use client";

import { useState } from "react";

interface SignedImageUpload {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  uploadUrl: string;
}

// Signed direct-to-Cloudinary upload. On success, calls onUploaded with the
// secure_url so the parent form can store it.
export function ImageUploader({
  shopId,
  onUploaded,
}: {
  shopId: string;
  onUploaded: (url: string) => void;
}) {
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");

  async function handle(file: File) {
    setStatus("uploading");
    try {
      const signRes = await fetch("/api/media/cloudinary-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId }),
      });
      if (!signRes.ok) throw new Error("sign failed");
      const s = (await signRes.json()) as SignedImageUpload;

      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", s.apiKey);
      fd.append("timestamp", String(s.timestamp));
      fd.append("signature", s.signature);
      fd.append("folder", s.folder);

      const up = await fetch(s.uploadUrl, { method: "POST", body: fd });
      if (!up.ok) throw new Error("upload failed");
      const j = (await up.json()) as { secure_url?: string };
      if (!j.secure_url) throw new Error("no url");

      onUploaded(j.secure_url);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        type="file"
        accept="image/*"
        aria-label="Upload product image"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handle(f);
        }}
        className="min-h-11 rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-emerald-700 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:border-white/20"
      />
      {status === "uploading" && (
        <p role="status" aria-live="polite" className="text-xs text-zinc-500 dark:text-zinc-400">
          Uploading…
        </p>
      )}
      {status === "error" && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          Upload failed — try again, or paste an image URL below.
        </p>
      )}
    </div>
  );
}
