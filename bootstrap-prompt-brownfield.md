# Bootstrap prompt — BROWNFIELD (existing codebase)

Paste everything below the line into Claude Code, opened at the solution root of an **existing**
repo, after the portable sdlc-workflow files are installed. Use your strongest model. Replace
nothing; the prompt interviews you for the gaps.

---

You are bootstrapping the `sdlc-workflow` OpenSpec setup for an EXISTING repository (brownfield).
The portable parts are installed: `openspec/schemas/sdlc-workflow/`, `openspec/roles/`,
`.claude/agents/`, `.claude/commands/opsx/`, `openspec/ORCHESTRATION.md`, and empty ledgers under
`docs/`. Your job is to write the **project-owned** files, to capture the **as-is** state of the
system, and to record what is already broken so that later changes are judged fairly.

Do not edit anything under `openspec/schemas/`, `openspec/roles/`, `.claude/`, or
`openspec/ORCHESTRATION.md`. If you believe one needs a project-specific change, tell me instead.
Do not touch application code, tests, or CI. Do not fix anything you find broken: record it.

## Step 0 — Precondition check

Confirm these exist: `openspec/schemas/sdlc-workflow/schema.yaml`, `openspec/roles/`,
`.claude/agents/`, `.claude/commands/opsx/`, `openspec/ORCHESTRATION.md`, `docs/specification.md`,
`docs/design.md`, `docs/history/`. If any is missing, STOP and tell me. Do not recreate them.

Confirm `openspec/specs/` state. If it already contains capability folders, list them and STOP
until I confirm whether they are to be kept, extended, or replaced. Never overwrite an existing spec.

## Step 1 — Learn the repo before asking anything (read only)

Read in this order and stop reading a source once you have the answer:

1. `openspec/schemas/sdlc-workflow/README.md` ("Adopting it in a new repo", "Artifact Plan") and the
   `# PORTING THIS SCHEMA` header of `schema.yaml`. These define the contract.
2. Repo evidence: README, solution and build files (`*.sln`, `package.json`, `pom.xml`, `go.mod`,
   `pyproject.toml`, ...), folder layout, test projects and their frameworks, linter and formatter
   configs, `appsettings`/environment config, and any existing `CLAUDE.md`, `AGENTS.md`, `AGENT.md`,
   `CONTRIBUTING`, ADRs, or wiki exports. If `CLAUDE.md` exists, note it for merging, never overwrite.
3. A sample of 3–5 representative source files per layer, to infer real naming, layering, error
   handling, logging and test style. Infer from the code, not from what the framework usually does.

### 1b — As-is discovery (brownfield only)

Build an inventory of what the system is today, with a file reference for every entry:

- **Components:** top-level business domain folders or projects. Mark each live, dormant (no
  callers or dead code), or unclear.
- **External systems:** every outbound integration (HTTP clients, message brokers, ERP
  connectors, file drops, email, payment providers). Use client classes and config keys, not guesses.
- **Interfaces:** public endpoints, message topics or queues consumed and produced.
- **Persistence:** entities, tables, migrations, and which component owns each.
- **Test coverage map:** which components have unit, integration, e2e or performance tests, and
  what those tests assert.

Write this inventory to `docs/history/baseline.md` under `## Inventory`. Mark every entry you could
not verify in code as `UNVERIFIED`. This file is evidence for playback; it is not a living ledger.

### 1c — Baseline test run (brownfield only)

Run the build and the full test suite once, unmodified. Record in `docs/history/baseline.md` under
`## Pre-existing test failures`: the command used, the pass, fail and skip counts, and the name of
every failing or skipped test with its file. If the suite cannot run, record the exact error. Do not
fix failures. This record is what stops apply from treating legacy red tests as its own failures.

Never ask me something the repo already answers. Record what you learned and where.

## Step 2 — Interview me in ONE round

Ask a single numbered list, most important first, **at most eight questions**. Each gets one line on
why it matters and, where the choice is small, options with your recommendation marked. Then stop
and wait. Cover only what the repo could not answer. Include, as applicable:

1. **Domain and components** (fills `domain`, `sub_systems`, `structure.projects`, `structure.style`):
   what the product does, the business components, each source project and its one-line responsibility,
   and how folders are organised. Confirm the component list from 1b; which dormant or unclear entries
   are dead and should be excluded from the baseline?
2. **Baseline scope:** which capabilities get baseline specs now. Recommend every live component's
   externally visible behaviour, not the whole codebase, and defer the rest to the changes that touch it.
3. **Stack** (fills `stack.*`): runtime and version, API framework, message broker, database and
   data-access layer, retry and circuit-breaker tooling. Say "none" where absent.
4. **Testing and paths** (fills `testing.*` and `paths.*`): unit, integration, e2e and performance tools;
   whether unit tests may touch real infrastructure; the source and test root folders. Confirm the build
   and test commands and the 1c baseline results.
5. **Layering** (fills `structure.layering` and the LAYERING AUDIT rule): the allowed call direction, what
   each layer may not do, and which violations are automatic CRITICALs. Confirm the pre-existing
   violations from 1c are legacy debt, not rules to enforce on old code.
6. **Risk triggers and review depth** (fills the RISK TRIGGERS lines of the `proposal` and
   `final-code-review` rules): which kinds of change must force a stronger review (money, persistence
   schema or migrations, auth/security, external integration, production configuration, PII, cross-repo
   behaviour, auditability), and which of those mean `escalated` rather than `standard`.
7. **Performance run policy and standards** (fills RUN POLICY and `standards.md`): where each load
   scenario may run (default offered: smoke and sustained locally; spike and soak only in the performance
   environment), and the non-negotiable engineering standards: numeric and money handling, logging, async,
   null-safety, error handling, secrets, naming. Each must be one the team will enforce as blocking.
8. **Rulings, frozen areas and doc layout** (fills `conventions` and the component names for
   `docs/spec/` and `docs/design/`): decisions that must not be re-litigated (as dated rulings), work in
   flight that must not be touched, and the component names for the ledger files.

"I don't know" is a valid answer: record it as an open question with an owner, never as an
assumption. After my answers, play back your understanding in ten lines or fewer and wait for my
confirmation before writing any file other than the discovery and baseline notes.

## Step 3 — Write the files (only after I confirm the playback)

### 3a. Baseline specs (as-is behaviour)

For each capability confirmed in Step 2, write `openspec/specs/<capability-path>/spec.md`. Use kebab-case
path segments, following the project's existing organisation. Format, which `openspec validate --strict`
accepts:

```
# <capability> Specification

## Purpose

<one or two sentences, 50+ characters, describing what this capability does>

## Requirements

### Requirement: <name>

The system SHALL <observable behaviour>.

#### Scenario: <name>

- **WHEN** <input or state>
- **THEN** <concrete, checkable outcome>
```

Rules for baseline specs:
- Write only behaviour that the code or an existing test demonstrates. The test suite is the strongest
  evidence. Cite the file for each requirement in `docs/history/baseline.md` under `## Baseline spec
  sources`, not in the spec body.
- **Scenarios are exactly four hashtags.** Three, or a bullet, fails silently.
- Every requirement needs at least one scenario with a concrete value, state or error. Never "works
  correctly".
- Anything you suspect but cannot demonstrate goes in `docs/history/baseline.md` under `## Open
  questions` with an owner. It does not become a requirement.
- Do not write requirements for dormant components.
- Baseline specs are written directly, not through a change. Record that in `baseline.md`.

### 3b. `openspec/config.yaml`

Start from `openspec/export-reference/config.reference.yaml`: copy it to `openspec/config.yaml`. It is a
template. Every `<FILL: ...>` in it is a question from Step 2. Replace each one with the confirmed answer,
keep the key names and the ROLE lines, and keep `context:` DENSE: it is returned on every artifact
instruction call, so every extra line is paid on each of eleven calls per change.

Add this line to `context.conventions`:

```yaml
    - Pre-existing failures and legacy violations are listed in docs/history/baseline.md. A change is
      judged only on what it adds or touches, not on that debt.
```

rules:
  # Copy the rule keys and ROLE lines from openspec/export-reference/config.reference.yaml verbatim.
  # Replace the <FILL: ...> values in the RISK TRIGGERS, LAYERING AUDIT and RUN POLICY lines with the answers.
  # Add this line under final-code-review, using the exact baseline file path:
  #   "BASELINE: Pre-existing violations and failing tests listed in docs/history/baseline.md are not
  #    CRITICAL unless the diff touches that code. Report them as MINOR debt with the baseline reference.
  #    A new violation, or a changed hunk that fails a pre-existing test, is judged in full."

operations:
  # Copy the apply and archive guidance bullets verbatim from openspec/export-reference/config.reference.yaml.
```

Confirm the `rules:` keys are exactly the artifact IDs in `schema.yaml`, and that the `operations:`
block matches the reference text. The reference model bindings may be changed to the models this org
uses; ask if unsure.

### 3c. `openspec/standards.md`

Read by apply before the first edit and by final review. Every bullet must be a checkable MUST or a
concrete GOOD/BAD example, drawn from the interview and the code. A MUST violation is an automatic
CRITICAL, so write only rules the team will accept as blocking on NEW or CHANGED code.

Sections in this order, dropping any that do not apply:

- `## Domain safety`: money, units, precision, idempotency, PII
- `## Logging`: structured logging, levels, what must never be logged, correlation ids
- `## Code`: naming, guard clauses, async rules, immutability, null-safety, no magic values
- `## Structure and layering`: **this exact heading** (config rules point at it). Folder shape, call
  direction, what each layer may and may not do, and the explicit list of what counts as a defect
- `## Testing`: where tests go, isolation rules, what each scenario must assert

Where the code contradicts a rule the team stated, do NOT pick a side and do NOT silently keep the
rule. Record the conflict under `## Standards debt` in `docs/history/baseline.md` with file references.

### 3d. `docs/history/baseline.md` (complete it)

Finish the file from Steps 1b and 1c with these sections:
- `## Inventory` (from 1b)
- `## Pre-existing test failures` (from 1c)
- `## Standards debt` (code that violates the rules in standards.md, with file references)
- `## Baseline spec sources` (for each baseline requirement, the file that shows it)
- `## Open questions` (each with an owner)

This file is archival. Living docs never read it for current behaviour, and final review reads it only
when a finding touches a listed item.

### 3e. `AGENT.md` and `CLAUDE.md`

`AGENT.md` (loaded into the orchestrator AND every agent role, so keep it free of dispatch mechanics):
workspace root and project breakdown; the component-structure rule and a pointer to
`openspec/standards.md`; the non-negotiable rule *"Do NOT write, modify, or delete application code
before reading, executing, or creating an OpenSpec Change Proposal"*; the SDD lifecycle
(`docs/specification.md` = functional only, `docs/design.md` = technical only; testing workflow; review
gate); a pointer to `docs/history/baseline.md` as the record of pre-existing debt; and this delegation
invariant verbatim:

1. Every OpenSpec artifact is authored by its mapped agent role, routed by `rules:` in
   `openspec/config.yaml`. Role definitions are in `openspec/roles/`. The orchestrator coordinates;
   it does not author. The single exception is `cost-report`, generated by script.
2. If the mapped role cannot be dispatched, STOP and tell the user. Never author the artifact in the
   orchestrator as a fallback, and never report it as done.
3. An agent role runs in an isolated context and cannot see the conversation. Any decision taken
   interactively must be written into an artifact, `openspec/config.yaml`, or this file.

Then: "Orchestration procedure is in `openspec/ORCHESTRATION.md`. If you are the orchestrator, open it
before delegating, running the post-apply batch, or archiving."

`CLAUDE.md`: `@AGENT.md`, the solution-root statement, and the pre-archive self-review loop
(correctness, test coverage, architectural compliance). If `CLAUDE.md` already exists, MERGE. Do not
overwrite, and list what you kept.

### 3f. Living ledgers, as-is

- `docs/specification.md`: fill "Platform Overview" in non-technical terms from the inventory. Mark
  anything not verified as `UNVERIFIED`. Never name a datastore, service, endpoint, table, queue or
  topic here.
- `docs/design.md`: draw C1 (context) and C2 (containers) from the inventory. Draw what EXISTS as live.
  Draw anything `UNVERIFIED` dashed and labelled. Every diagram must be syntactically valid.
- Add one index row per component to each index table. Create `docs/spec/<component>.md` and
  `docs/design/<component>.md` for every live component, each with a one-line header. Skip dormant
  components; list them under the platform overview as dormant.
- In each `docs/spec/<component>.md`, set the feature status matrix row by row: `delivered` only where a
  baseline spec scenario is backed by a passing test; otherwise `UNVERIFIED`. Do not invent business rules.
- In `docs/design/<component>.md`, record only the structure you saw in code.

Do not leave the ledgers empty and do not fill them with a whole-system design you have not verified.
An inaccurate map is worse than a partial one.

## Step 4 — Verify and report

1. Run `grep -rn "<FILL:" openspec/config.yaml` and confirm it prints nothing: every placeholder must be filled.
   Then run `openspec validate --all --strict` and `openspec schemas`, and confirm `sdlc-workflow` resolves.
   Every baseline spec must pass. Then delete `openspec/export-reference/`.
2. Run `openspec new change smoke-test`, then `openspec instructions proposal --change smoke-test --json`.
   Check that `context` and `rules` come back populated, then delete the smoke-test change directory.
3. Run `openspec status --change smoke-test` after the delete to confirm no leftover change exists.
4. Report:
   - files written, and files merged (with what was kept from an existing CLAUDE.md)
   - the count of baseline requirements and scenarios, and how many have a passing test behind them
   - the pre-existing test failure count, and the standards debt count
   - every open question with its owner
   - every place the repo contradicted a rule I gave you
   - every assumption you made (should be none)

Ground rules: do not guess; ask or record an open question. Do not paste instruction text into output
files. Tell me to restart Claude Code at the end, because agent bindings register at session start.
