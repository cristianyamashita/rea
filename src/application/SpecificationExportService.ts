import { createHash } from "node:crypto";
import { isAbsolute } from "node:path";

import { z } from "zod";

import { ArtifactReaderFailure } from "../artifacts/ArtifactReader.js";
import type { ArtifactResourceScope } from "../artifacts/ArtifactResourceScope.js";
import type { AnalysisError } from "../domain/analysisErrorBase.js";
import { analysisErrorWithCleanupFailure } from "../domain/analysisErrorCleanup.js";
import {
  AnalysisCancelledError,
  AnalysisInputError,
  AnalysisOutputError,
} from "../domain/analysisErrorCore.js";
import { createEvidence, type Evidence } from "../domain/evidence.js";
import {
  parseEvidenceBundle,
  type EvidenceBundle,
} from "../domain/evidenceBundle.js";
import { analysisInputErrorFromIssues } from "../domain/inputIssueProjection.js";
import { jsonValueSchema } from "../domain/jsonValue.js";
import { ProviderAdapterError } from "../domain/providerAdapterError.js";
import { ProviderCleanupError } from "../domain/providerCleanupError.js";
import { err, ok, type Result } from "../domain/result.js";
import { planSpecificationDocument } from "../domain/specification/specificationDocument.js";
import {
  specificationExportInputSchema,
  type SpecificationBundleSource,
  type SpecificationExportInput,
} from "../domain/specification/specificationExport.js";
import {
  SpecificationFindingError,
  validateSpecificationFindings,
} from "../domain/specification/specificationFinding.js";
import { SpecificationExportError } from "../domain/specificationExportError.js";
import type { ExecutionOptions } from "./AnalysisProvider.js";
import { readEvidenceBundle } from "./EvidenceBundleFiles.js";
import { SPECIFICATION_EXPORT_PROVIDER as PROVIDER } from "./InvestigationProviders.js";
import {
  RegularFileCleanupFailure,
  withRegularFile,
} from "./RegularFileRead.js";
import { publishSpecification } from "./SpecificationPublication.js";
import { workflowInputError } from "./workflowInputError.js";

const OPERATION = "export_specification";

/** Render a specification tree through the shared CLI/MCP application workflow. */
export const exportSpecification = async (
  rawInput: unknown,
  resources: ArtifactResourceScope,
  options: ExecutionOptions = {},
): Promise<Result<Evidence, AnalysisError>> => {
  const input = specificationExportInputSchema.safeParse(rawInput);
  return input.success
    ? exportSpecificationValidated(input.data, resources, options)
    : err(
        analysisInputErrorFromIssues(OPERATION, input.error.issues, rawInput),
      );
};

/** Publish input already parsed by a named adapter contract. */
export const exportSpecificationValidated = async (
  input: SpecificationExportInput,
  resources: ArtifactResourceScope,
  options: ExecutionOptions = {},
): Promise<Result<Evidence, AnalysisError>> => {
  if (!isAbsolute(input.output_directory))
    return err(
      new AnalysisInputError(OPERATION, undefined, [
        {
          path: ["output_directory"],
          reason: "invalid_format",
          message:
            "output_directory must be an absolute filesystem path on this host.",
        },
      ]),
    );
  try {
    options.signal?.throwIfAborted();
    const loaded = await loadBundle(input, resources, options.signal);
    if (!loaded.ok) return loaded;
    const { bundle, source } = loaded.value;
    try {
      validateSpecificationFindings(bundle, input.findings);
    } catch (cause: unknown) {
      if (cause instanceof SpecificationFindingError)
        return err(
          new AnalysisInputError(OPERATION, { cause }, [
            {
              path: ["findings", ...cause.path],
              reason: "invalid_value",
              message: cause.message,
            },
          ]),
        );
      throw cause;
    }
    options.signal?.throwIfAborted();
    const plan = planSpecificationDocument(bundle, input.findings, {
      title: input.title,
      includeEvidencePages: input.include_evidence_pages,
      bundleSha256: source.kind === "file" ? source.sha256 : null,
    });
    const result = await publishSpecification(
      plan,
      input.output_directory,
      source,
      {
        resources,
        ...(options.signal === undefined ? {} : { signal: options.signal }),
      },
    );
    const citedEvidence = [
      ...new Set(input.findings.flatMap(({ evidence_ids }) => evidence_ids)),
    ].sort();
    return ok(
      createEvidence(
        source.kind === "file"
          ? { path: source.path, sha256: source.sha256, format: "file" }
          : undefined,
        PROVIDER,
        {
          predicateType: "rea.specification-export",
          operation: OPERATION,
          parameters: {
            output_directory: input.output_directory,
            title: input.title,
            include_evidence_pages: input.include_evidence_pages,
            finding_count: input.findings.length,
            finding_ids: input.findings.map(({ id }) => id),
          },
          result: jsonValueSchema.parse(result),
          rawResult: null,
          confidence: "derived",
          authority: "analyst-inference",
          subjectUnavailableReason:
            "Bundle supplied inline; the specification identifies its records by their Evidence IDs and the bundle manifests.",
          limitations: result.limitations,
          locations: [
            {
              kind: "artifact-path",
              path: `${result.output_directory}/${result.manifest.relative_path}`,
            },
          ],
          evidenceLinks: citedEvidence,
        },
      ),
    );
  } catch (cause: unknown) {
    return err(mapExportFailure(cause, input, options.signal));
  }
};

interface LoadedBundle {
  readonly bundle: EvidenceBundle;
  readonly source: SpecificationBundleSource;
}

const loadBundle = async (
  input: SpecificationExportInput,
  resources: ArtifactResourceScope,
  signal: AbortSignal | undefined,
): Promise<Result<LoadedBundle, AnalysisError>> => {
  if (!("path" in input.evidence_bundle)) {
    try {
      return ok({
        bundle: parseEvidenceBundle(input.evidence_bundle),
        source: { kind: "inline" },
      });
    } catch (cause: unknown) {
      if (cause instanceof z.ZodError || cause instanceof TypeError)
        return err(workflowInputError(OPERATION, cause));
      throw cause;
    }
  }
  const path = input.evidence_bundle.path;
  if (!isAbsolute(path))
    return err(
      new AnalysisInputError(OPERATION, undefined, [
        {
          path: ["evidence_bundle", "path"],
          reason: "invalid_format",
          message:
            "evidence_bundle.path must be an absolute filesystem path on this host.",
        },
      ]),
    );
  const loaded = await readEvidenceBundle(path, signal, resources);
  if (!loaded.ok) return loaded;
  // The bundle reader validated the file; hash the same regular file so the
  // export record binds to the exact bytes the specification was rendered from.
  const sha256 = await hashRegularFile(path, signal, resources);
  return ok({ bundle: loaded.value, source: { kind: "file", path, sha256 } });
};

const HASH_CHUNK_BYTES = 64 * 1024;

const hashRegularFile = (
  path: string,
  signal: AbortSignal | undefined,
  resources: ArtifactResourceScope,
): Promise<string> =>
  withRegularFile(
    path,
    async (handle) => {
      const hash = createHash("sha256");
      const chunk = Buffer.allocUnsafe(HASH_CHUNK_BYTES);
      let position = 0;
      for (;;) {
        signal?.throwIfAborted();
        const { bytesRead } = await handle.read(
          chunk,
          0,
          chunk.length,
          position,
        );
        if (bytesRead === 0) break;
        hash.update(chunk.subarray(0, bytesRead));
        position += bytesRead;
      }
      return hash.digest("hex");
    },
    { ...(signal === undefined ? {} : { signal }), resources },
  );

const bundlePath = (input: SpecificationExportInput): string | undefined =>
  "path" in input.evidence_bundle ? input.evidence_bundle.path : undefined;

const mapExportFailure = (
  cause: unknown,
  input: SpecificationExportInput,
  signal: AbortSignal | undefined,
): AnalysisError => {
  if (cause instanceof SpecificationExportError) return cause;
  if (cause instanceof RegularFileCleanupFailure)
    return new SpecificationExportError(
      "io",
      bundlePath(input) ?? input.output_directory,
      `Bundle file handle close failed: ${cause.message}`,
      { cause, residualPaths: [bundlePath(input) ?? input.output_directory] },
    );
  if (cause instanceof ArtifactReaderFailure && cause.cleanup !== undefined)
    return analysisErrorWithCleanupFailure(
      new SpecificationExportError(
        cause.reason,
        input.output_directory,
        cause.message,
        { cause },
      ),
      new ProviderCleanupError(
        PROVIDER.id,
        cause.cleanup.resources,
        { reason: cause.cleanup.reason },
        { cause, operation: OPERATION },
      ),
      OPERATION,
    );
  if (signal?.aborted === true)
    return new AnalysisCancelledError(OPERATION, { cause });
  if (cause instanceof ArtifactReaderFailure)
    return new SpecificationExportError(
      cause.reason,
      input.output_directory,
      cause.message,
      { cause },
    );
  if (cause instanceof z.ZodError)
    return new AnalysisOutputError(OPERATION, cause.message, { cause });
  if (
    cause instanceof Error &&
    "code" in cause &&
    typeof cause.code === "string"
  )
    return new SpecificationExportError(
      "io",
      input.output_directory,
      cause.message,
      { cause },
    );
  return new ProviderAdapterError(PROVIDER.id, OPERATION, {
    cause,
    diagnostics: {
      output_directory: input.output_directory,
      error_name: cause instanceof Error ? cause.name : "UnknownError",
      error_message:
        cause instanceof Error
          ? cause.message
          : typeof cause === "string"
            ? cause
            : "Unknown specification export failure",
    },
  });
};
