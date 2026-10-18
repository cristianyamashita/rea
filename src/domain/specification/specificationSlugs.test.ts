import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  assignOperationSlugs,
  RESERVED_SPECIFICATION_NAMES,
  sanitizeSlug,
} from "./specificationSlugs.js";

const suffix = (value: string): string =>
  createHash("sha256").update(value).digest("hex").slice(0, 12);

describe("specification slugs", () => {
  it("lowercases and hyphenates ordinary operation names", () => {
    expect(sanitizeSlug("analyze_function")).toBe("analyze-function");
    expect(sanitizeSlug("Inspect  PE/Resources")).toBe("inspect-pe-resources");
    expect(sanitizeSlug("::")).toBe("");
  });

  it("keeps distinct operations distinct when their sanitized slugs collide", () => {
    const slugs = assignOperationSlugs([
      "analyze_function",
      "analyze-function",
      "search_strings",
    ]);
    expect(slugs.get("search_strings")).toBe("search-strings");
    expect(slugs.get("analyze_function")).toBe(
      `analyze-function-${suffix("analyze_function")}`,
    );
    expect(slugs.get("analyze-function")).toBe(
      `analyze-function-${suffix("analyze-function")}`,
    );
    expect(new Set(slugs.values()).size).toBe(3);
  });

  it("never shadows a structural name and never produces an empty slug", () => {
    const slugs = assignOperationSlugs(["index", "Evidence", "::", "/\\:*?"]);
    for (const [operation, slug] of slugs) {
      expect(slug, operation).not.toBe("");
      expect(RESERVED_SPECIFICATION_NAMES.has(slug), operation).toBe(false);
      expect(slug, operation).toMatch(/^[a-z0-9][a-z0-9-]*$/u);
    }
    expect(slugs.get("index")).toBe(`index-${suffix("index")}`);
    expect(slugs.get("::")).toBe(suffix("::"));
  });

  it("is deterministic regardless of input order", () => {
    const forward = assignOperationSlugs(["b_op", "a_op", "a-op"]);
    const backward = assignOperationSlugs(["a-op", "a_op", "b_op"]);
    expect([...forward].sort()).toEqual([...backward].sort());
  });
});
