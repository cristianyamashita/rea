import { createHash } from "node:crypto";
import { Readable } from "node:stream";

import type { ArtifactResourceScope } from "../artifacts/ArtifactResourceScope.js";
import { publishOutputTree } from "../artifacts/OutputTreePublication.js";
import type { SafeOutputTree } from "../artifacts/SafeOutputTree.js";
import {
  buildSpecificationManifest,
  renderSpecificationFiles,
  SPECIFICATION_MANIFEST_PATH,
} from "../domain/specification/specificationMarkdown.js";
import type { SpecificationPlan } from "../domain/specification/specificationDocument.js";
import {
  specificationExportResultSchema,
  type SpecificationBundleSource,
  type SpecificationExportResult,
  type SpecificationFile,
} from "../domain/specification/specificationExport.js";
import { SpecificationExportError } from "../domain/specificationExportError.js";

interface PublishSpecificationOptions {
  readonly resources: ArtifactResourceScope;
  readonly signal?: AbortSignal;
}

/**
 * Write every rendered page with digest verification, then the manifest, into
 * the caller-selected absent directory. Rollback, residual reporting and
 * retention of a committed result follow the shared owned-tree publication.
 */
export const publishSpecification = (
  plan: SpecificationPlan,
  outputDirectory: string,
  bundleSource: SpecificationBundleSource,
  options: PublishSpecificationOptions,
): Promise<SpecificationExportResult> =>
  publishOutputTree<SpecificationExportResult>({
    outputDirectory,
    resources: options.resources,
    signal: options.signal,
    write: (tree) =>
      writeSpecification(tree, plan, bundleSource, options.signal),
    cleanupFailure: ({ reason, outputRoot, diagnostic, published }) => {
      const error = new SpecificationExportError(
        reason,
        outputRoot,
        diagnostic,
        {
          residualPaths: [outputRoot],
        },
      );
      if (published !== undefined)
        error.retainPartialObservation({
          kind: "specification-export",
          result: published,
        });
      return error;
    },
  });

const writeSpecification = async (
  tree: SafeOutputTree,
  plan: SpecificationPlan,
  bundleSource: SpecificationBundleSource,
  signal: AbortSignal | undefined,
): Promise<SpecificationExportResult> => {
  const written: SpecificationFile[] = [];
  for (const rendered of renderSpecificationFiles(plan)) {
    signal?.throwIfAborted();
    await tree.write(
      rendered.relativePath,
      Readable.from([rendered.bytes]),
      { sha256: rendered.sha256, bytes: rendered.bytes.byteLength },
      signal,
    );
    written.push({
      relative_path: rendered.relativePath,
      sha256: rendered.sha256,
      bytes: rendered.bytes.byteLength,
    });
  }
  const manifest = buildSpecificationManifest(plan, written, bundleSource);
  const bytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  const digest = createHash("sha256").update(bytes).digest("hex");
  const result = specificationExportResultSchema.parse({
    ...manifest,
    output_directory: tree.outputRoot,
    manifest: {
      relative_path: SPECIFICATION_MANIFEST_PATH,
      sha256: digest,
      bytes: bytes.byteLength,
    },
  });
  await tree.write(
    SPECIFICATION_MANIFEST_PATH,
    Readable.from([bytes]),
    { sha256: digest, bytes: bytes.byteLength },
    signal,
  );
  return result;
};
