import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";
import { genericOAuth } from "better-auth/plugins";
import { db, schema } from "@/db/client";
import { env } from "./env";
import { WITUS_OIDC_DISCOVERY_FALLBACK } from "./silent-sso";
import { sendEmail } from "./mailer";
import { createShopForNewUser } from "./shop-bootstrap";

export const auth = betterAuth({
  appName: "Shop.WitUS",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
  }),
  // Passwordless: magic link only. Open self-serve — anyone can sign up; the
  // databaseHooks.after below provisions their shop automatically.
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendEmail({
          to: email,
          subject: "Your Shop.WitUS sign-in link",
          text: `Sign in to Shop.WitUS:\n${url}\n\nThis link expires in 10 minutes. If you didn't request it, ignore this email.`,
        });
      },
    }),
    // "Sign in with WitUS" — the ecosystem IdP as an OIDC provider. Added only once
    // WITUS_OIDC_CLIENT_ID is set, so a missing env never breaks the build or the
    // magic-link flow. New WitUS accounts still flow through databaseHooks.after
    // below, so their shop is provisioned exactly like a magic-link signup.
    ...(env.WITUS_OIDC_CLIENT_ID
      ? [
          genericOAuth({
            config: [
              {
                providerId: "witus",
                // Fallback lives in silent-sso.ts so the IdP host is asserted in exactly one
                // place; the sign-out + "Continue as …" endpoints derive from the same value.
                discoveryUrl: env.WITUS_OIDC_DISCOVERY_URL ?? WITUS_OIDC_DISCOVERY_FALLBACK,
                clientId: env.WITUS_OIDC_CLIENT_ID,
                clientSecret: env.WITUS_OIDC_CLIENT_SECRET ?? "",
                scopes: ["openid", "email", "profile"],
                pkce: true,
              },
            ],
          }),
        ]
      : []),
    nextCookies(),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await createShopForNewUser(user.id, user.email);
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
