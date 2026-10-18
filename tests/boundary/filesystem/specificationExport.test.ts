import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  readdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it, onTestFinished, vi } from "vitest";

import { exportSpecification } from "../../../src/application/SpecificationExportService.js";
import { ArtifactResourceScope } from "../../../src/artifacts/ArtifactResourceScope.js";
import { SafeOutputTree } from "../../../src/artifacts/SafeOutputTree.js";
import { serializeEvidenceBundle } from "../../../src/domain/evidenceBundle.js";
import { projectAnalysisError } from "../../../src/domain/analysisErrorProjection.js";
import {
  specificationExportResultSchema,
  specificationManifestSchema,
} from "../../../src/domain/specification/specificationExport.js";
import { specificationBundleFixture } from "../../fixtures/specificationBundle.js";
import { createTestTempDirectory } from "../../fixtures/temporaryDirectory.js";

const fixture = specificationBundleFixture();

const setup = async () => {
  const root = await createTestTempDirectory("rea-specification-export-");
  const resources = new ArtifactResourceScope();
  onTestFinished(() => resources.close());
  const bundlePath = join(root, "bundle.json");
  const bundleBytes = Buffer.from(serializeEvidenceBundle(fixture.bundle));
  await writeFile(bundlePath, bundleBytes);
  return {
    root,
    resources,
    bundlePath,
    bundleSha256: createHash("sha256").update(bundleBytes).digest("hex"),
  };
};

const findings = [
  {
    id: "license-check",
    title: "A license key string is present",
    statement: "The binary contains the literal LICENSE_KEY near 0x5000.",
    kind: "observed",
    area: "search_strings",
    evidence_ids: [fixture.strings.evidence_id],
  },
  {
    id: "startup-order",
    title: "Startup ordering is unobserved",
    statement: "Whether the license check precedes window creation is open.",
    kind: "unknown",
    unknown_ids: [fixture.unknown.unknown_id],
  },
];

const listFiles = async (directory: string, prefix = ""): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const relative = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory())
      files.push(...(await listFiles(join(directory, entry.name), relative)));
    else files.push(relative);
  }
  return files.sort();
};

describe("specification export publication boundary", () => {
  it("writes a verified tree from a bundle file and binds the record to that file", async () => {
    const { root, resources, bundlePath, bundleSha256 } = await setup();
    const outputDirectory = join(root, "specification");
    const exported = await exportSpecification(
      {
        evidence_bundle: { path: bundlePath },
        output_directory: outputDirectory,
        title: "Demo specification",
        findings,
      },
      resources,
    );
    if (!exported.ok) throw exported.error;
    const evidence = exported.value;
    expect(evidence.operation).toBe("export_specification");
    expect(evidence.subject?.digest.sha256).toBe(bundleSha256);
    expect(evidence.subject?.local_path).toBe(bundlePath);
    expect(evidence.confidence).toBe("derived");
    expect(evidence.evidence_links).toEqual([fixture.strings.evidence_id]);
    const result = specificationExportResultSchema.parse(
      evidence.normalized_result,
    );
    expect(result.output_directory).toBe(outputDirectory);
    expect(result.bundle_source).toEqual({
      kind: "file",
      path: bundlePath,
      sha256: bundleSha256,
    });
    expect(result.entry_point).toBe("README.md");
    expect(result.evidence_pages).toBe("written");
    expect(result.counts).toMatchObject({
      records: fixture.bundle.records.length,
      findings: 2,
      unattributed_records: 1,
      files: result.files.length,
    });

    const onDisk = await listFiles(outputDirectory);
    expect(onDisk).toEqual(
      [
        ...result.files.map(({ relative_path }) => relative_path),
        "manifest.json",
      ].sort(),
    );
    for (const file of [...result.files, result.manifest]) {
      const bytes = await readFile(join(outputDirectory, file.relative_path));
      expect(bytes.byteLength, file.relative_path).toBe(file.bytes);
      expect(
        createHash("sha256").update(bytes).digest("hex"),
        file.relative_path,
      ).toBe(file.sha256);
    }
    const manifest = specificationManifestSchema.parse(
      JSON.parse(
        await readFile(join(outputDirectory, "manifest.json"), "utf8"),
      ),
    );
    const {
      manifest: _descriptor,
      output_directory: _output,
      ...inlineManifest
    } = result;
    expect(manifest).toEqual(inlineManifest);
    expect(evidence.locations).toEqual([
      { kind: "artifact-path", path: `${outputDirectory}/manifest.json` },
    ]);

    const readme = await readFile(join(outputDirectory, "README.md"), "utf8");
    expect(readme).toContain("# Demo specification");
    expect(readme).toContain(bundleSha256);
    expect(readme).not.toContain(root);
    expect(readme).toContain("[search_strings](areas/search-strings/index.md)");
  });
});

describe("specification export determinism", () => {
  it("produces the same specification digest in a different directory and from an inline bundle", async () => {
    const { root, resources, bundlePath } = await setup();
    const fromFile = await exportSpecification(
      {
        evidence_bundle: { path: bundlePath },
        output_directory: join(root, "first"),
        findings,
      },
      resources,
    );
    const again = await exportSpecification(
      {
        evidence_bundle: { path: bundlePath },
        output_directory: join(root, "second"),
        findings,
      },
      resources,
    );
    const inline = await exportSpecification(
      {
        evidence_bundle: fixture.bundle,
        output_directory: join(root, "third"),
        findings,
      },
      resources,
    );
    if (!fromFile.ok) throw fromFile.error;
    if (!again.ok) throw again.error;
    if (!inline.ok) throw inline.error;
    const digest = (value: unknown) =>
      specificationExportResultSchema.parse(value).specification_digest;
    expect(digest(again.value.normalized_result)).toBe(
      digest(fromFile.value.normalized_result),
    );
    // The README names the source bundle digest, so an inline bundle renders
    // a different root page while every other page stays identical.
    const inlineResult = specificationExportResultSchema.parse(
      inline.value.normalized_result,
    );
    const fileResult = specificationExportResultSchema.parse(
      fromFile.value.normalized_result,
    );
    expect(inlineResult.bundle_source).toEqual({ kind: "inline" });
    expect(inline.value.subject).toBeNull();
    expect(inline.value.limitations[0]).toContain("Bundle supplied inline");
    const byPath = new Map(
      fileResult.files.map((file) => [file.relative_path, file.sha256]),
    );
    for (const file of inlineResult.files)
      if (file.relative_path !== "README.md")
        expect(byPath.get(file.relative_path), file.relative_path).toBe(
          file.sha256,
        );
  });

  it("omits evidence pages on request", async () => {
    const { root, resources, bundlePath } = await setup();
    const exported = await exportSpecification(
      {
        evidence_bundle: { path: bundlePath },
        output_directory: join(root, "specification"),
        include_evidence_pages: false,
      },
      resources,
    );
    if (!exported.ok) throw exported.error;
    const result = specificationExportResultSchema.parse(
      exported.value.normalized_result,
    );
    expect(result.evidence_pages).toBe("omitted");
    expect(
      result.files.some(({ relative_path }) =>
        relative_path.startsWith("evidence/"),
      ),
    ).toBe(false);
    expect(result.limitations).toContain(
      "Complete Evidence JSON pages were omitted by request; result values are only in the source bundle.",
    );
    expect(
      result.limitations.some((item) => item.startsWith("No analyst findings")),
    ).toBe(true);
    await expect(
      access(join(root, "specification", "evidence")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
});

describe("specification export input failures", () => {
  it("rejects a finding citing Evidence outside the bundle before creating output", async () => {
    const { root, resources, bundlePath } = await setup();
    const outputDirectory = join(root, "specification");
    const exported = await exportSpecification(
      {
        evidence_bundle: { path: bundlePath },
        output_directory: outputDirectory,
        findings: [
          {
            id: "phantom",
            title: "Cites a record that is not here",
            statement: "This must fail closed.",
            kind: "observed",
            evidence_ids: [`ev_${"f".repeat(64)}`],
          },
        ],
      },
      resources,
    );
    if (exported.ok) throw new Error("Expected rejection");
    expect(projectAnalysisError(exported.error)).toMatchObject({
      code: "invalid_request",
      details: {
        operation: "export_specification",
        issues: [
          {
            path: ["findings", 0, "evidence_ids", 0],
            reason: "invalid_value",
            message: expect.stringContaining("not in the bundle"),
          },
        ],
      },
    });
    await expect(access(outputDirectory)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("rejects a non-canonical inline bundle and relative paths", async () => {
    const { root, resources } = await setup();
    const tampered = {
      ...fixture.bundle,
      records: [...fixture.bundle.records].reverse(),
    };
    const nonCanonical = await exportSpecification(
      {
        evidence_bundle: tampered,
        output_directory: join(root, "specification"),
      },
      resources,
    );
    if (nonCanonical.ok) throw new Error("Expected rejection");
    expect(projectAnalysisError(nonCanonical.error)).toMatchObject({
      code: "invalid_request",
      details: { operation: "export_specification" },
    });
    const relative = await exportSpecification(
      {
        evidence_bundle: fixture.bundle,
        output_directory: "relative/specification",
      },
      resources,
    );
    if (relative.ok) throw new Error("Expected rejection");
    expect(projectAnalysisError(relative.error)).toMatchObject({
      code: "invalid_request",
      details: {
        issues: [{ path: ["output_directory"], reason: "invalid_format" }],
      },
    });
    await expect(access(join(root, "specification"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("preserves an existing destination", async () => {
    const { root, resources, bundlePath } = await setup();
    const outputDirectory = join(root, "existing");
    await mkdir(outputDirectory);
    await writeFile(join(outputDirectory, "keep.txt"), "keep");
    const exported = await exportSpecification(
      {
        evidence_bundle: { path: bundlePath },
        output_directory: outputDirectory,
      },
      resources,
    );
    if (exported.ok) throw new Error("Expected rejection");
    expect(exported.error).toMatchObject({
      _tag: "ArtifactOperationError",
      operation: "export_specification",
      reason: "path",
    });
    expect(await readdir(outputDirectory)).toEqual(["keep.txt"]);
  });
});

describe("specification export cancellation and cleanup", () => {
  it("rolls back owned output when cancelled during publication", async () => {
    const { root, resources, bundlePath } = await setup();
    const outputDirectory = join(root, "specification");
    const controller = new AbortController();
    const create = SafeOutputTree.create.bind(SafeOutputTree);
    vi.spyOn(SafeOutputTree, "create").mockImplementationOnce(
      async (outputRoot, platform) => {
        const tree = await create(outputRoot, platform);
        const write = tree.write.bind(tree);
        let writes = 0;
        vi.spyOn(tree, "write").mockImplementation(async (...args) => {
          writes += 1;
          if (writes === 3) controller.abort(new Error("caller stopped"));
          return write(...args);
        });
        return tree;
      },
    );
    const exported = await exportSpecification(
      {
        evidence_bundle: { path: bundlePath },
        output_directory: outputDirectory,
      },
      resources,
      { signal: controller.signal },
    );
    if (exported.ok) throw new Error("Expected cancellation");
    expect(exported.error._tag).toBe("AnalysisCancelledError");
    await expect(access(outputDirectory)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("retains published output and its result while cleanup remains unresolved", async () => {
    const { root, resources, bundlePath } = await setup();
    const outputDirectory = join(root, "specification");
    const create = SafeOutputTree.create.bind(SafeOutputTree);
    let cleanupAttempts = 0;
    vi.spyOn(SafeOutputTree, "create").mockImplementationOnce(
      async (outputRoot, platform) => {
        const tree = await create(outputRoot, platform);
        const commit = tree.commit.bind(tree);
        vi.spyOn(tree, "commit").mockImplementation(async (signal) => {
          await commit(signal);
          throw new Error("injected post-commit failure");
        });
        const rollback = tree.rollback.bind(tree);
        vi.spyOn(tree, "rollback").mockImplementation(async () => {
          cleanupAttempts += 1;
          if (cleanupAttempts === 1)
            throw new Error("injected cleanup refusal");
          return rollback();
        });
        return tree;
      },
    );
    const exported = await exportSpecification(
      {
        evidence_bundle: { path: bundlePath },
        output_directory: outputDirectory,
      },
      resources,
    );
    if (exported.ok) throw new Error("Expected unresolved cleanup");
    expect(exported.error.cleanupIncomplete).toBe(true);
    expect(exported.error.userMessage).toContain("remains available");
    expect(exported.error.partialObservation).toMatchObject({
      kind: "specification-export",
      result: { entry_point: "README.md" },
    });
    expect((await stat(join(outputDirectory, "README.md"))).isFile()).toBe(
      true,
    );
    await resources.close();
    expect(cleanupAttempts).toBe(2);
  });
});
