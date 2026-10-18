import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { expect } from "vitest";

import { serializeEvidenceBundle } from "../../../src/domain/evidenceBundle.js";
import { specificationExportResultSchema } from "../../../src/domain/specification/specificationExport.js";
import { specificationBundleFixture } from "../../fixtures/specificationBundle.js";
import { createTestTempDirectory } from "../../fixtures/temporaryDirectory.js";
import { cliTest } from "../../support/cli/cliFixture.js";

const fixture = specificationBundleFixture();

cliTest(
  "writes a specification tree from a JSON request file and returns the Evidence record",
  async ({ cli }) => {
    const root = await createTestTempDirectory("rea-specification-cli-");
    const bundlePath = join(root, "bundle.json");
    await writeFile(bundlePath, serializeEvidenceBundle(fixture.bundle));
    const requestPath = join(root, "request.json");
    await writeFile(
      requestPath,
      JSON.stringify({
        evidence_bundle: { path: "bundle.json" },
        output_directory: "specification",
        title: "CLI specification",
        findings: [
          {
            id: "license-check",
            title: "A license key string is present",
            statement: "The binary contains the literal LICENSE_KEY.",
            kind: "observed",
            area: "search_strings",
            evidence_ids: [fixture.strings.evidence_id],
          },
        ],
      }),
    );
    const response = await cli.run({
      arguments: ["export-specification", requestPath, "--json"],
      cwd: root,
      environment: { REA_LOG_LEVEL: "silent" },
      timeoutMs: 30_000,
    });
    expect(response.exitCode).toBe(0);
    expect(response.json).toMatchObject({
      operation: "export_specification",
      predicate_type: "rea.specification-export",
    });
    const result = specificationExportResultSchema.parse(
      (response.json as { normalized_result: unknown }).normalized_result,
    );
    expect(result.output_directory).toBe(join(root, "specification"));
    expect(result.bundle_source).toMatchObject({
      kind: "file",
      path: bundlePath,
    });
    expect(result.counts.findings).toBe(1);
    const readme = await readFile(
      join(root, "specification", "README.md"),
      "utf8",
    );
    expect(readme).toContain("# CLI specification");
    expect(readme).toContain("[all findings](findings/index.md)");
  },
);

cliTest(
  "exits with an invalid_request for a finding citing Evidence outside the bundle",
  async ({ cli }) => {
    const root = await createTestTempDirectory("rea-specification-cli-");
    const bundlePath = join(root, "bundle.json");
    await writeFile(bundlePath, serializeEvidenceBundle(fixture.bundle));
    const outputDirectory = join(root, "specification");
    const response = await cli.run({
      arguments: [
        "export-specification",
        JSON.stringify({
          evidence_bundle: { path: bundlePath },
          output_directory: outputDirectory,
          findings: [
            {
              id: "phantom",
              title: "Cites a missing record",
              statement: "Must fail closed.",
              kind: "observed",
              evidence_ids: [`ev_${"f".repeat(64)}`],
            },
          ],
        }),
        "--json",
      ],
      environment: { REA_LOG_LEVEL: "silent" },
      timeoutMs: 30_000,
    });
    expect(response.exitCode).toBe(1);
    expect(response.json).toMatchObject({
      error: "Specification export failed",
      code: "invalid_request",
      details: {
        operation: "export_specification",
        issues: [
          {
            path: ["findings", 0, "evidence_ids", 0],
            reason: "invalid_value",
          },
        ],
      },
    });
    await expect(access(outputDirectory)).rejects.toMatchObject({
      code: "ENOENT",
    });
  },
);
