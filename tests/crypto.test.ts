import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

describe("encryptSecret / decryptSecret", () => {
  it("round-trips back to the original plaintext", () => {
    const plain = "wix-instance-id-abc123";
    const enc = encryptSecret(plain);
    expect(enc).not.toContain(plain);
    expect(enc.split(".")).toHaveLength(3);
    expect(decryptSecret(enc)).toBe(plain);
  });

  it("rejects tampered ciphertext (GCM auth tag)", () => {
    const enc = encryptSecret("secret");
    const [iv, tag, ct] = enc.split(".");
    const flipped = ct === "AAAAAA" ? "BBBBBB" : "AAAAAA";
    expect(() => decryptSecret(`${iv}.${tag}.${flipped}`)).toThrow();
  });

  it("rejects malformed input", () => {
    expect(() => decryptSecret("not-valid")).toThrow();
  });
});
