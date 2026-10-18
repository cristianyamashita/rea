import { digestCanonicalValue } from "../canonicalDigest.js";
import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
import {
  UNATTRIBUTED_TARGET,
  type SpecificationPlan,
} from "./specificationDocument.js";
import {
  SPECIFICATION_LIMITATIONS,
  type SpecificationBundleSource,
  type SpecificationFile,
  type SpecificationManifest,
} from "./specificationExport.js";
import {
  evidencePage,
  findingPage,
  findingsIndex,
  itemPage,
  unknownPage,
  unknownsIndex,
} from "./specificationDetailPages.js";
import {
  areaPages,
  areasIndex,
  coveragePage,
  readme,
  targetPage,
  targetsIndex,
  unattributedPage,
} from "./specificationIndexPages.js";
import type { RenderedSpecificationFile } from "./specificationMarkdownPrimitives.js";

export type { RenderedSpecificationFile } from "./specificationMarkdownPrimitives.js";
export { MANIFEST_PATH as SPECIFICATION_MANIFEST_PATH } from "./specificationMarkdownPrimitives.js";

export function* renderSpecificationFiles(
  plan: SpecificationPlan,
): Generator<RenderedSpecificationFile> {
  yield readme(plan);
  yield* targetsIndex(plan);
  for (const target of plan.targets) yield targetPage(plan, target);
  yield* unattributedPage(plan);
  yield areasIndex(plan);
  for (const area of plan.areas) {
    yield* areaPages(plan, area);
    for (const record of area.records) yield itemPage(plan, record);
  }
  yield findingsIndex(plan);
  for (const finding of plan.findings) yield findingPage(plan, finding);
  yield* unknownsIndex(plan);
  for (const unknown of plan.unknowns) yield unknownPage(plan, unknown);
  yield coveragePage(plan);
  if (plan.includeEvidencePages)
    for (const record of plan.records) yield evidencePage(record);
}

/** The manifest written last; its digest covers every other file's identity. */
export const buildSpecificationManifest = (
  plan: SpecificationPlan,
  written: readonly SpecificationFile[],
  bundleSource: SpecificationBundleSource,
): SpecificationManifest => {
  const files = [...written].sort((left, right) =>
    compareUnicodeCodePoints(left.relative_path, right.relative_path),
  );
  const kinds = { observed: 0, derived: 0, inferred: 0, unknown: 0 };
  for (const finding of plan.findings) kinds[finding.kind] += 1;
  return {
    title: plan.title,
    bundle_source: bundleSource,
    counts: {
      records: plan.records.length,
      unknowns: plan.bundle.unknowns.length,
      unknown_heads: plan.unknowns.length,
      targets: plan.targets.length,
      unattributed_records: plan.unattributed.length,
      areas: plan.areas.length,
      findings: plan.findings.length,
      findings_by_kind: kinds,
      files: files.length,
      bytes: files.reduce((total, entry) => total + entry.bytes, 0),
    },
    entry_point: "README.md",
    files,
    specification_digest: digestCanonicalValue(files, "Specification"),
    evidence_pages: plan.includeEvidencePages ? "written" : "omitted",
    limitations: [
      ...SPECIFICATION_LIMITATIONS,
      ...(plan.includeEvidencePages
        ? []
        : [
            "Complete Evidence JSON pages were omitted by request; result values are only in the source bundle.",
          ]),
      ...(plan.unattributed.length === 0
        ? []
        : [
            `${String(plan.unattributed.length)} record(s) carry no artifact subject and are listed under targets/${UNATTRIBUTED_TARGET}.md.`,
          ]),
      ...(plan.findings.length === 0
        ? [
            "No analyst findings were supplied; the tree contains only deterministic fact pages.",
          ]
        : []),
    ],
  };
};
