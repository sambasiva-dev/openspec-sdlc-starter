# sdlc-workflow — portable SDD schema

A full-lifecycle OpenSpec schema: plan → implement → test → document → review. Nothing in
`schema.yaml` or `templates/` names a language, framework, or business domain, so the directory
drops into any repo unchanged.

## Artifacts

| # | Artifact | Requires | Writes | Persona |
| :-- | :-- | :-- | :-- | :-- |
| 1 | `proposal` | — | `proposal.md` | product |
| 2 | `specs` | proposal | `specs/**/*.md` | product |
| 3 | `design` | specs | `design.md` | architect |
| 4 | `test-plan` | design | `test-plan.md` | sdet |
| 5 | `tasks` | test-plan | `tasks.md` | tech lead |
| — | **apply** | tasks | tracks `tasks.md` | main session |
| 6 | `e2e-test` | proposal, tasks | `e2e-test.md` **+ the e2e suite** | automation qa |
| 7 | `performance-test` | proposal, tasks | `performance-test.md` **+ load scripts** | perf engineer |
| 8 | `business-specification` | proposal, tasks | `business-specification.md` **+ product ledger** | product |
| 9 | `system-architecture` | proposal, tasks | `system-architecture.md` **+ architecture ledger** | architect |
| 10 | `final-code-review` | proposal, tasks, e2e-test, performance-test, business-specification, system-architecture | `final-code-review.md` | staff reviewer |
| 11 | `cost-report` | final-code-review | `cost-report.md` | script: `tools/phase-cost.py` |

Four artifacts are **write-through**: `generates:` can only point inside the change directory, so
each writes a per-change record there *and* merges into a repo-level file. Both files are required
whenever the artifact runs at all.

The five planning artifacts always run. The four write-through artifacts are **selectable** per
change (see Artifact Plan below); `final-code-review` always runs. The post-apply five all depend
on `[proposal, tasks]` rather than on each other, so excluding one cannot block the rest —
ordering comes from declaration order. `final-code-review` additionally depends on all four, so
its dependency list is a free, machine-readable record of which ones were actually written.

## Adopting it in a new repo

1. Copy this directory to `openspec/schemas/sdlc-workflow/`.
2. In `openspec/config.yaml`, set `schema: "sdlc-workflow"`.
3. Fill in `context:` — this is the only place project specifics belong. The keys the schema
   instructions actually reference by name:

   | Key | Used by |
   | :-- | :-- |
   | `testing.unit` | test-plan |
   | `testing.e2e`, `paths.e2e` | e2e-test |
   | `testing.performance`, `paths.performance` | performance-test |
   | `paths.product_doc` | business-specification |
   | `paths.architecture_doc` | system-architecture |
   | `standards_file` | apply, final-code-review |
   | `rules` risk triggers | proposal (to choose), final-code-review (to re-check) |

   Keep `context:` dense. It is returned on **every** artifact instruction call, so a paragraph
   here is paid ten times per change.
4. Write the implementation standards to the `standards_file` path — language, logging, naming,
   error handling, domain-safety rules. The apply phase reads it before the first edit; a MUST
   violation there is an automatic CRITICAL at final review.
5. Route artifacts to subagents in `config.yaml` `rules:`. Keys are validated against the artifact
   IDs above.

## Artifact Plan

The proposal declares which post-apply artifacts the change produces, in a table downstream
agents grep:

```markdown
| Artifact | Decision | Reason |
| :-- | :-- | :-- |
| e2e-test | Include | new HTTP contract on a deployed surface |
| performance-test | Exclude | no hot path, no dependency call, no serialization change |
| business-specification | Include | adds an operational journey |
| system-architecture | Exclude | no component, contract, or persistence change |

**Review Depth:** standard
```

- An **excluded** artifact is never authored and writes no file at all — not even a waiver. The
  reason line is the entire record, reviewed once at the proposal gate.
- **Absence of the table means all four are included.** Absence is never exclusion.
- `final-code-review` always runs and re-tests every `Exclude` against the actual diff. An
  exclusion is a prediction made before the code existed; something has to verify it.
- **Review Depth** — `focused` (diff scope only), `standard` (full production-readiness), or
  `escalated` (full review on a stronger reviewer). The project routes `escalated` to a
  separate reviewer binding in `config.yaml` `rules:` — same role, stronger model. A non-escalated
  reviewer that finds the depth should be escalated raises a blocking finding so the review is
  re-run on that binding.

Define what counts as a risk trigger in `config.yaml` `rules:` for `proposal` and
`final-code-review`; the schema deliberately does not. Put them in `rules`, not `context` —
`context` is paid on all eleven calls, `rules` only on the two artifacts that need them.

### A limitation to know about

The CLI cannot represent a declared exclusion. `openspec status` computes `ready` from
dependencies plus file existence, so an excluded artifact reads `ready` forever and `nextSteps`
keeps proposing it. `skip_specs` is the only machine-readable skip and it applies solely to
artifacts whose `generates` starts with `specs/`. The guards are therefore prompt-level: a
conditional opener in each selectable artifact's `instruction:` (which travels with the schema),
plus `operations.archive.guidance` in config so archive stops prompting on deliberate exclusions.

## Phase cost

`cost-report` is generated, not authored. `tools/phase-cost.py` reads the Claude Code session
logs, attributes each model response to a phase (every artifact, apply, review-fixes, archive), prices it from
`tools/pricing.json` and writes one row per phase. Run it from the repository root with
`--change <name>`; add `--stdout` for a running total that writes nothing. Python 3.9+, standard
library only. Keep `pricing.json` current: its `as_of` date is printed on every report.

## What is deliberately *not* here

- **Persona registers.** The CLI reads only `name`, `version`, `description`, `artifacts`, `apply`
  from a schema, and only `id`, `generates`, `description`, `template`, `instruction`, `requires`
  from an artifact. Any `agent:` key is stripped at load and never reaches the model. Routing lives
  in `config.yaml` `rules:`; role prompts and model tiers live in `.claude/agents/<name>.md`.
- **Coding standards.** Project-owned, at `context.standards_file`.
