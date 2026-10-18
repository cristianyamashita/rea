import { ArtifactOperationError } from "./artifactOperationError.js";
import type { AnalysisErrorOptions } from "./analysisErrorBase.js";

/** Specification publication failed, retaining its output target and cleanup state. */
export class SpecificationExportError extends ArtifactOperationError {
  override readonly userMessage: string;
  override cleanupIncomplete: boolean;

  constructor(
    reason: ArtifactOperationError["reason"],
    target: string,
    diagnostic: string,
    options: AnalysisErrorOptions & {
      readonly residualPaths?: readonly string[];
    } = {},
  ) {
    super("export_specification", reason, undefined, undefined, options);
    this.userMessage = `Specification export failed for ${target}: ${diagnostic}`;
    this.setCleanupResources([
      ...new Set([
        ...(options.cleanup?.resources ?? []),
        ...(options.residualPaths ?? []),
      ]),
    ]);
    this.cleanupIncomplete =
      options.cleanup !== undefined || (options.residualPaths?.length ?? 0) > 0;
  }
}
