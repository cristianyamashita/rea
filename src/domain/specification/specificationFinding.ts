import { z } from "zod";

import { digestSchema, prefixedDigestSchema } from "../digests.js";
import type { EvidenceBundle } from "../evidenceBundle.js";
import { RESERVED_SPECIFICATION_NAMES } from "./specificationSlugs.js";

/** Caller-authored kinds use the Evidence confidence vocabulary plus `unknown`. */
export const SPECIFICATION_FINDING_KINDS = [
  "observed",
  "derived",
  "inferred",
  "unknown",
] as const;

/**
 * One analyst statement about the target, bound to the Evidence it rests on.
 * The renderer organizes findings; it never invents or reclassifies them.
 */
export const specificationFindingSchema = z.strictObject({
  id: z
    .string()
    .regex(
      /^[a-z0-9][a-z0-9-]{0,63}$/u,
      "Finding ids are 1-64 lowercase letters, digits and hyphens starting with a letter or digit",
    )
    .describe("Stable caller-chosen page name, unique within this export"),
  title: z.string().trim().min(1).max(200),
  statement: z
    .string()
    .trim()
    .min(1)
    .describe("Markdown body describing the behavior or structure"),
  kind: z
    .enum(SPECIFICATION_FINDING_KINDS)
    .describe(
      "observed, derived or inferred must be supported by cited Evidence of at least that confidence; unknown marks an open question",
    ),
  area: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Evidence operation this finding belongs to; must exist in the bundle",
    ),
  target_sha256: digestSchema
    .optional()
    .describe("Bundle artifact digest this finding is scoped to"),
  evidence_ids: z.array(prefixedDigestSchema("ev")).default([]),
  unknown_ids: z.array(prefixedDigestSchema("unk")).default([]),
});
export type SpecificationFinding = z.output<typeof specificationFindingSchema>;

export type SpecificationFindingFailureReason =
  | "missing-evidence"
  | "missing-unknown"
  | "duplicate-id"
  | "reserved-id"
  | "unknown-area"
  | "unknown-target"
  | "confidence-exceeds-evidence";

/** A finding cites something the bundle does not contain or claims more than it cites. */
export class SpecificationFindingError extends TypeError {
  constructor(
    readonly reason: SpecificationFindingFailureReason,
    readonly findingId: string,
    /** Request path of the offending value, relative to `findings`. */
    readonly path: readonly (string | number)[],
    message: string,
  ) {
    super(message);
    this.name = "SpecificationFindingError";
  }
}

const CONFIDENCE_RANK = { inferred: 1, derived: 2, observed: 3 } as const;

/**
 * Fail closed before any file is written. Every cited id must exist in the
 * bundle, every area and target must be present, ids must be unique and
 * unreserved, and a finding's kind may not exceed the confidence of the
 * Evidence it cites.
 */
export const validateSpecificationFindings = (
  bundle: EvidenceBundle,
  findings: readonly SpecificationFinding[],
): void => {
  const confidenceById = new Map(
    bundle.records.map((record) => [record.evidence_id, record.confidence]),
  );
  const unknownIds = new Set(
    bundle.unknowns.map(({ unknown_id }) => unknown_id),
  );
  const operations = new Set(bundle.records.map(({ operation }) => operation));
  const targets = new Set(bundle.artifacts.map(({ digest }) => digest.sha256));
  const seen = new Set<string>();
  for (const [index, finding] of findings.entries()) {
    if (RESERVED_SPECIFICATION_NAMES.has(finding.id))
      throw new SpecificationFindingError(
        "reserved-id",
        finding.id,
        [index, "id"],
        `Finding id ${finding.id} is reserved for the specification structure`,
      );
    if (seen.has(finding.id))
      throw new SpecificationFindingError(
        "duplicate-id",
        finding.id,
        [index, "id"],
        `Finding id ${finding.id} is declared more than once`,
      );
    seen.add(finding.id);
    if (finding.area !== undefined && !operations.has(finding.area))
      throw new SpecificationFindingError(
        "unknown-area",
        finding.id,
        [index, "area"],
        `Finding ${finding.id} names area ${finding.area}, which is not an operation in the Evidence bundle`,
      );
    if (
      finding.target_sha256 !== undefined &&
      !targets.has(finding.target_sha256)
    )
      throw new SpecificationFindingError(
        "unknown-target",
        finding.id,
        [index, "target_sha256"],
        `Finding ${finding.id} names target ${finding.target_sha256}, which is not an artifact in the Evidence bundle`,
      );
    for (const [position, evidenceId] of finding.evidence_ids.entries())
      if (!confidenceById.has(evidenceId))
        throw new SpecificationFindingError(
          "missing-evidence",
          finding.id,
          [index, "evidence_ids", position],
          `Finding ${finding.id} cites Evidence ${evidenceId}, which is not in the bundle`,
        );
    for (const [position, unknownId] of finding.unknown_ids.entries())
      if (!unknownIds.has(unknownId))
        throw new SpecificationFindingError(
          "missing-unknown",
          finding.id,
          [index, "unknown_ids", position],
          `Finding ${finding.id} cites residual unknown ${unknownId}, which is not in the bundle`,
        );
    if (finding.kind === "unknown") continue;
    const required = CONFIDENCE_RANK[finding.kind];
    const supported = finding.evidence_ids.some((evidenceId) => {
      const confidence = confidenceById.get(evidenceId);
      return (
        confidence !== undefined && CONFIDENCE_RANK[confidence] >= required
      );
    });
    if (!supported)
      throw new SpecificationFindingError(
        "confidence-exceeds-evidence",
        finding.id,
        [index, "kind"],
        finding.evidence_ids.length === 0
          ? `Finding ${finding.id} is ${finding.kind} but cites no Evidence; cite a record or declare it unknown`
          : `Finding ${finding.id} is ${finding.kind} but no cited Evidence has confidence ${finding.kind} or higher`,
      );
  }
};
