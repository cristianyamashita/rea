import type { Evidence } from "../evidence.js";
import type { EvidenceBundle } from "../evidenceBundle.js";
import type { ResidualUnknown } from "../residualUnknown.js";
import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
import type { SpecificationFinding } from "./specificationFinding.js";
import { assignOperationSlugs } from "./specificationSlugs.js";

/** Records whose subject is null are grouped under this explicit pseudo-target. */
export const UNATTRIBUTED_TARGET = "unattributed";

/** Rows per index page before the table continues on `index-<n>.md`. */
export const INDEX_PAGE_ROWS = 100;

export interface SpecificationTarget {
  readonly sha256: string;
  readonly format: string;
  readonly architecture: string | null;
  readonly names: readonly string[];
  readonly localPaths: readonly string[];
  readonly records: readonly Evidence[];
}

export interface SpecificationArea {
  readonly operation: string;
  readonly slug: string;
  readonly predicateTypes: readonly string[];
  readonly records: readonly Evidence[];
  readonly findings: readonly SpecificationFinding[];
}

export interface SpecificationUnknown {
  readonly unknownId: string;
  readonly head: ResidualUnknown;
  readonly history: readonly ResidualUnknown[];
}

export interface SpecificationPlanOptions {
  readonly title: string;
  readonly includeEvidencePages: boolean;
  readonly bundleSha256: string | null;
}

/** Everything the renderer needs, computed once from the canonical bundle. */
export interface SpecificationPlan {
  readonly title: string;
  readonly includeEvidencePages: boolean;
  readonly bundleSha256: string | null;
  readonly bundle: EvidenceBundle;
  readonly records: readonly Evidence[];
  readonly recordsById: ReadonlyMap<string, Evidence>;
  readonly targets: readonly SpecificationTarget[];
  readonly unattributed: readonly Evidence[];
  readonly areas: readonly SpecificationArea[];
  readonly areaByOperation: ReadonlyMap<string, SpecificationArea>;
  readonly findings: readonly SpecificationFinding[];
  readonly generalFindings: readonly SpecificationFinding[];
  readonly findingsByEvidenceId: ReadonlyMap<
    string,
    readonly SpecificationFinding[]
  >;
  readonly findingsByUnknownId: ReadonlyMap<
    string,
    readonly SpecificationFinding[]
  >;
  readonly unknowns: readonly SpecificationUnknown[];
  readonly unknownsByEvidenceId: ReadonlyMap<
    string,
    readonly SpecificationUnknown[]
  >;
}

const sortedUnique = (values: Iterable<string>): string[] =>
  [...new Set(values)].sort(compareUnicodeCodePoints);

const groupBy = <Value>(
  values: Iterable<Value>,
  key: (value: Value) => string,
): Map<string, Value[]> => {
  const groups = new Map<string, Value[]>();
  for (const value of values) {
    const group = groups.get(key(value)) ?? [];
    group.push(value);
    groups.set(key(value), group);
  }
  return groups;
};

const multiMap = <Value>(
  values: Iterable<Value>,
  keys: (value: Value) => readonly string[],
): Map<string, Value[]> => {
  const groups = new Map<string, Value[]>();
  for (const value of values)
    for (const key of new Set(keys(value))) {
      const group = groups.get(key) ?? [];
      group.push(value);
      groups.set(key, group);
    }
  return groups;
};

/**
 * Group a canonical bundle into targets, areas, findings and unknown heads.
 * Input ordering carries no semantics; every list is re-sorted by code point
 * so identical bundles plan identical trees.
 */
export const planSpecificationDocument = (
  bundle: EvidenceBundle,
  findings: readonly SpecificationFinding[],
  options: SpecificationPlanOptions,
): SpecificationPlan => {
  const records = [...bundle.records].sort((left, right) =>
    compareUnicodeCodePoints(left.evidence_id, right.evidence_id),
  );
  const recordsById = new Map(
    records.map((record) => [record.evidence_id, record]),
  );
  const sortedFindings = [...findings].sort((left, right) =>
    compareUnicodeCodePoints(left.id, right.id),
  );

  const attributed = records.filter((record) => record.subject !== null);
  const unattributed = records.filter((record) => record.subject === null);
  const targets = [
    ...groupBy(attributed, (record) => record.subject?.digest.sha256 ?? ""),
  ]
    .sort(([left], [right]) => compareUnicodeCodePoints(left, right))
    .map(([sha256, targetRecords]): SpecificationTarget => {
      const subjects = targetRecords.flatMap((record) =>
        record.subject === null ? [] : [record.subject],
      );
      const first = subjects[0];
      return {
        sha256,
        format: first?.format ?? "unknown",
        architecture: first?.architecture ?? null,
        names: sortedUnique(subjects.map(({ name }) => name)),
        localPaths: sortedUnique(subjects.map(({ local_path }) => local_path)),
        records: targetRecords,
      };
    });

  const slugs = assignOperationSlugs(records.map(({ operation }) => operation));
  const findingsByArea = groupBy(
    sortedFindings.filter((finding) => finding.area !== undefined),
    (finding) => finding.area ?? "",
  );
  const areas = [...groupBy(records, (record) => record.operation)]
    .sort(([left], [right]) => compareUnicodeCodePoints(left, right))
    .map(([operation, areaRecords]): SpecificationArea => ({
      operation,
      slug: slugs.get(operation) ?? operation,
      predicateTypes: sortedUnique(
        areaRecords.map(({ predicate_type }) => predicate_type),
      ),
      records: areaRecords,
      findings: findingsByArea.get(operation) ?? [],
    }));

  const histories = groupBy(bundle.unknowns, ({ unknown_id }) => unknown_id);
  const unknowns = [...histories]
    .sort(([left], [right]) => compareUnicodeCodePoints(left, right))
    .map(([unknownId, revisions]): SpecificationUnknown => {
      const history = [...revisions].sort(
        (left, right) => left.revision - right.revision,
      );
      const head = history.at(-1);
      if (head === undefined)
        throw new TypeError(`Residual unknown ${unknownId} has no revisions`);
      return { unknownId, head, history };
    });

  return {
    title: options.title,
    includeEvidencePages: options.includeEvidencePages,
    bundleSha256: options.bundleSha256,
    bundle,
    records,
    recordsById,
    targets,
    unattributed,
    areas,
    areaByOperation: new Map(areas.map((area) => [area.operation, area])),
    findings: sortedFindings,
    generalFindings: sortedFindings.filter(
      (finding) => finding.area === undefined,
    ),
    findingsByEvidenceId: multiMap(
      sortedFindings,
      ({ evidence_ids }) => evidence_ids,
    ),
    findingsByUnknownId: multiMap(
      sortedFindings,
      ({ unknown_ids }) => unknown_ids,
    ),
    unknowns,
    unknownsByEvidenceId: multiMap(unknowns, ({ head }) => [
      ...head.supporting_evidence_ids,
      ...head.contradicting_evidence_ids,
      ...(head.resolution?.evidence_ids ?? []),
    ]),
  };
};

/** Count values per key in first-seen order, then sort keys by code point. */
export const tally = (
  values: Iterable<string>,
): readonly (readonly [string, number])[] => {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].sort(([left], [right]) =>
    compareUnicodeCodePoints(left, right),
  );
};
