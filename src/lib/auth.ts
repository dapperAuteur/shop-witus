import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";
import { db, schema } from "@/db/client";
import { env } from "./env";
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
