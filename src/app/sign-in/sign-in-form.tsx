"use client";

import { type FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { WitusSsoButton } from "@/components/witus-sso-button";

type Status = "idle" | "sending" | "sent" | "error";

export function SignInForm({ witusSsoEnabled }: { witusSsoEnabled: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: "/dashboard",
    });
    if (error) {
      setStatus("error");
      setError(error.message ?? "Something went wrong. Please try again.");
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <p
        role="status"
        aria-live="polite"
        className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200"
      >
        Check your email for a sign-in link. It expires in 10 minutes.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-11 rounded-md border border-black/15 bg-transparent px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:border-white/20"
          />
        </div>
        {status === "error" && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex min-h-12 items-center justify-center rounded-md bg-emerald-700 px-6 text-base font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Send sign-in link"}
        </button>
      </form>

      {witusSsoEnabled && (
        <div className="flex flex-col gap-4">
          <p className="text-center text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            or
          </p>
          <WitusSsoButton />
        </div>
      )}
    </div>
  );
}
