import { z } from "zod";

import { digestSchema } from "../digests.js";
import { evidenceBundleSchema } from "../evidenceBundle.js";
import { localPathStringSchema } from "../localPath.js";
import { specificationFindingSchema } from "./specificationFinding.js";

const bundleFileSchema = z.strictObject({
  path: localPathStringSchema.describe(
    "Absolute path of a bundle written by export_evidence_bundle or rea evidence-export",
  ),
});

/** Render an indexed Markdown specification tree from an Evidence bundle. */
export const specificationExportInputSchema = z.strictObject({
  evidence_bundle: z
    .union([evidenceBundleSchema, bundleFileSchema])
    .describe(
      "Inline canonical Evidence bundle, or an object with the absolute path of an exported bundle file",
    ),
  output_directory: localPathStringSchema.describe(
    "Absolute absent directory for the specification tree; parent directory must exist",
  ),
  title: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .default("Specification")
    .describe("Title of the root README.md"),
  findings: z
    .array(specificationFindingSchema)
    .default([])
    .describe(
      "Analyst findings organized by the renderer; each must cite Evidence present in the bundle",
    ),
  include_evidence_pages: z
    .boolean()
    .default(true)
    .describe(
      "Write every complete Evidence record as evidence/<evidence_id>.json; false keeps only Markdown pages",
    ),
});
export type SpecificationExportInput = z.output<
  typeof specificationExportInputSchema
>;

const count = z.number().int().min(0);

/** One durably written file, identified by its tree-relative path. */
export const specificationFileSchema = z.strictObject({
  relative_path: z.string().min(1),
  sha256: digestSchema,
  bytes: count,
});
export type SpecificationFile = z.output<typeof specificationFileSchema>;

export const specificationBundleSourceSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("inline") }),
  z.strictObject({
    kind: z.literal("file"),
    path: z.string().min(1),
    sha256: digestSchema,
  }),
]);
export type SpecificationBundleSource = z.output<
  typeof specificationBundleSourceSchema
>;

export const specificationCountsSchema = z.strictObject({
  records: count,
  unknowns: count,
  unknown_heads: count,
  targets: count,
  unattributed_records: count,
  areas: count,
  findings: count,
  findings_by_kind: z.strictObject({
    observed: count,
    derived: count,
    inferred: count,
    unknown: count,
  }),
  files: count,
  bytes: count,
});

/** Persisted manifest, also returned inline with its own descriptor added. */
export const specificationManifestSchema = z.strictObject({
  title: z.string().min(1),
  bundle_source: specificationBundleSourceSchema,
  counts: specificationCountsSchema,
  entry_point: z.literal("README.md"),
  files: z.array(specificationFileSchema),
  specification_digest: digestSchema,
  evidence_pages: z.enum(["written", "omitted"]),
  limitations: z.array(z.string()),
});
export type SpecificationManifest = z.output<
  typeof specificationManifestSchema
>;

/** Verified publication of a specification tree. */
export const specificationExportResultSchema =
  specificationManifestSchema.extend({
    output_directory: z.string().min(1),
    manifest: specificationFileSchema,
  });
export type SpecificationExportResult = z.output<
  typeof specificationExportResultSchema
>;

/** Completed publication retained when cleanup fails after durable commit. */
export interface SpecificationExportPartialObservation {
  readonly kind: "specification-export";
  readonly result: SpecificationExportResult;
}

/** Fixed interpretation limits every specification tree carries. */
export const SPECIFICATION_LIMITATIONS: readonly string[] = [
  "Fact pages are deterministic renderings of Evidence records; findings are caller-authored and labelled by their declared kind.",
  "A specification describes recorded Evidence. The absence of a page is not the absence of behavior, and static Evidence does not establish execution.",
  "normalized_result is summarized by shape on Markdown pages; the complete record is the evidence JSON page or the source bundle.",
];
