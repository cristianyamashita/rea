import { createHash } from "node:crypto";

import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";

/**
 * Directory and page names the specification tree uses for its own structure.
 * A caller-supplied finding id or a derived operation slug may not shadow them.
 */
export const RESERVED_SPECIFICATION_NAMES: ReadonlySet<string> = new Set([
  "index",
  "items",
  "manifest",
  "readme",
  "evidence",
  "findings",
  "unknowns",
  "targets",
  "areas",
  "coverage",
  "unattributed",
]);

/** Lowercase ASCII words joined by single hyphens; empty when nothing survives. */
export const sanitizeSlug = (value: string): string =>
  value
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");

const disambiguate = (original: string, slug: string): string => {
  const suffix = createHash("sha256")
    .update(original)
    .digest("hex")
    .slice(0, 12);
  return slug === "" ? suffix : `${slug}-${suffix}`;
};

/**
 * Assign one filesystem-safe slug per distinct operation string. A sanitized
 * slug that is empty, reserved, or shared by two distinct operations is
 * suffixed with the first twelve hex characters of the original's SHA-256 so
 * every member of a colliding set stays distinct and deterministic.
 */
export const assignOperationSlugs = (
  operations: Iterable<string>,
): ReadonlyMap<string, string> => {
  const distinct = [...new Set(operations)].sort(compareUnicodeCodePoints);
  const sanitized = new Map<string, string>();
  const owners = new Map<string, string[]>();
  for (const operation of distinct) {
    const slug = sanitizeSlug(operation);
    sanitized.set(operation, slug);
    const members = owners.get(slug) ?? [];
    members.push(operation);
    owners.set(slug, members);
  }
  const assigned = new Map<string, string>();
  for (const operation of distinct) {
    const slug = sanitized.get(operation) ?? "";
    const collides =
      slug === "" ||
      RESERVED_SPECIFICATION_NAMES.has(slug) ||
      (owners.get(slug)?.length ?? 0) > 1;
    assigned.set(operation, collides ? disambiguate(operation, slug) : slug);
  }
  return assigned;
};
