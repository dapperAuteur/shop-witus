import { describe, expect, it } from "vitest";
import {
  SSO_ATTEMPT_STORAGE_KEY,
  WITUS_OIDC_DISCOVERY_FALLBACK,
  continueAsLabel,
  endSessionEndpointFromDiscovery,
  hasAttemptMarker,
  parseSilentSsoIdentity,
  silentSsoDecision,
  silentSsoEndpointFromDiscovery,
  withAttemptMarker,
} from "@/lib/silent-sso";

const DISCOVERY = WITUS_OIDC_DISCOVERY_FALLBACK;

describe("endpoint derivation", () => {
  it("derives the probe from the discovery URL's origin, not a hardcoded host", () => {
    expect(silentSsoEndpointFromDiscovery(DISCOVERY)).toBe(
      "https://accounts.witus.online/api/ecosystem/session",
    );
    expect(silentSsoEndpointFromDiscovery("https://idp.example.test/auth/.well-known/x")).toBe(
      "https://idp.example.test/api/ecosystem/session",
    );
  });

  it("derives endsession from the discovery URL's basePath", () => {
    expect(endSessionEndpointFromDiscovery(DISCOVERY)).toBe(
      "https://accounts.witus.online/api/idp/oauth2/endsession",
    );
    expect(endSessionEndpointFromDiscovery("https://idp.example.test/auth/.well-known/x")).toBe(
      "https://idp.example.test/auth/oauth2/endsession",
    );
  });

  it("returns null rather than guessing when the URL is missing or unparseable", () => {
    for (const bad of [null, undefined, "", "not-a-url", "https://x.test/no-wellknown"]) {
      expect(silentSsoEndpointFromDiscovery(bad)).toBeNull();
      expect(endSessionEndpointFromDiscovery(bad)).toBeNull();
    }
  });
});

describe("silentSsoDecision", () => {
  const endpoint = "https://accounts.witus.online/api/ecosystem/session";

  it("probes when configured, signed out, and not yet attempted", () => {
    expect(silentSsoDecision({ endpoint, search: "" })).toEqual({ attempt: true });
  });

  it("stays dark when the app is not a configured OIDC client", () => {
    expect(silentSsoDecision({ endpoint: null })).toEqual({
      attempt: false,
      skip: "not-configured",
    });
  });

  it("skips when the visitor is already signed in locally", () => {
    expect(silentSsoDecision({ endpoint, signedIn: true })).toEqual({
      attempt: false,
      skip: "already-signed-in",
    });
  });

  it("skips on either half of the loop guard", () => {
    // sessionStorage half.
    expect(silentSsoDecision({ endpoint, attempted: true })).toEqual({
      attempt: false,
      skip: "already-attempted",
    });
    // query-param half, for a browser whose sessionStorage threw.
    expect(silentSsoDecision({ endpoint, search: "?sso=tried" })).toEqual({
      attempt: false,
      skip: "already-attempted",
    });
  });
});

describe("attempt marker", () => {
  it("reads the marker with or without a leading '?'", () => {
    expect(hasAttemptMarker("?sso=tried")).toBe(true);
    expect(hasAttemptMarker("sso=tried")).toBe(true);
    expect(hasAttemptMarker("?sso=nope")).toBe(false);
    expect(hasAttemptMarker("")).toBe(false);
    expect(hasAttemptMarker(null)).toBe(false);
  });

  it("adds the marker without dropping existing query or hash", () => {
    expect(withAttemptMarker("/sign-in")).toBe("/sign-in?sso=tried");
    expect(withAttemptMarker("/sign-in?next=%2Fdashboard")).toBe(
      "/sign-in?next=%2Fdashboard&sso=tried",
    );
    expect(withAttemptMarker("/sign-in#form")).toBe("/sign-in?sso=tried#form");
  });

  it("pins the storage key — changing it silently disables the loop guard", () => {
    expect(SSO_ATTEMPT_STORAGE_KEY).toBe("witus.sso.attempted");
  });
});

describe("parseSilentSsoIdentity", () => {
  it("reads the IdP's { signedIn, user: { name } } shape", () => {
    expect(parseSilentSsoIdentity({ signedIn: true, user: { name: "Brand" } })).toEqual({
      label: "Brand",
    });
  });

  it("renders nothing for a signed-out or unusable answer", () => {
    for (const payload of [
      { signedIn: false },
      { signedIn: true, user: { name: "   " } },
      { signedIn: true, user: {} },
      null,
      undefined,
      "Brand",
      42,
    ]) {
      expect(parseSilentSsoIdentity(payload)).toBeNull();
    }
  });

  it("sanitizes the label: control chars stripped, trimmed, length-capped", () => {
    expect(parseSilentSsoIdentity({ user: { name: "  Br\u0000a\u001Fnd\u007F  " } })).toEqual({
      label: "Brand",
    });
    const long = parseSilentSsoIdentity({ user: { name: "N".repeat(200) } });
    expect(long?.label).toHaveLength(48);
    expect(long?.label.endsWith("…")).toBe(true);
  });

  it("falls back to email only when there is no name", () => {
    expect(parseSilentSsoIdentity({ user: { email: "brand@example.test" } })).toEqual({
      label: "brand@example.test",
    });
  });
});

describe("continueAsLabel", () => {
  it("keeps the normal label when the probe found nothing — a failed check is invisible", () => {
    expect(continueAsLabel(null)).toBe("Sign in with WitUS");
  });

  it("swaps to 'Continue as <name>' on a hit", () => {
    expect(continueAsLabel({ label: "Brand" })).toBe("Continue as Brand");
  });
});
