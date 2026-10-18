import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { STDIO_DEFAULT_MAX_BUFFER_SIZE } from "@modelcontextprotocol/server";
import { describe, expect, it, onTestFinished } from "vitest";

import { ArtifactResourceScope } from "../../../src/artifacts/ArtifactResourceScope.js";
import { toolContract } from "../../../src/contracts/toolContracts.js";
import { ok } from "../../../src/domain/result.js";
import { silentLogger } from "../../../src/logger.js";
import { EvidenceMcpServer } from "../../../src/server/EvidenceMcpServer.js";
import { registerSpecificationExportTool } from "../../../src/server/registerSpecificationExportTool.js";
import { ToolResultDelivery } from "../../../src/server/toolResult.js";
import { parseMcpToolError } from "../../fixtures/mcpToolError.js";
import { specificationBundleFixture } from "../../fixtures/specificationBundle.js";
import { createTestTempDirectory } from "../../fixtures/temporaryDirectory.js";

const fixture = specificationBundleFixture();

const connect = async () => {
  const server = new EvidenceMcpServer(
    { name: "specification-export", version: "1" },
    {},
    undefined,
    new ToolResultDelivery(STDIO_DEFAULT_MAX_BUFFER_SIZE),
  );
  const artifactResources = new ArtifactResourceScope();
  const recorded: unknown[] = [];
  registerSpecificationExportTool(server, {
    logger: silentLogger,
    recordEvidence: (evidence) => {
      recorded.push(evidence);
      return ok("added");
    },
    artifactResources,
  });
  const client = new Client({
    name: "specification-export-test",
    version: "1",
  });
  onTestFinished(async () => {
    await client.close();
    await server.close();
    await artifactResources.close();
  });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return { client, recorded };
};

describe("export_specification over MCP", () => {
  it("returns the Evidence record inline and records it in the session", async () => {
    const root = await createTestTempDirectory("rea-specification-mcp-");
    const outputDirectory = join(root, "specification");
    const { client, recorded } = await connect();
    const result = await client.callTool({
      name: "export_specification",
      arguments: {
        evidence_bundle: fixture.bundle,
        output_directory: outputDirectory,
        title: "MCP specification",
        findings: [
          {
            id: "startup-order",
            title: "Startup ordering is unobserved",
            statement: "Open question.",
            kind: "unknown",
            unknown_ids: [fixture.unknown.unknown_id],
          },
        ],
      },
    });
    expect(result.isError).not.toBe(true);
    const contract = toolContract("export_specification");
    const structured = contract.outputSchema.parse(result.structuredContent);
    expect(structured.operation).toBe("export_specification");
    expect(structured.normalized_result).toMatchObject({
      output_directory: outputDirectory,
      bundle_source: { kind: "inline" },
      counts: { findings: 1, findings_by_kind: { unknown: 1 } },
    });
    expect(recorded).toHaveLength(1);
    const readme = await readFile(join(outputDirectory, "README.md"), "utf8");
    expect(readme).toContain("# MCP specification");
    const findings = await readFile(
      join(outputDirectory, "findings", "index.md"),
      "utf8",
    );
    expect(findings).toContain("(startup-order.md)");
  });

  it("rejects a finding citing an unknown outside the bundle without creating output", async () => {
    const root = await createTestTempDirectory("rea-specification-mcp-");
    const outputDirectory = join(root, "specification");
    const { client, recorded } = await connect();
    const result = await client.callTool({
      name: "export_specification",
      arguments: {
        evidence_bundle: fixture.bundle,
        output_directory: outputDirectory,
        findings: [
          {
            id: "phantom",
            title: "Cites a missing unknown",
            statement: "Must fail closed.",
            kind: "unknown",
            unknown_ids: [`unk_${"0".repeat(64)}`],
          },
        ],
      },
    });
    expect(parseMcpToolError(result)).toMatchObject({
      error: {
        code: "invalid_request",
        details: {
          operation: "export_specification",
          issues: [
            {
              path: ["findings", 0, "unknown_ids", 0],
              reason: "invalid_value",
            },
          ],
        },
      },
    });
    expect(recorded).toHaveLength(0);
    await expect(access(outputDirectory)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});
