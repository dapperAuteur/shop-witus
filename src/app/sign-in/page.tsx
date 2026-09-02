import { hasWitusSso, witusSilentSsoEndpoint } from "@/lib/env";
import { SignInForm } from "./sign-in-form";

// Server component: reads the server-only `hasWitusSso` flag so the "Sign in with
// WitUS" button only renders once the OIDC client is provisioned. The interactive
// magic-link form + its status states live in the client SignInForm.
//
// `witusSilentSsoEndpoint` is resolved HERE, on the server, and handed down — the client
// component must never read the raw env. It is null unless this app is a configured OIDC
// client, which keeps the "Continue as <name>" probe completely dark in that case.
export default function SignInPage() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-4 py-16"
    >
      <div className="flex flex-col gap-2">
        <p className="font-mono text-sm font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
          Shop.WitUS
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-zinc-600 dark:text-zinc-300">
          Enter your email and we&apos;ll send you a one-time sign-in link. New here? Signing in
          creates your shop automatically.
        </p>
      </div>

      <SignInForm witusSsoEnabled={hasWitusSso} witusSilentSsoUrl={witusSilentSsoEndpoint} />
    </main>
  );
}
