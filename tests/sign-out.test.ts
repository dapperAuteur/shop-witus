import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  LOCAL_SIGN_OUT_DESTINATION,
  SIGN_OUT_EVERYWHERE_HELP,
  SIGN_OUT_EVERYWHERE_LABEL,
  SIGN_OUT_LABEL,
  endSessionNavigationUrl,
  signOutEverywhere,
  signOutHere,
} from "@/lib/sign-out";

// The buttons import the router and the browser auth client; neither is needed to render markup.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/auth-client", () => ({ authClient: { signOut: vi.fn() } }));

const { SignOutButton, SignOutEverywhereButton } = await import(
  "@/app/dashboard/sign-out-button"
);

const END_SESSION =
  "https://accounts.witus.online/api/idp/oauth2/endsession?client_id=shop-client";
const ORIGIN = "https://shop.witus.online";

describe('"Sign out" (this app only)', () => {
  it("ends the local session and goes to the local destination, never the IdP", async () => {
    const calls: string[] = [];
    await signOutHere({
      signOut: async () => {
        calls.push("signOut");
      },
      goLocal: (path) => calls.push(`go:${path}`),
    });
    expect(calls).toEqual(["signOut", `go:${LOCAL_SIGN_OUT_DESTINATION}`]);
    expect(LOCAL_SIGN_OUT_DESTINATION).toBe("/sign-in");
    expect(calls.join(" ")).not.toContain("endsession");
  });

  it("still goes to the local destination when the sign-out call throws", async () => {
    const goLocal = vi.fn();
    await signOutHere({ signOut: () => Promise.reject(new Error("down")), goLocal });
    expect(goLocal).toHaveBeenCalledWith("/sign-in");
  });

  it('is named exactly "Sign out" and carries no IdP URL', () => {
    const html = renderToStaticMarkup(createElement(SignOutButton));
    expect(SIGN_OUT_LABEL).toBe("Sign out");
    expect(html).toMatch(/<button[^>]*>Sign out<\/button>/);
    expect(html).not.toContain("WitUS");
    expect(html).not.toContain("endsession");
  });
});

describe('"Sign out of WitUS everywhere"', () => {
  it("is absent when the end-session URL is null", () => {
    expect(
      renderToStaticMarkup(createElement(SignOutEverywhereButton, { endSessionUrl: null })),
    ).toBe("");
  });

  it("is present with the help text wired through aria-describedby when configured", () => {
    const html = renderToStaticMarkup(
      createElement(SignOutEverywhereButton, { endSessionUrl: END_SESSION }),
    );
    expect(SIGN_OUT_EVERYWHERE_LABEL).toBe("Sign out of WitUS everywhere");
    expect(SIGN_OUT_EVERYWHERE_HELP).toBe(
      "Also signs you out of WitUS. Other WitUS apps you are signed in to stay signed in until you sign out of them.",
    );
    const describedBy = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(describedBy).toBeTruthy();
    expect(html).toContain(`>${SIGN_OUT_EVERYWHERE_LABEL}</button>`);
    expect(html).toContain(`id="${describedBy}"`);
    expect(html).toContain(SIGN_OUT_EVERYWHERE_HELP);
    // The IdP URL is used on click only, never rendered.
    expect(html).not.toContain("endsession");
  });

  it("ends the local session BEFORE navigating to the IdP", async () => {
    const calls: string[] = [];
    let resolveSignOut!: () => void;
    const done = signOutEverywhere({
      signOut: () =>
        new Promise<void>((resolve) => {
          calls.push("signOut:start");
          resolveSignOut = () => {
            calls.push("signOut:done");
            resolve();
          };
        }),
      navigate: (url) => calls.push(`navigate:${url}`),
      endSessionUrl: END_SESSION,
      origin: ORIGIN,
    });
    await Promise.resolve();
    expect(calls).toEqual(["signOut:start"]);
    resolveSignOut();
    await done;
    expect(calls[1]).toBe("signOut:done");
    expect(calls[2]).toMatch(/^navigate:/);
  });

  it("still navigates to the IdP when the local sign-out throws", async () => {
    const navigate = vi.fn();
    await signOutEverywhere({
      signOut: () => Promise.reject(new Error("down")),
      navigate,
      endSessionUrl: END_SESSION,
      origin: ORIGIN,
    });
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it("navigates to endsession with client_id and an encoded origin + '/'", async () => {
    const navigate = vi.fn();
    await signOutEverywhere({
      signOut: async () => {},
      navigate,
      endSessionUrl: END_SESSION,
      origin: ORIGIN,
    });
    expect(navigate).toHaveBeenCalledWith(
      "https://accounts.witus.online/api/idp/oauth2/endsession?client_id=shop-client" +
        "&post_logout_redirect_uri=https%3A%2F%2Fshop.witus.online%2F",
    );
    expect(endSessionNavigationUrl(END_SESSION, ORIGIN)).toBe(navigate.mock.calls[0][0]);
  });
});
