import { ArtifactReaderFailure } from "./ArtifactReader.js";
import type { ArtifactResourceScope } from "./ArtifactResourceScope.js";
import { SafeOutputTree } from "./SafeOutputTree.js";
import { SafeOutputTreeCreationFailure } from "./SafeOutputTreeCreationFailure.js";

/** How one publication reports a failed rollback or post-commit cleanup. */
export interface OutputTreeCleanupFailure<Result> {
  readonly reason: ArtifactReaderFailure["reason"];
  readonly outputRoot: string;
  readonly diagnostic: string;
  /** The committed result when the tree was published before cleanup failed. */
  readonly published: Result | undefined;
}

export interface OutputTreePublication<Result> {
  readonly outputDirectory: string;
  readonly resources: ArtifactResourceScope;
  readonly signal?: AbortSignal | undefined;
  /** Write every file, including the manifest, and return the inline result. */
  readonly write: (tree: SafeOutputTree) => Promise<Result>;
  /** Build the operation's typed error for an unresolved tree cleanup. */
  readonly cleanupFailure: (failure: OutputTreeCleanupFailure<Result>) => Error;
}

/**
 * Exclusively create the caller-selected absent directory, let the operation
 * write verified files into it, then commit. Any failure before commit rolls
 * the owned tree back through the resource scope. A failed rollback, or a
 * failed cleanup after commit, is reported through `cleanupFailure` with the
 * residual root; a committed result survives a late cleanup failure.
 */
export const publishOutputTree = async <Result>(
  options: OutputTreePublication<Result>,
): Promise<Result> =>
  options.resources.run(async () => {
    let tree: SafeOutputTree | undefined;
    let result: Result | undefined;
    try {
      tree = await SafeOutputTree.create(options.outputDirectory);
      options.signal?.throwIfAborted();
      result = await options.write(tree);
      options.signal?.throwIfAborted();
      await tree.commit(options.signal);
      return result;
    } catch (cause: unknown) {
      if (cause instanceof SafeOutputTreeCreationFailure) tree = cause.tree;
      if (tree !== undefined) {
        const cleanup = await options.resources.release({
          kind: "output-tree",
          resource: tree.outputRoot,
          tree,
        });
        if (cleanup.kind === "failed") {
          const published = tree.published ? result : undefined;
          throw options.cleanupFailure({
            reason:
              cause instanceof ArtifactReaderFailure ? cause.reason : "io",
            outputRoot: tree.outputRoot,
            diagnostic: tree.published
              ? `Publication completed, but descriptor cleanup failed (${message(cleanup.cause)}). The published output remains available.`
              : `Publication failed (${message(cause)}); rollback failed (${message(cleanup.cause)}). Remove the residual output directory before retrying.`,
            published,
          });
        }
        if (tree.published && result !== undefined) return result;
      }
      throw cause;
    }
  });

const message = (cause: unknown): string =>
  cause instanceof Error ? cause.message : "Unknown publication failure";
