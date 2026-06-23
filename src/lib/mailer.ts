import formData from "form-data";
import Mailgun from "mailgun.js";
import { env, hasMailgun } from "./env";

interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// Sends via Mailgun when configured. Before Mailgun is set up (operator task
// 04), it logs the message to the server console so magic-link sign-in still
// works end-to-end in local dev — copy the link from the terminal.
export async function sendEmail({ to, subject, text, html }: SendEmailInput): Promise<void> {
  if (!hasMailgun) {
    console.log(
      `\n[mailer:dev] (Mailgun not configured — logging instead)\n  To: ${to}\n  Subject: ${subject}\n  ${text}\n`,
    );
    return;
  }

  const mailgun = new Mailgun(formData);
  const mg = mailgun.client({
    username: "api",
    key: env.MAILGUN_API_KEY as string,
    url: env.MAILGUN_REGION === "eu" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net",
  });

  await mg.messages.create(env.MAILGUN_DOMAIN as string, {
    from: env.MAIL_FROM ?? `Shop.WitUS <no-reply@${env.MAILGUN_DOMAIN}>`,
    to: [to],
    subject,
    text,
    ...(html ? { html } : {}),
  });
}
