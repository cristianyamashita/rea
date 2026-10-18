import { createHash } from "node:crypto";
import { posix } from "node:path";

import type { Evidence } from "../evidence.js";
import { canonicalJsonParts } from "../jsonSerialization.js";
import type { JsonValue } from "../jsonValue.js";
import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
import {
  INDEX_PAGE_ROWS,
  tally,
  type SpecificationArea,
  type SpecificationPlan,
} from "./specificationDocument.js";
import type { SpecificationFinding } from "./specificationFinding.js";

/** One file of the specification tree, fully materialized before writing. */
export interface RenderedSpecificationFile {
  readonly relativePath: string;
  readonly bytes: Buffer;
  readonly sha256: string;
}

export const MANIFEST_PATH = "manifest.json";
export const README_PATH = "README.md";
export const CELL_LIMIT = 120;

export const sha256 = (bytes: Buffer): string =>
  createHash("sha256").update(bytes).digest("hex");

export const file = (
  relativePath: string,
  text: string,
): RenderedSpecificationFile => {
  const bytes = Buffer.from(text, "utf8");
  return { relativePath, bytes, sha256: sha256(bytes) };
};

export const canonicalJson = (value: unknown): string =>
  [...canonicalJsonParts(value)].join("");

export const link = (text: string, from: string, to: string): string =>
  `[${escapeCell(text)}](${posix.relative(posix.dirname(from), to)})`;

export const escapeCell = (text: string): string =>
  text.replace(/\\/gu, "\\\\").replace(/\|/gu, "\\|").replace(/\s+/gu, " ");

export const code = (text: string): string => `\`${text.replace(/`/gu, "'")}\``;

export const truncate = (text: string, limit = CELL_LIMIT): string =>
  text.length <= limit ? text : `${text.slice(0, limit)}…`;

export const table = (
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): string =>
  rows.length === 0
    ? "_None._\n"
    : [
        `| ${headers.join(" | ")} |`,
        `| ${headers.map(() => "---").join(" | ")} |`,
        ...rows.map((row) => `| ${row.join(" | ")} |`),
      ].join("\n") + "\n";

export const fenced = (language: string, text: string): string =>
  `\`\`\`${language}\n${text}\n\`\`\`\n`;

export const section = (heading: string, body: string): string =>
  `## ${heading}\n\n${body.trimEnd()}\n\n`;

export const pageName = (base: string, page: number): string =>
  page === 1 ? `${base}.md` : `${base}-${String(page)}.md`;

/**
 * Split one table over as many pages as its rows need. Every page carries the
 * same intro, its row range, and previous/next links so no row is reachable
 * only by reading every page. The cap is a readability rule for a table meant
 * to be scanned, not an agent budget; nothing is omitted.
 */
export interface PagedTableOptions {
  readonly directory: string;
  readonly base: string;
  readonly title: string;
  /** Text above the table, rendered on every page; receives the page path for links. */
  readonly intro: (page: string) => string;
  readonly headers: readonly string[];
  /** Complete row set, rendered relative to the page path. */
  readonly rows: (page: string) => readonly (readonly string[])[];
}

export const pagedTable = ({
  directory,
  base,
  title,
  intro,
  headers,
  rows,
}: PagedTableOptions): RenderedSpecificationFile[] => {
  const firstPage = posix.join(directory, pageName(base, 1));
  const total = rows(firstPage).length;
  const pageCount = Math.max(1, Math.ceil(total / INDEX_PAGE_ROWS));
  const files: RenderedSpecificationFile[] = [];
  for (let page = 1; page <= pageCount; page += 1) {
    const path = posix.join(directory, pageName(base, page));
    const start = (page - 1) * INDEX_PAGE_ROWS;
    const slice = rows(path).slice(start, start + INDEX_PAGE_ROWS);
    const navigation = [
      page > 1
        ? link(
            "Previous page",
            path,
            posix.join(directory, pageName(base, page - 1)),
          )
        : null,
      page < pageCount
        ? link(
            "Next page",
            path,
            posix.join(directory, pageName(base, page + 1)),
          )
        : null,
    ].filter((entry): entry is string => entry !== null);
    const range =
      total === 0
        ? "No rows."
        : `Page ${String(page)} of ${String(pageCount)} (rows ${String(start + 1)}–${String(start + slice.length)} of ${String(total)}).`;
    files.push(
      file(
        path,
        `# ${title}\n\n${intro(path)}${range}${navigation.length === 0 ? "" : ` ${navigation.join(" · ")}`}\n\n${table(headers, slice)}`,
      ),
    );
  }
  return files;
};

export const targetPath = (sha256Digest: string): string =>
  `targets/${sha256Digest}.md`;
export const areaPath = (area: SpecificationArea): string =>
  `areas/${area.slug}/index.md`;
export const itemPath = (plan: SpecificationPlan, record: Evidence): string => {
  const area = plan.areaByOperation.get(record.operation);
  if (area === undefined)
    throw new TypeError(`Record ${record.evidence_id} has no planned area`);
  return `areas/${area.slug}/items/${record.evidence_id}.md`;
};
export const evidencePath = (record: Evidence): string =>
  `evidence/${record.evidence_id}.json`;
export const findingPath = (finding: SpecificationFinding): string =>
  `findings/${finding.id}.md`;
export const unknownPath = (unknownId: string): string =>
  `unknowns/${unknownId}.md`;

export const recordLink = (
  plan: SpecificationPlan,
  from: string,
  record: Evidence,
): string => link(record.evidence_id, from, itemPath(plan, record));

export const evidenceIdLink = (
  plan: SpecificationPlan,
  from: string,
  evidenceId: string,
): string => {
  const record = plan.recordsById.get(evidenceId);
  return record === undefined
    ? `${code(evidenceId)} (not in this bundle)`
    : recordLink(plan, from, record);
};

export const unknownLink = (
  plan: SpecificationPlan,
  from: string,
  unknownId: string,
): string =>
  plan.unknowns.some((unknown) => unknown.unknownId === unknownId)
    ? link(unknownId, from, unknownPath(unknownId))
    : `${code(unknownId)} (not in this bundle)`;

export const findingRow = (
  from: string,
  finding: SpecificationFinding,
): readonly string[] => [
  link(finding.title, from, findingPath(finding)),
  finding.kind,
  finding.area === undefined ? "—" : code(finding.area),
  String(finding.evidence_ids.length),
  String(finding.unknown_ids.length),
];
export const FINDING_HEADERS = [
  "Finding",
  "Kind",
  "Area",
  "Evidence",
  "Unknowns",
] as const;

export const confidenceAuthority = (record: Evidence): string =>
  `${record.confidence} / ${record.authority}`;

export const describeShape = (value: JsonValue): string => {
  if (value === null || typeof value !== "object")
    return `Scalar ${typeof value}: ${code(truncate(JSON.stringify(value)))}\n`;
  if (Array.isArray(value)) {
    const kinds = tally(value.map((item) => jsonKind(item)));
    return `Array of ${String(value.length)} item(s): ${kinds.map(([kind, count]) => `${kind} ×${String(count)}`).join(", ") || "none"}\n`;
  }
  const entries = Object.entries(value).sort(([left], [right]) =>
    compareUnicodeCodePoints(left, right),
  );
  return table(
    ["Key", "Type", "Size"],
    entries.map(([key, item]) => [code(key), jsonKind(item), jsonSize(item)]),
  );
};

export const jsonKind = (value: JsonValue): string =>
  value === null ? "null" : Array.isArray(value) ? "array" : typeof value;

export const jsonSize = (value: JsonValue): string =>
  Array.isArray(value)
    ? `${String(value.length)} item(s)`
    : typeof value === "string"
      ? `${String(value.length)} char(s)`
      : value !== null && typeof value === "object"
        ? `${String(Object.keys(value).length)} key(s)`
        : "—";

export const location = (
  entry: Evidence["locations"][number],
): readonly string[] => {
  switch (entry.kind) {
    case "address":
      return ["address", code(entry.address)];
    case "address-range":
      return ["address-range", `${code(entry.start)} – ${code(entry.end)}`];
    case "artifact-path":
      return ["artifact-path", code(entry.path)];
    case "file-offset":
      return ["file-offset", String(entry.offset)];
    case "file-offset-range":
      return [
        "file-offset-range",
        `${String(entry.start)} – ${String(entry.end)}`,
      ];
  }
};

export const areaRowsForRecords = (
  plan: SpecificationPlan,
  from: string,
  records: readonly Evidence[],
): (readonly string[])[] =>
  tally(records.map(({ operation }) => operation)).map(([operation, count]) => {
    const area = plan.areaByOperation.get(operation);
    return [
      area === undefined
        ? code(operation)
        : link(operation, from, areaPath(area)),
      String(count),
    ];
  });

export const limitationTally = (
  from: string,
  plan: SpecificationPlan,
  records: readonly Evidence[],
): string => {
  const byLimitation = new Map<string, Evidence[]>();
  for (const record of records)
    for (const limitation of new Set(record.limitations)) {
      const group = byLimitation.get(limitation) ?? [];
      group.push(record);
      byLimitation.set(limitation, group);
    }
  const rows = [...byLimitation]
    .sort(([left], [right]) => compareUnicodeCodePoints(left, right))
    .map(([limitation, carriers]) => [
      escapeCell(limitation),
      String(carriers.length),
      carriers.length <= 5
        ? carriers.map((record) => recordLink(plan, from, record)).join(", ")
        : `${carriers
            .slice(0, 5)
            .map((record) => recordLink(plan, from, record))
            .join(", ")}, … (${String(carriers.length - 5)} more)`,
    ]);
  return table(["Limitation", "Records", "Carried by"], rows);
};
