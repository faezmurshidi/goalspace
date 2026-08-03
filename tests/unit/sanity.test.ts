import { describe, expect, it } from "vitest";

describe("harness", () => {
  it("runs and resolves the @ alias", async () => {
    const { cn } = await import("@/lib/utils");
    expect(cn("a", "b")).toBe("a b");
  });
});
