import { describe, expect, it } from "vitest";

import { specificationBundleFixture } from "../../../tests/fixtures/specificationBundle.js";
import {
  SpecificationFindingError,
  specificationFindingSchema,
  validateSpecificationFindings,
  type SpecificationFinding,
} from "./specificationFinding.js";

const fixture = specificationBundleFixture();
const observedId = fixture.strings.evidence_id;
const inferredId = fixture.functions[1]?.evidence_id ?? "";

const finding = (
  overrides: Partial<SpecificationFinding> = {},
): SpecificationFinding =>
  specificationFindingSchema.parse({
    id: "license-check",
    title: "A license key string is present",
    statement: "The binary contains the literal LICENSE_KEY.",
    kind: "observed",
    evidence_ids: [observedId],
    ...overrides,
  });

const failure = (
  findings: readonly SpecificationFinding[],
): SpecificationFindingError => {
  try {
    validateSpecificationFindings(fixture.bundle, findings);
  } catch (cause: unknown) {
    if (cause instanceof SpecificationFindingError) return cause;
    throw cause;
  }
  throw new Error("Expected the findings to be rejected");
};

describe("specification finding validation", () => {
  it("accepts findings whose citations exist and support their kind", () => {
    expect(() =>
      validateSpecificationFindings(fixture.bundle, [
        finding(),
        finding({ id: "derived", kind: "derived", area: "search_strings" }),
        finding({
          id: "open-question",
          kind: "unknown",
          evidence_ids: [],
          unknown_ids: [fixture.unknown.unknown_id],
        }),
        finding({
          id: "inferred",
          kind: "inferred",
          evidence_ids: [inferredId],
          target_sha256: "a".repeat(64),
        }),
      ]),
    ).not.toThrow();
  });

  it("rejects a citation of Evidence the bundle does not contain", () => {
    const missing = `ev_${"f".repeat(64)}`;
    const error = failure([finding({ evidence_ids: [observedId, missing] })]);
    expect(error.reason).toBe("missing-evidence");
    expect(error.path).toEqual([0, "evidence_ids", 1]);
    expect(error.message).toContain(missing);
  });

  it("rejects a citation of an unknown the bundle does not contain", () => {
    const error = failure([
      finding({ kind: "unknown", unknown_ids: [`unk_${"0".repeat(64)}`] }),
    ]);
    expect(error.reason).toBe("missing-unknown");
    expect(error.path).toEqual([0, "unknown_ids", 0]);
  });

  it("rejects duplicate and reserved ids before any later finding is read", () => {
    expect(failure([finding(), finding()]).reason).toBe("duplicate-id");
    const reserved = failure([finding({ id: "evidence" })]);
    expect(reserved.reason).toBe("reserved-id");
    expect(reserved.path).toEqual([0, "id"]);
  });

  it("rejects areas and targets that are not in the bundle", () => {
    expect(failure([finding({ area: "not_an_operation" })]).reason).toBe(
      "unknown-area",
    );
    expect(failure([finding({ target_sha256: "b".repeat(64) })]).reason).toBe(
      "unknown-target",
    );
  });

  it("rejects a kind stronger than every cited record", () => {
    const uncited = failure([finding({ evidence_ids: [] })]);
    expect(uncited.reason).toBe("confidence-exceeds-evidence");
    expect(uncited.message).toContain("cites no Evidence");
    const weak = failure([finding({ evidence_ids: [inferredId] })]);
    expect(weak.reason).toBe("confidence-exceeds-evidence");
    expect(weak.path).toEqual([0, "kind"]);
    expect(
      failure([finding({ kind: "derived", evidence_ids: [inferredId] })])
        .reason,
    ).toBe("confidence-exceeds-evidence");
    expect(() =>
      validateSpecificationFindings(fixture.bundle, [
        finding({ kind: "inferred", evidence_ids: [inferredId] }),
      ]),
    ).not.toThrow();
  });

  it("constrains finding ids to stable page names", () => {
    expect(
      specificationFindingSchema.safeParse({ ...finding(), id: "Bad Id" })
        .success,
    ).toBe(false);
    expect(
      specificationFindingSchema.safeParse({ ...finding(), id: "-leading" })
        .success,
    ).toBe(false);
    expect(
      specificationFindingSchema.safeParse({ ...finding(), id: "a".repeat(65) })
        .success,
    ).toBe(false);
  });
});
