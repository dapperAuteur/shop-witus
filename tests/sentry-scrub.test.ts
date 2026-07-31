import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { isSensitiveUrl, redactSecrets, scrubEvent } from "@/lib/sentry-scrub";

describe("isSensitiveUrl", () => {
  it("flags a magic-link sign-in URL", () => {
    expect(isSensitiveUrl("https://shop.witus.online/api/auth/magic-link/verify?token=abc123")).toBe(true);
  });

  it("flags the Wix OAuth callback (code + state)", () => {
    expect(isSensitiveUrl("https://shop.witus.online/api/connect/wix/callback?code=xyz&state=nonce")).toBe(true);
  });

  it("flags any long random path segment", () => {
    expect(isSensitiveUrl("https://shop.witus.online/redeem/Xk3n8VqPl29aBcDeFgHiJkLmNoPq")).toBe(true);
  });

  it("keeps an ordinary catalog URL intact", () => {
    expect(isSensitiveUrl("https://shop.witus.online/s/awesome-web-store")).toBe(false);
    expect(isSensitiveUrl("https://shop.witus.online/embed/shop/my-shop/tees")).toBe(false);
  });

  it("redacts anything it cannot parse", () => {
    expect(isSensitiveUrl("https://")).toBe(true);
  });
});

describe("redactSecrets", () => {
  it("removes a token-bearing URL but keeps a harmless one", () => {
    const text = "failed at https://shop.witus.online/api/auth/callback?token=s3cret after https://shop.witus.online/help";
    const out = redactSecrets(text);
    expect(out).not.toContain("s3cret");
    expect(out).toContain("/help");
  });

  it("removes a bare key=value secret with no URL around it", () => {
    expect(redactSecrets("oauth exchange failed: code=abc123def")).not.toContain("abc123def");
  });

  it("removes email addresses", () => {
    expect(redactSecrets("no shop for merchant@example.com")).not.toContain("merchant@example.com");
  });
});

describe("scrubEvent", () => {
  it("drops identity, cookies, and auth headers", () => {
    const event = {
      message: "boom at https://shop.witus.online/api/auth/verify?token=leak",
      user: { id: "usr_1", email: "merchant@example.com", ip_address: "203.0.113.7", username: "merchant" },
      request: {
        url: "https://shop.witus.online/api/connect/wix/callback?code=leak",
        query_string: "code=leak",
        cookies: { session: "leak" },
        headers: { cookie: "session=leak", authorization: "Bearer leak", "set-cookie": "a=b", "user-agent": "vitest" },
      },
      exception: { values: [{ value: "fetch failed for https://shop.witus.online/api/auth/x?token=leak" }] },
    } as unknown as ErrorEvent;

    const out = scrubEvent(event);

    expect(JSON.stringify(out)).not.toContain("leak");
    expect(out.user?.id).toBe("usr_1");
    expect(out.user?.email).toBeUndefined();
    expect(out.user?.ip_address).toBeUndefined();
    expect(out.user?.username).toBeUndefined();
    expect(out.request?.cookies).toBeUndefined();
    const headers = out.request?.headers as Record<string, string>;
    expect(headers.cookie).toBeUndefined();
    expect(headers.authorization).toBeUndefined();
    expect(headers["set-cookie"]).toBeUndefined();
    expect(headers["user-agent"]).toBe("vitest");
  });

  it("never returns null, so the crash signal survives the scrub", () => {
    expect(scrubEvent({ message: "plain failure" } as ErrorEvent)).toBeTruthy();
  });
});
