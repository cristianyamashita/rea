import {
  specificationExportInputSchema,
  specificationExportResultSchema,
} from "../domain/specification/specificationExport.js";
import type { ToolContract } from "./toolContractTypes.js";
import { toolContractMetadata } from "./toolEffects.js";
import { evidenceResultOf } from "./toolOutputSchemaPrimitives.js";

const EMPTY_BUNDLE = {
  artifacts: [],
  providers: [],
  environments: [],
  scenarios: [],
  captures: [],
  unknowns: [],
  records: [],
};

/** Specification publication contracts shared by CLI and MCP. */
export const SPECIFICATION_TOOL_CONTRACTS = [
  {
    name: "export_specification",
    ...toolContractMetadata("export_specification"),
    description:
      "Write an indexed Markdown specification of an analyzed target from an Evidence bundle (inline, or the absolute path of a bundle written by export_evidence_bundle) into an absent absolute output_directory. README.md indexes targets, areas (one per Evidence operation), findings, residual unknowns and coverage; each area index lists its records in pages of at most 100 rows linking to one fact page per record and, by default, to the complete record under evidence/. Caller-authored findings are organized by area and labelled by their declared kind; a finding citing Evidence or unknowns absent from the bundle, or claiming more confidence than its cited Evidence, is rejected before any file is written. Output is byte-stable for identical input and reports every written file with its SHA-256 and a specification_digest. No target execution or network access.",
    kind: "application",
    inputSchema: specificationExportInputSchema,
    outputSchema: evidenceResultOf(specificationExportResultSchema),
    examples: [
      {
        title:
          "Render a specification from an exported bundle with one finding",
        input: {
          evidence_bundle: { path: "/analysis/evidence/bundle.json" },
          output_directory: "/analysis/specification",
          title: "Example application specification",
          findings: [
            {
              id: "startup-sequence",
              title: "Startup sequence is not yet observed",
              statement:
                "Static Evidence names the entry point; the order of initialization work has not been observed at runtime.",
              kind: "unknown",
            },
          ],
        },
      },
      {
        title: "Render fact pages only from an inline bundle",
        input: {
          evidence_bundle: EMPTY_BUNDLE,
          output_directory: "/analysis/specification",
          include_evidence_pages: false,
        },
      },
    ],
  },
] as const satisfies readonly ToolContract[];
