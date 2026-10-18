import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
import {
  tally,
  UNATTRIBUTED_TARGET,
  type SpecificationArea,
  type SpecificationPlan,
  type SpecificationTarget,
} from "./specificationDocument.js";
import { SPECIFICATION_LIMITATIONS } from "./specificationExport.js";
import {
  areaPath,
  areaRowsForRecords,
  canonicalJson,
  code,
  confidenceAuthority,
  escapeCell,
  evidenceIdLink,
  file,
  FINDING_HEADERS,
  findingRow,
  limitationTally,
  link,
  pagedTable,
  README_PATH,
  recordLink,
  section,
  table,
  targetPath,
  truncate,
  unknownPath,
  type RenderedSpecificationFile,
} from "./specificationMarkdownPrimitives.js";

const README_TARGET_ROWS = 20;

export const readme = (plan: SpecificationPlan): RenderedSpecificationFile => {
  const from = README_PATH;
  const kinds = tally(plan.findings.map(({ kind }) => kind));
  const statuses = tally(plan.unknowns.map(({ head }) => head.status));
  const identityRows: (readonly string[])[] = [
    ["Evidence records", String(plan.records.length)],
    ["Targets", String(plan.targets.length)],
    ["Unattributed records", String(plan.unattributed.length)],
    ["Areas", String(plan.areas.length)],
    ["Findings", String(plan.findings.length)],
    ["Residual unknowns (heads)", String(plan.unknowns.length)],
    [
      "Source bundle SHA-256",
      plan.bundleSha256 === null ? "supplied inline" : code(plan.bundleSha256),
    ],
  ];
  const targetRows = plan.targets
    .slice(0, README_TARGET_ROWS)
    .map((target) => [
      link(target.sha256, from, targetPath(target.sha256)),
      target.format,
      target.architecture ?? "—",
      target.names.map(escapeCell).join(", "),
      String(target.records.length),
    ]);
  const targetNote =
    plan.targets.length > README_TARGET_ROWS
      ? `\nShowing ${String(README_TARGET_ROWS)} of ${String(plan.targets.length)} targets; see ${link("all targets", from, "targets/index.md")}.\n`
      : "";
  const unattributedNote =
    plan.unattributed.length === 0
      ? ""
      : `\n${String(plan.unattributed.length)} record(s) carry no artifact subject; see ${link("unattributed records", from, `targets/${UNATTRIBUTED_TARGET}.md`)}.\n`;
  return file(
    from,
    `# ${plan.title}\n\n` +
      `This specification describes a target application from recorded reverse-engineering Evidence. ` +
      `Every statement is either a deterministic rendering of an Evidence record or an analyst finding labelled by its declared kind.\n\n` +
      section(
        "How to read this tree",
        [
          `1. Start with the tables below to choose a target, an area, a finding or an open question.`,
          `2. Each ${link("area", from, "areas/index.md")} is one analysis operation. Its index lists every record as one row; open only the rows that answer your question.`,
          `3. A record page gives the subject, provider, parameters, locations, limitations and the shape of its result${plan.includeEvidencePages ? `, and links to the complete record under ${code("evidence/")}` : ""}.`,
          `4. ${link("Findings", from, "findings/index.md")} are analyst statements tied to the records they cite. ${link("Unknowns", from, "unknowns/index.md")} are open questions; absence of a page is not absence of behavior.`,
          `5. ${link("Coverage", from, "coverage.md")} lists providers, environments and every limitation so you can judge what the Evidence did and did not examine.`,
        ].join("\n"),
      ) +
      section("Identity", table(["Fact", "Value"], identityRows)) +
      section(
        "Targets",
        table(
          ["Target SHA-256", "Format", "Architecture", "Names", "Records"],
          targetRows,
        ) +
          targetNote +
          unattributedNote,
      ) +
      section(
        "Areas",
        table(
          ["Operation", "Predicate types", "Records", "Findings"],
          plan.areas.map((area) => [
            link(area.operation, from, areaPath(area)),
            area.predicateTypes.map(code).join(", "),
            String(area.records.length),
            String(area.findings.length),
          ]),
        ),
      ) +
      section(
        "Findings",
        table(
          ["Kind", "Count"],
          kinds.map(([kind, count]) => [kind, String(count)]),
        ) + `\nSee ${link("all findings", from, "findings/index.md")}.\n`,
      ) +
      section(
        "Residual unknowns",
        table(
          ["Status", "Count"],
          statuses.map(([status, count]) => [status, String(count)]),
        ) + `\nSee ${link("all unknowns", from, "unknowns/index.md")}.\n`,
      ) +
      section(
        "Limitations",
        SPECIFICATION_LIMITATIONS.map((item) => `- ${item}`).join("\n") + "\n",
      ),
  );
};

export const targetsIndex = (
  plan: SpecificationPlan,
): RenderedSpecificationFile[] =>
  pagedTable({
    directory: "targets",
    base: "index",
    title: "Targets",
    intro: (from) =>
      `One row per artifact identified by its SHA-256. ${link("Back to README", from, README_PATH)}.\n\n`,
    headers: ["Target SHA-256", "Format", "Architecture", "Names", "Records"],
    rows: (from) =>
      plan.targets.map((target) => [
        link(target.sha256, from, targetPath(target.sha256)),
        target.format,
        target.architecture ?? "—",
        target.names.map(escapeCell).join(", "),
        String(target.records.length),
      ]),
  });

export const targetPage = (
  plan: SpecificationPlan,
  target: SpecificationTarget,
): RenderedSpecificationFile => {
  const from = targetPath(target.sha256);
  const findings = plan.findings.filter(
    (finding) => finding.target_sha256 === target.sha256,
  );
  const unknowns = plan.unknowns.filter(
    ({ head }) => head.scope_digest === target.sha256,
  );
  return file(
    from,
    `# Target ${code(target.sha256)}\n\n${link("Back to README", from, README_PATH)} · ${link("All targets", from, "targets/index.md")}\n\n` +
      section(
        "Identity",
        table(
          ["Fact", "Value"],
          [
            ["Format", target.format],
            ["Architecture", target.architecture ?? "—"],
            ["Recorded names", target.names.map(escapeCell).join(", ")],
            [
              "Recorded local paths",
              target.localPaths.map((path) => code(path)).join(", "),
            ],
            ["Records", String(target.records.length)],
          ],
        ),
      ) +
      section(
        "Areas touching this target",
        table(
          ["Operation", "Records"],
          areaRowsForRecords(plan, from, target.records),
        ),
      ) +
      section(
        "Findings scoped to this target",
        table(
          FINDING_HEADERS,
          findings.map((finding) => findingRow(from, finding)),
        ),
      ) +
      section(
        "Residual unknowns scoped to this target",
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

export const unattributedPage = (
  plan: SpecificationPlan,
): RenderedSpecificationFile[] =>
  plan.unattributed.length === 0
    ? []
    : pagedTable({
        directory: "targets",
        base: UNATTRIBUTED_TARGET,
        title: "Records without an artifact subject",
        intro: (from) =>
          `These records carry no artifact identity. They describe captures, comparisons or workflows rather than one artifact, or their identity was unavailable; this is an explicit unknown, not an absence. ${link("Back to README", from, README_PATH)}.\n\n`,
        headers: ["Record", "Operation", "Confidence / authority"],
        rows: (from) =>
          plan.unattributed.map((record) => [
            recordLink(plan, from, record),
            code(record.operation),
            confidenceAuthority(record),
          ]),
      });

export const areasIndex = (
  plan: SpecificationPlan,
): RenderedSpecificationFile => {
  const from = "areas/index.md";
  const byPredicate = new Map<string, SpecificationArea[]>();
  for (const area of plan.areas)
    for (const predicateType of area.predicateTypes) {
      const group = byPredicate.get(predicateType) ?? [];
      group.push(area);
      byPredicate.set(predicateType, group);
    }
  const groups = [...byPredicate].sort(([left], [right]) =>
    compareUnicodeCodePoints(left, right),
  );
  return file(
    from,
    `# Areas\n\nAn area is one analysis operation. Operations are grouped by the predicate type of their records; an operation producing several predicate types appears under each. ${link("Back to README", from, README_PATH)}.\n\n` +
      groups
        .map(([predicateType, areas]) =>
          section(
            `Predicate type ${code(predicateType)}`,
            table(
              ["Operation", "Records of this type", "All records", "Findings"],
              areas.map((area) => [
                link(area.operation, from, areaPath(area)),
                String(
                  area.records.filter(
                    (record) => record.predicate_type === predicateType,
                  ).length,
                ),
                String(area.records.length),
                String(area.findings.length),
              ]),
            ),
          ),
        )
        .join(""),
  );
};

export const areaPages = (
  plan: SpecificationPlan,
  area: SpecificationArea,
): RenderedSpecificationFile[] => {
  const directory = `areas/${area.slug}`;
  const intro = (from: string): string =>
    `Operation ${code(area.operation)}; predicate types ${area.predicateTypes.map(code).join(", ")}. ` +
    `${link("Back to README", from, README_PATH)} · ${link("All areas", from, "areas/index.md")}.\n\n` +
    section(
      "Summary",
      table(
        ["Fact", "Value"],
        [
          ["Records", String(area.records.length)],
          [
            "Confidence",
            tally(area.records.map(({ confidence }) => confidence))
              .map(([value, count]) => `${value} ×${String(count)}`)
              .join(", "),
          ],
          [
            "Authority",
            tally(area.records.map(({ authority }) => authority))
              .map(([value, count]) => `${value} ×${String(count)}`)
              .join(", "),
          ],
          [
            "Providers",
            tally(area.records.map(({ provider }) => provider.id))
              .map(([value, count]) => `${code(value)} ×${String(count)}`)
              .join(", "),
          ],
          [
            "Targets",
            tally(
              area.records.flatMap(({ subject }) =>
                subject === null
                  ? [UNATTRIBUTED_TARGET]
                  : [subject.digest.sha256],
              ),
            )
              .map(([value, count]) =>
                value === UNATTRIBUTED_TARGET
                  ? `unattributed ×${String(count)}`
                  : `${link(value, from, targetPath(value))} ×${String(count)}`,
              )
              .join(", "),
          ],
        ],
      ),
    ) +
    section(
      "Findings in this area",
      table(
        FINDING_HEADERS,
        area.findings.map((finding) => findingRow(from, finding)),
      ),
    ) +
    section(
      "Limitations carried by these records",
      limitationTally(from, plan, area.records),
    ) +
    `## Records\n\n`;
  return pagedTable({
    directory,
    base: "index",
    title: `Area ${area.operation}`,
    intro,
    headers: [
      "Record",
      "Confidence / authority",
      "Provider",
      "Environment",
      "Limitations",
      "Parameters",
    ],
    rows: (from) =>
      area.records.map((record) => [
        recordLink(plan, from, record),
        confidenceAuthority(record),
        code(record.provider.id),
        record.environment === null ? "—" : code(record.environment.id),
        String(record.limitations.length),
        code(truncate(canonicalJson(record.parameters))),
      ]),
  });
};

export const coveragePage = (
  plan: SpecificationPlan,
): RenderedSpecificationFile => {
  const from = "coverage.md";
  const confidences = ["observed", "derived", "inferred"] as const;
  const authorities = tally(plan.records.map(({ authority }) => authority)).map(
    ([value]) => value,
  );
  const matrix = confidences.map((confidence) => [
    confidence,
    ...authorities.map((authority) =>
      String(
        plan.records.filter(
          (record) =>
            record.confidence === confidence && record.authority === authority,
        ).length,
      ),
    ),
  ]);
  return file(
    from,
    `# Coverage\n\nWhat the Evidence examined and under which conditions. Missing coverage is unknown, never absence. ${link("Back to README", from, README_PATH)}.\n\n` +
      section(
        "Providers",
        table(
          ["Id", "Name", "Version", "Records"],
          plan.bundle.providers.map((provider) => [
            code(provider.id),
            escapeCell(provider.name),
            provider.version === null ? "—" : escapeCell(provider.version),
            String(
              plan.records.filter(
                (record) => record.provider.id === provider.id,
              ).length,
            ),
          ]),
        ),
      ) +
      section(
        "Execution environments",
        table(
          ["Id", "Platform", "Architecture", "Isolation", "Records"],
          plan.bundle.environments.map((environment) => [
            code(environment.id),
            environment.platform,
            environment.architecture,
            environment.isolation,
            String(
              plan.records.filter(
                (record) => record.environment?.id === environment.id,
              ).length,
            ),
          ]),
        ),
      ) +
      section(
        "Controlled-replay scenarios",
        table(
          ["Record", "Operation"],
          plan.bundle.scenarios.map((scenario) => [
            evidenceIdLink(plan, from, scenario.evidence_id),
            code(scenario.operation),
          ]),
        ),
      ) +
      section(
        "Process captures",
        table(
          ["Record", "Predicate type"],
          plan.bundle.captures.map((capture) => [
            evidenceIdLink(plan, from, capture.evidence_id),
            code(capture.predicate_type),
          ]),
        ),
      ) +
      section(
        "Confidence by authority",
        table(["Confidence", ...authorities], matrix),
      ) +
      section(
        "Unattributed records",
        plan.unattributed.length === 0
          ? "Every record names an artifact subject.\n"
          : `${String(plan.unattributed.length)} record(s) have no artifact subject; see ${link("unattributed records", from, `targets/${UNATTRIBUTED_TARGET}.md`)}.\n`,
      ) +
      section(
        "Limitations across all records",
        limitationTally(from, plan, plan.records),
      ),
  );
};
