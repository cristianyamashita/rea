import { createEvidence, type Evidence } from "../../src/domain/evidence.js";
import {
  createEvidenceBundle,
  type EvidenceBundle,
} from "../../src/domain/evidenceBundle.js";
import {
  createResidualUnknown,
  type ResidualUnknown,
} from "../../src/domain/residualUnknown.js";

export const SPECIFICATION_FIXTURE_PROVIDER = {
  id: "fixture-provider",
  name: "Fixture analysis provider",
  version: "1",
} as const;

export const SPECIFICATION_FIXTURE_TARGET = {
  path: "/apps/demo/demo.exe",
  sha256: "a".repeat(64),
  format: "pe",
} as const;

export interface SpecificationBundleFixture {
  readonly bundle: EvidenceBundle;
  readonly functions: readonly Evidence[];
  readonly strings: Evidence;
  readonly capture: Evidence;
  readonly mutation: Evidence;
  readonly unknown: ResidualUnknown;
}

/**
 * A small authenticated bundle with one PE target, several function dossiers
 * of mixed confidence, a string search, one unattributed process capture, and
 * one residual unknown whose mutation record is present.
 */
export const specificationBundleFixture = (
  functionCount = 3,
): SpecificationBundleFixture => {
  const target = SPECIFICATION_FIXTURE_TARGET;
  const provider = SPECIFICATION_FIXTURE_PROVIDER;
  const functions = Array.from({ length: functionCount }, (_, index) =>
    createEvidence(target, provider, {
      operation: "analyze_function",
      parameters: { address: `0x${(0x401000 + index).toString(16)}` },
      result: {
        name: `sub_${(0x401000 + index).toString(16)}`,
        callers: [],
        pseudo_code: "int secret_marker(void) { return 1; }",
      },
      confidence: index % 2 === 0 ? "observed" : "inferred",
      limitations:
        index % 3 === 0 ? ["Indirect call targets remain unknown."] : [],
      locations: [
        { kind: "address", address: `0x${(0x401000 + index).toString(16)}` },
      ],
    }),
  );
  const strings = createEvidence(target, provider, {
    operation: "search_strings",
    parameters: { query: "license" },
    result: { matches: [{ address: "0x5000", text: "LICENSE_KEY" }] },
    confidence: "observed",
  });
  const capture = createEvidence(undefined, provider, {
    predicateType: "rea.comparison",
    operation: "compare_artifacts",
    parameters: { left: "a".repeat(64), right: "b".repeat(64) },
    result: { changed: [], unchanged: ["LICENSE"] },
    confidence: "observed",
    authority: "controlled-replay",
    environment: {
      id: "host",
      platform: "linux",
      architecture: "x64",
      isolation: "process",
    },
    subjectUnavailableReason:
      "A comparison names two artifacts, not one subject.",
  });
  const mutation = createEvidence(target, provider, {
    predicateType: "rea.residual-unknown-mutation",
    operation: "record_unknown",
    parameters: {},
    result: { recorded: true },
    confidence: "derived",
    authority: "analyst-inference",
  });
  const first = functions[0];
  if (first === undefined) throw new TypeError("Fixture needs one function");
  const unknown = createResidualUnknown(
    {
      question: "Does the license check run before the main window appears?",
      domain: "startup",
      severity: "high",
      required_authority: "controlled-replay",
      required_confidence: "observed",
      required_environment: null,
      recommended_probes: [
        {
          operation: "capture_process_scenario",
          rationale: "Observe ordering at runtime.",
        },
      ],
      relationships: [],
      supporting_evidence_ids: [first.evidence_id],
      contradicting_evidence_ids: [],
    },
    mutation.evidence_id,
    target.sha256,
  );
  const bundle = createEvidenceBundle(
    [...functions, strings, capture, mutation],
    [unknown],
  );
  return { bundle, functions, strings, capture, mutation, unknown };
};
