import type { Evidence } from "../evidence.js";
import type { ResidualUnknown } from "../residualUnknown.js";
import {
  UNATTRIBUTED_TARGET,
  type SpecificationPlan,
  type SpecificationUnknown,
} from "./specificationDocument.js";
import type { SpecificationFinding } from "./specificationFinding.js";
import {
  areaPath,
  canonicalJson,
  code,
  describeShape,
  escapeCell,
  evidenceIdLink,
  evidencePath,
  fenced,
  file,
  FINDING_HEADERS,
  findingPath,
  findingRow,
  itemPath,
  link,
  location,
  pagedTable,
  README_PATH,
  section,
  table,
  targetPath,
  truncate,
  unknownLink,
  unknownPath,
  type RenderedSpecificationFile,
} from "./specificationMarkdownPrimitives.js";

export const itemPage = (
  plan: SpecificationPlan,
  record: Evidence,
): RenderedSpecificationFile => {
  const from = itemPath(plan, record);
  const area = plan.areaByOperation.get(record.operation);
  const subject = record.subject;
  const findings = plan.findingsByEvidenceId.get(record.evidence_id) ?? [];
  const unknowns = plan.unknownsByEvidenceId.get(record.evidence_id) ?? [];
  const links = record.evidence_links.map(
    (evidenceId) => `- ${evidenceIdLink(plan, from, evidenceId)}`,
  );
  return file(
    from,
    `# Record ${code(record.evidence_id)}\n\n` +
      `${link("Back to README", from, README_PATH)}${area === undefined ? "" : ` · ${link(`Area ${area.operation}`, from, areaPath(area))}`}` +
      `${plan.includeEvidencePages ? ` · ${link("Complete record (JSON)", from, evidencePath(record))}` : ""}\n\n` +
      section(
        "Identity",
        table(
          ["Fact", "Value"],
          [
            ["Operation", code(record.operation)],
            ["Predicate type", code(record.predicate_type)],
            ["Confidence", record.confidence],
            ["Authority", record.authority],
            [
              "Subject",
              subject === null
                ? `none (${link("unattributed", from, `targets/${UNATTRIBUTED_TARGET}.md`)})`
                : `${link(subject.digest.sha256, from, targetPath(subject.digest.sha256))} · ${escapeCell(subject.name)} · ${subject.format}${subject.architecture === null ? "" : ` · ${subject.architecture}`} · ${code(subject.local_path)}`,
            ],
            [
              "Provider",
              `${code(record.provider.id)} (${escapeCell(record.provider.name)}${record.provider.version === null ? "" : ` ${escapeCell(record.provider.version)}`})`,
            ],
            [
              "Environment",
              record.environment === null
                ? "—"
                : `${code(record.environment.id)} · ${record.environment.platform} · ${record.environment.architecture} · isolation ${record.environment.isolation}`,
            ],
            [
              "Analysis profile",
              record.analysis_profile === null
                ? "—"
                : code(truncate(canonicalJson(record.analysis_profile))),
            ],
            [
              "Relationship coverage",
              record.relationship_coverage === null
                ? "—"
                : code(truncate(canonicalJson(record.relationship_coverage))),
            ],
          ],
        ),
      ) +
      section("Parameters", fenced("json", canonicalJson(record.parameters))) +
      section(
        "Locations",
        table(["Kind", "Value"], record.locations.map(location)),
      ) +
      section(
        "Limitations",
        record.limitations.length === 0
          ? "_None recorded._\n"
          : record.limitations.map((item) => `- ${item}`).join("\n") + "\n",
      ) +
      section(
        "Result shape",
        `The ${code("normalized_result")} is summarized by shape; ${plan.includeEvidencePages ? `read the ${link("complete record", from, evidencePath(record))}` : "read the source bundle"} for values.\n\n${describeShape(record.normalized_result)}`,
      ) +
      section(
        "Linked Evidence",
        links.length === 0 ? "_None._\n" : links.join("\n") + "\n",
      ) +
      section(
        "Findings citing this record",
        table(
          FINDING_HEADERS,
          findings.map((finding) => findingRow(from, finding)),
        ),
      ) +
      section(
        "Residual unknowns citing this record",
        table(
          ["Unknown", "Status", "Severity"],
          unknowns.map(({ unknownId, head }) => [
            link(unknownId, from, unknownPath(unknownId)),
            head.status,
            head.severity,
          ]),
        ),
      ),
  );
};

export const findingsIndex = (
  plan: SpecificationPlan,
): RenderedSpecificationFile => {
  const from = "findings/index.md";
  const groups: string[] = [];
  if (plan.generalFindings.length > 0)
    groups.push(
      section(
        "General",
        table(
          FINDING_HEADERS,
          plan.generalFindings.map((finding) => findingRow(from, finding)),
        ),
      ),
    );
  for (const area of plan.areas)
    if (area.findings.length > 0)
      groups.push(
        section(
          `Area ${link(area.operation, from, areaPath(area))}`,
          table(
            FINDING_HEADERS,
            area.findings.map((finding) => findingRow(from, finding)),
          ),
        ),
      );
  return file(
    from,
    `# Findings\n\nAnalyst findings grouped by area. Each finding states its kind: ${code("observed")}, ${code("derived")} and ${code("inferred")} rest on cited Evidence of at least that confidence; ${code("unknown")} marks an open question. ${link("Back to README", from, README_PATH)}.\n\n` +
      (groups.length === 0
        ? "_No findings were supplied._\n"
        : groups.join("")),
  );
};

export const findingPage = (
  plan: SpecificationPlan,
  finding: SpecificationFinding,
): RenderedSpecificationFile => {
  const from = findingPath(finding);
  const area =
    finding.area === undefined
      ? undefined
      : plan.areaByOperation.get(finding.area);
  return file(
    from,
    `# ${escapeCell(finding.title)}\n\n${link("Back to README", from, README_PATH)} · ${link("All findings", from, "findings/index.md")}\n\n` +
      section(
        "Identity",
        table(
          ["Fact", "Value"],
          [
            ["Finding id", code(finding.id)],
            ["Kind", finding.kind],
            [
              "Area",
              area === undefined
                ? "general"
                : link(area.operation, from, areaPath(area)),
            ],
            [
              "Target",
              finding.target_sha256 === undefined
                ? "—"
                : link(
                    finding.target_sha256,
                    from,
                    targetPath(finding.target_sha256),
                  ),
            ],
          ],
        ),
      ) +
      section("Statement", `${finding.statement}\n`) +
      section(
        "Cited Evidence",
        finding.evidence_ids.length === 0
          ? "_None cited._\n"
          : finding.evidence_ids
              .map(
                (evidenceId) => `- ${evidenceIdLink(plan, from, evidenceId)}`,
              )
              .join("\n") + "\n",
      ) +
      section(
        "Cited residual unknowns",
        finding.unknown_ids.length === 0
          ? "_None cited._\n"
          : finding.unknown_ids
              .map((unknownId) => `- ${unknownLink(plan, from, unknownId)}`)
              .join("\n") + "\n",
      ),
  );
};

export const unknownsIndex = (
  plan: SpecificationPlan,
): RenderedSpecificationFile[] =>
  pagedTable({
    directory: "unknowns",
    base: "index",
    title: "Residual unknowns",
    intro: (from) =>
      `Head revision of every residual unknown in the bundle. ${link("Back to README", from, README_PATH)}.\n\n`,
    headers: ["Unknown", "Status", "Severity", "Domain", "Question"],
    rows: (from) =>
      plan.unknowns.map(({ unknownId, head }) => [
        link(unknownId, from, unknownPath(unknownId)),
        head.status,
        head.severity,
        escapeCell(head.domain),
        escapeCell(truncate(head.question)),
      ]),
  });

export const environmentRequirement = (head: ResidualUnknown): string => {
  const requirement = head.required_environment;
  if (requirement === null) return "—";
  return canonicalJson(requirement);
};

const currentRevisionSection = (
  plan: SpecificationPlan,
  from: string,
  head: ResidualUnknown,
): string =>
  section(
    "Current revision",
    table(
      ["Fact", "Value"],
      [
        ["Revision", String(head.revision)],
        ["Status", head.status],
        ["Severity", head.severity],
        ["Domain", escapeCell(head.domain)],
        [
          "Scope digest",
          head.scope_digest === null
            ? "—"
            : plan.targets.some((target) => target.sha256 === head.scope_digest)
              ? link(head.scope_digest, from, targetPath(head.scope_digest))
              : code(head.scope_digest),
        ],
        ["Required authority", head.required_authority ?? "any"],
        ["Required confidence", head.required_confidence],
        ["Required environment", code(environmentRequirement(head))],
        [
          "Comparison conclusion scope",
          head.comparison_conclusion_scope === undefined
            ? "—"
            : code(canonicalJson(head.comparison_conclusion_scope)),
        ],
      ],
    ),
  );

export const unknownPage = (
  plan: SpecificationPlan,
  unknown: SpecificationUnknown,
): RenderedSpecificationFile => {
  const from = unknownPath(unknown.unknownId);
  const { head } = unknown;
  const findings = plan.findingsByUnknownId.get(unknown.unknownId) ?? [];
  const evidenceList = (ids: readonly string[]): string =>
    ids.length === 0
      ? "_None._\n"
      : ids.map((id) => `- ${evidenceIdLink(plan, from, id)}`).join("\n") +
        "\n";
  return file(
    from,
    `# Unknown ${code(unknown.unknownId)}\n\n${link("Back to README", from, README_PATH)} · ${link("All unknowns", from, "unknowns/index.md")}\n\n` +
      section("Question", `${head.question}\n`) +
      currentRevisionSection(plan, from, head) +
      section(
        "Resolution",
        head.resolution === null
          ? "_Unresolved._\n"
          : `Disposition ${code(head.resolution.disposition)}: ${head.resolution.rationale}\n\n${evidenceList(head.resolution.evidence_ids)}`,
      ) +
      section(
        "Supporting Evidence",
        evidenceList(head.supporting_evidence_ids),
      ) +
      section(
        "Contradicting Evidence",
        evidenceList(head.contradicting_evidence_ids),
      ) +
      section(
        "Recommended probes",
        table(
          ["Operation", "Rationale"],
          head.recommended_probes.map((probe) => [
            code(probe.operation),
            escapeCell(probe.rationale),
          ]),
        ),
      ) +
      section(
        "Relationships",
        table(
          ["Type", "Unknown"],
          head.relationships.map((relationship) => [
            relationship.type,
            unknownLink(plan, from, relationship.unknown_id),
          ]),
        ),
      ) +
      section(
        "Findings citing this unknown",
        table(
          FINDING_HEADERS,
          findings.map((finding) => findingRow(from, finding)),
        ),
      ) +
      section(
        "Revision history",
        table(
          [
            "Revision",
            "Status",
            "Severity",
            "Revision digest",
            "Mutation Evidence",
          ],
          unknown.history.map((revision) => [
            String(revision.revision),
            revision.status,
            revision.severity,
            code(revision.revision_digest),
            revision.mutation_evidence_ids
              .map((id) => evidenceIdLink(plan, from, id))
              .join(", "),
          ]),
        ),
      ),
  );
};

export const evidencePage = (record: Evidence): RenderedSpecificationFile =>
  file(evidencePath(record), `${canonicalJson(record)}\n`);

/**
 * Yield every file of the tree except `manifest.json`, one at a time, so the
 * writer never holds the whole tree in memory. Order is deterministic.
 */
