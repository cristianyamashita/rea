# Specification export

`export_specification` writes a navigable Markdown specification of an analyzed
target from an Evidence bundle, so the target's behavior and structure can be
reused in another project without rebuilding the application and without reading
every page. Both CLI and MCP use the same workflow:

- MCP tool: `export_specification`
- CLI command: `rea export-specification`

The tree has two kinds of content. **Fact pages** are deterministic renderings
of Evidence records: the same bundle always produces the same bytes. **Findings**
are analyst statements the caller supplies; the renderer organizes them by area
and labels each with its declared kind, and it rejects a finding that cites
Evidence the bundle does not contain or that claims more confidence than its
citations support. Nothing in the tree is invented by REA.

## Request

```sh
rea export-specification '{
  "evidence_bundle": { "path": "/analysis/evidence/bundle.json" },
  "output_directory": "/analysis/specification",
  "title": "Example application specification",
  "findings": [
    {
      "id": "license-check",
      "title": "A license key string is present",
      "statement": "The binary contains the literal `LICENSE_KEY` near 0x5000.",
      "kind": "observed",
      "area": "search_strings",
      "evidence_ids": ["ev_<64 hex>"]
    },
    {
      "id": "startup-order",
      "title": "Startup ordering is unobserved",
      "statement": "Whether the license check precedes window creation is open.",
      "kind": "unknown",
      "unknown_ids": ["unk_<64 hex>"]
    }
  ]
}' --json
```

The CLI accepts inline JSON or the path of a JSON file, and resolves relative
`output_directory` and `evidence_bundle.path` values against the working
directory. MCP requires absolute paths.

| Field                    | Meaning                                                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `evidence_bundle`        | An inline canonical bundle, or `{ "path": ... }` naming a file written by `export_evidence_bundle` or `rea evidence-export`.                   |
| `output_directory`       | Absolute directory that must not exist yet; its parent must exist. An existing directory or symlink is rejected without touching its contents. |
| `title`                  | Root `README.md` title. Default `Specification`.                                                                                               |
| `findings`               | Analyst findings; see below. Default none.                                                                                                     |
| `include_evidence_pages` | Write every complete record as `evidence/<evidence_id>.json`. Default `true`.                                                                  |

### Findings

| Field           | Rule                                                                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`            | 1–64 lowercase letters, digits and hyphens, unique within the export and not a structural name such as `index` or `evidence`. It names `findings/<id>.md`. |
| `title`         | Short heading.                                                                                                                                             |
| `statement`     | Markdown body. Describe the behavior or structure; cite records by id where it helps.                                                                      |
| `kind`          | `observed`, `derived`, `inferred` or `unknown`. The first three use the Evidence confidence vocabulary; `unknown` marks an open question.                  |
| `area`          | Optional Evidence `operation` the finding belongs to. It must appear in the bundle; findings without an area are listed under "General".                   |
| `target_sha256` | Optional artifact digest from the bundle the finding is scoped to.                                                                                         |
| `evidence_ids`  | Records the finding rests on. Every id must be in the bundle.                                                                                              |
| `unknown_ids`   | Residual unknowns the finding tracks. Every id must be in the bundle.                                                                                      |

A finding of kind `observed` must cite at least one record with confidence
`observed`; `derived` needs an `observed` or `derived` record; `inferred` needs
any cited record. `unknown` may cite no records. Violations are reported as
`invalid_request` with the offending `findings[i]...` path before any file is
written. Fix the ledger by citing the right record or lowering the kind; never
weaken the Evidence to fit a claim.

## Layout

```
<output_directory>/
  README.md                 how to read the tree; identity; targets, areas, findings and unknowns at a glance
  manifest.json             the inline result without its own descriptor
  targets/index.md          one row per artifact digest → targets/<sha256>.md
  targets/unattributed.md   records that carry no artifact subject (only when present)
  areas/index.md            operations grouped by predicate type
  areas/<operation>/index.md        summary, findings, limitation tallies, paged record table
  areas/<operation>/items/<ev>.md   one fact page per record
  findings/index.md         findings by area → findings/<id>.md
  unknowns/index.md         head revision of every residual unknown → unknowns/<unk>.md
  coverage.md               providers, environments, scenarios, captures, confidence by authority, all limitations
  evidence/<ev>.json        the complete canonical record (when include_evidence_pages)
```

An **area** is one Evidence operation, such as `analyze_function` or
`analyze_javascript_application`. A **target** is one artifact SHA-256. Records
without a subject, such as comparisons, are listed under `targets/unattributed.md`
as an explicit unknown, never dropped.

Index tables hold at most 100 rows; longer tables continue on `index-2.md`,
`index-3.md` and so on, each page naming its row range and linking to its
neighbors. This is a readability rule for tables meant to be scanned, not an
agent budget: every record keeps its row and its page.

A fact page shows the record's identity, provider, environment, parameters,
locations, limitations, linked Evidence, the findings and unknowns that cite it,
and the **shape** of its `normalized_result` (keys, types and sizes). Result
values are never inlined in Markdown; read the `evidence/` page or the source
bundle for them.

## Result

The tool returns an Evidence record whose `normalized_result` lists every
written file with its tree-relative path, SHA-256 and byte count, the
`manifest.json` descriptor, counts, the bundle source (inline, or the file path
and its SHA-256), the fixed limitations, and `specification_digest`: a SHA-256
over the sorted file identities. Identical bundle, findings and title produce an
identical digest in any directory. Markdown pages contain no host paths, so a
tree can be moved or committed as-is.

When the bundle came from a file, the record's subject is that file. An inline
bundle has no subject and says so in its limitations. `evidence_links` names the
records the findings cite.

## Ownership and cleanup

REA creates the output directory exclusively, writes each file with digest and
durable-readback verification, writes `manifest.json` last, then commits.
Cancellation or any failure before commit rolls back only the files REA created.
If rollback fails, the error reports the residual directory. If cleanup fails
after a successful commit, the error retains the completed result as a partial
observation and says the published output remains available.

## Interpretation and limits

- A page's absence is not behavioral absence, and static Evidence never
  establishes execution. Read `coverage.md` and each record's limitations before
  relying on a conclusion.
- Fact pages are generic across target kinds in this release: one page per
  record, titled by Evidence id. Operation-aware titles such as procedure names
  or module ids are a planned follow-up.
- `evidence/` pages roughly double the bundle on disk. Pass
  `include_evidence_pages: false` to keep only Markdown.
- The compact MCP input-schema profile advertises this tool in reduced form
  because the inline bundle schema is structurally large; the server still
  enforces the complete contract.

## Workflow

The MCP prompt `write_specification` and the packaged skill describe the staged
workflow: survey the target, investigate one area at a time, record residual
unknowns as you go, keep a findings ledger keyed to Evidence ids with a kind per
entry, export the session bundle with `export_evidence_bundle`, then call
`export_specification`. Read the resulting `README.md` first and follow one path
down to confirm the index answers the question you set out with.
