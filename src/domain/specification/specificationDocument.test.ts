import { posix } from "node:path";

import { describe, expect, it } from "vitest";

import { specificationBundleFixture } from "../../../tests/fixtures/specificationBundle.js";
import {
  INDEX_PAGE_ROWS,
  planSpecificationDocument,
  UNATTRIBUTED_TARGET,
} from "./specificationDocument.js";
import {
  buildSpecificationManifest,
  renderSpecificationFiles,
  type RenderedSpecificationFile,
} from "./specificationMarkdown.js";
import {
  specificationFindingSchema,
  type SpecificationFinding,
} from "./specificationFinding.js";

const fixture = specificationBundleFixture();

const findings: SpecificationFinding[] = [
  specificationFindingSchema.parse({
    id: "license-check",
    title: "A license key string is present",
    statement: "The binary contains the literal `LICENSE_KEY` near 0x5000.",
    kind: "observed",
    area: "search_strings",
    target_sha256: "a".repeat(64),
    evidence_ids: [fixture.strings.evidence_id],
  }),
  specificationFindingSchema.parse({
    id: "startup-order",
    title: "Startup ordering is unobserved",
    statement: "Whether the license check precedes window creation is open.",
    kind: "unknown",
    unknown_ids: [fixture.unknown.unknown_id],
  }),
];

const render = (
  bundle = fixture.bundle,
  options: {
    includeEvidencePages?: boolean;
    found?: SpecificationFinding[];
  } = {},
): Map<string, RenderedSpecificationFile> => {
  const plan = planSpecificationDocument(bundle, options.found ?? findings, {
    title: "Demo specification",
    includeEvidencePages: options.includeEvidencePages ?? true,
    bundleSha256: null,
  });
  return new Map(
    [...renderSpecificationFiles(plan)].map((file) => [
      file.relativePath,
      file,
    ]),
  );
};

const LINK = /\]\(([^)\s]+)\)/gu;

describe("specification document plan", () => {
  it("groups records into targets, areas and unknown heads deterministically", () => {
    const plan = planSpecificationDocument(fixture.bundle, findings, {
      title: "Demo",
      includeEvidencePages: true,
      bundleSha256: null,
    });
    expect(plan.targets.map(({ sha256 }) => sha256)).toEqual(["a".repeat(64)]);
    expect(plan.targets[0]?.format).toBe("pe");
    expect(plan.unattributed.map(({ operation }) => operation)).toEqual([
      "compare_artifacts",
    ]);
    expect(plan.areas.map(({ operation }) => operation)).toEqual([
      "analyze_function",
      "compare_artifacts",
      "record_unknown",
      "search_strings",
    ]);
    expect(plan.areaByOperation.get("search_strings")?.findings).toHaveLength(
      1,
    );
    expect(plan.generalFindings.map(({ id }) => id)).toEqual(["startup-order"]);
    expect(plan.unknowns).toHaveLength(1);
    expect(plan.unknowns[0]?.head.revision).toBe(1);
    expect(
      plan.findingsByEvidenceId.get(fixture.strings.evidence_id),
    ).toHaveLength(1);
    expect(
      plan.unknownsByEvidenceId.get(fixture.functions[0]?.evidence_id ?? ""),
    ).toHaveLength(1);
  });
});

describe("specification rendering", () => {
  it("renders byte-identical trees for the same bundle regardless of record order", () => {
    const first = render();
    const second = render({
      ...fixture.bundle,
      records: [...fixture.bundle.records].reverse(),
    });
    expect([...second.keys()]).toEqual([...first.keys()]);
    for (const [path, file] of first)
      expect(second.get(path)?.sha256, path).toBe(file.sha256);
  });

  it("links only to files that exist in the tree", () => {
    const files = render();
    expect(files.has("README.md")).toBe(true);
    for (const [path, file] of files) {
      if (!path.endsWith(".md")) continue;
      const text = file.bytes.toString("utf8");
      for (const match of text.matchAll(LINK)) {
        const target = posix.normalize(
          posix.join(posix.dirname(path), match[1] ?? ""),
        );
        expect(files.has(target), `${path} → ${match[1] ?? ""}`).toBe(true);
      }
    }
  });

  it("writes one fact page and one evidence page per record under its area", () => {
    const files = render();
    for (const record of fixture.bundle.records) {
      const area = record.operation.replaceAll("_", "-");
      expect(files.has(`areas/${area}/items/${record.evidence_id}.md`)).toBe(
        true,
      );
      expect(files.has(`evidence/${record.evidence_id}.json`)).toBe(true);
      expect(
        JSON.parse(
          files
            .get(`evidence/${record.evidence_id}.json`)
            ?.bytes.toString("utf8") ?? "",
        ),
      ).toEqual(record);
    }
    const factPage = files
      .get(
        `areas/analyze-function/items/${fixture.functions[0]?.evidence_id ?? ""}.md`,
      )
      ?.bytes.toString("utf8");
    expect(factPage).toContain("| `pseudo_code` | string |");
    expect(factPage).not.toContain("secret_marker");
    expect(factPage).toContain("Indirect call targets remain unknown.");
    expect(factPage).toContain(fixture.unknown.unknown_id);
    expect(files.has(`targets/${UNATTRIBUTED_TARGET}.md`)).toBe(true);
  });

  it("omits evidence pages and their links when not requested", () => {
    const files = render(fixture.bundle, { includeEvidencePages: false });
    expect([...files.keys()].some((path) => path.startsWith("evidence/"))).toBe(
      false,
    );
    const factPage = files
      .get(`areas/search-strings/items/${fixture.strings.evidence_id}.md`)
      ?.bytes.toString("utf8");
    expect(factPage).not.toContain("evidence/");
  });

  it("renders findings by area with their kind and citations", () => {
    const files = render();
    const index = files.get("findings/index.md")?.bytes.toString("utf8") ?? "";
    expect(index).toContain("## General");
    expect(index).toContain("Area [search_strings]");
    const page =
      files.get("findings/license-check.md")?.bytes.toString("utf8") ?? "";
    expect(page).toContain("| Kind | observed |");
    expect(page).toContain(fixture.strings.evidence_id);
    expect(page).toContain("`LICENSE_KEY`");
    const unknownPage =
      files
        .get(`unknowns/${fixture.unknown.unknown_id}.md`)
        ?.bytes.toString("utf8") ?? "";
    expect(unknownPage).toContain("startup-order");
    expect(unknownPage).toContain("Observe ordering at runtime.");
  });

  it("pages an area index past the row cap without dropping rows", () => {
    const large = specificationBundleFixture(INDEX_PAGE_ROWS + 1);
    const files = render(large.bundle, { found: [] });
    const first =
      files.get("areas/analyze-function/index.md")?.bytes.toString("utf8") ??
      "";
    const second =
      files.get("areas/analyze-function/index-2.md")?.bytes.toString("utf8") ??
      "";
    expect(files.has("areas/analyze-function/index-3.md")).toBe(false);
    expect(first).toContain(
      `Page 1 of 2 (rows 1–${String(INDEX_PAGE_ROWS)} of ${String(INDEX_PAGE_ROWS + 1)})`,
    );
    expect(first).toContain("[Next page](index-2.md)");
    expect(second).toContain(
      `Page 2 of 2 (rows ${String(INDEX_PAGE_ROWS + 1)}–${String(INDEX_PAGE_ROWS + 1)} of ${String(INDEX_PAGE_ROWS + 1)})`,
    );
    expect(second).toContain("[Previous page](index.md)");
    const listed = new Set(
      [first, second].flatMap((text) =>
        [...text.matchAll(/items\/(ev_[a-f0-9]{64})\.md/gu)].map((m) => m[1]),
      ),
    );
    expect(listed.size).toBe(INDEX_PAGE_ROWS + 1);
  });

  it("builds a manifest whose digest covers every file identity", () => {
    const plan = planSpecificationDocument(fixture.bundle, findings, {
      title: "Demo specification",
      includeEvidencePages: true,
      bundleSha256: null,
    });
    const files = [...renderSpecificationFiles(plan)].map((file) => ({
      relative_path: file.relativePath,
      sha256: file.sha256,
      bytes: file.bytes.byteLength,
    }));
    const manifest = buildSpecificationManifest(plan, files, {
      kind: "inline",
    });
    const reordered = buildSpecificationManifest(plan, [...files].reverse(), {
      kind: "inline",
    });
    expect(reordered).toEqual(manifest);
    expect(manifest.counts).toMatchObject({
      records: fixture.bundle.records.length,
      unknown_heads: 1,
      targets: 1,
      unattributed_records: 1,
      areas: 4,
      findings: 2,
      findings_by_kind: { observed: 1, derived: 0, inferred: 0, unknown: 1 },
      files: files.length,
    });
    expect(manifest.specification_digest).toMatch(/^[a-f0-9]{64}$/u);
    const changed = buildSpecificationManifest(
      plan,
      files.map((file, index) =>
        index === 0 ? { ...file, sha256: "0".repeat(64) } : file,
      ),
      { kind: "inline" },
    );
    expect(changed.specification_digest).not.toBe(
      manifest.specification_digest,
    );
  });
});
