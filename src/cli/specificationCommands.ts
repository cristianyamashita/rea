import { Cli, z } from "incur";

import { exportSpecification } from "../application/SpecificationExportService.js";
import { ArtifactReaderFailure } from "../artifacts/ArtifactReader.js";
import { ArtifactResourceScope } from "../artifacts/ArtifactResourceScope.js";
import { CLI_COMMANDS } from "../cliCommandNames.js";
import { parseCliJsonInput, resolveCliJsonPaths } from "../cliJsonInput.js";
import { logCliCommand } from "../cliLogging.js";
import { analysisErrorWithCleanupFailure } from "../domain/analysisErrorCleanup.js";
import { projectAnalysisError } from "../domain/analysisErrorProjection.js";
import { ProviderCleanupError } from "../domain/providerCleanupError.js";
import type { Logger } from "pino";

const OPERATION = "export_specification";
const FAILURE = "Specification export failed";

/** Register the specification export CLI workflow. */
export const registerSpecificationCommands = (
  cli: ReturnType<typeof Cli.create>,
  logger: Logger,
): void => {
  cli.command(CLI_COMMANDS.exportSpecification, {
    description:
      "Write an indexed Markdown specification tree from an Evidence bundle and optional findings into an absent directory",
    args: z.object({
      inputJson: z
        .string()
        .describe(
          "JSON or JSON file with evidence_bundle (inline or {path}), output_directory, optional title, findings and include_evidence_pages",
        ),
    }),
    run: ({ args }) =>
      logCliCommand(logger, CLI_COMMANDS.exportSpecification, async () => {
        const input = await parseCliJsonInput(
          args.inputJson,
          CLI_COMMANDS.exportSpecification,
        );
        if (!input.ok) return input.error;
        const resources = new ArtifactResourceScope();
        const result = await exportSpecification(
          resolveCliJsonPaths(input.value, [
            ["output_directory"],
            ["evidence_bundle", "path"],
          ]),
          resources,
        );
        try {
          await resources.close();
        } catch (cause: unknown) {
          const cleanup = ArtifactReaderFailure.cleanupObservation(
            cause,
            "Specification export resources",
          );
          const failure = new ProviderCleanupError(
            "rea-specification-export",
            cleanup.resources,
            { reason: cleanup.reason },
            { cause, operation: OPERATION },
          );
          const error = result.ok
            ? failure
            : analysisErrorWithCleanupFailure(result.error, failure, OPERATION);
          return { error: FAILURE, ...projectAnalysisError(error) };
        }
        return result.ok
          ? result.value
          : { error: FAILURE, ...projectAnalysisError(result.error) };
      }),
  });
};
