# Bootstrap prompt — populate the project-owned OpenSpec files

Paste everything below the line into Claude Code, opened at the solution root of the **target**
repo, after running `export-sdlc-workflow.sh`. Use your strongest model. Replace nothing; the
prompt interviews you for the gaps.

---

You are bootstrapping the `sdlc-workflow` OpenSpec setup for this repository. The portable parts
are already installed: `openspec/schemas/sdlc-workflow/`, `openspec/roles/`, `.claude/agents/`,
`.claude/commands/opsx/`, `openspec/ORCHESTRATION.md`, and empty ledgers under `docs/`. Your job is
to write the **project-owned** files, which the schema deliberately leaves to the project.

Do not edit anything under `openspec/schemas/`, `openspec/roles/`, `.claude/`, or
`openspec/ORCHESTRATION.md`. If you believe one needs a project-specific change, tell me instead.

## Step 1 — Learn the repo before asking anything

Read, in this order, and stop reading a source once you have the answer:

1. `openspec/schemas/sdlc-workflow/README.md` ("Adopting it in a new repo" and "Artifact Plan"),
   and the `# PORTING THIS SCHEMA` header of `schema.yaml`. These define the contract.
2. Repo evidence: README, solution/build files (`*.sln`, `package.json`, `pom.xml`, `go.mod`,
   `pyproject.toml`, ...), folder layout, existing test projects and their
   frameworks, linters/formatter configs, and any existing `CLAUDE.md`, `AGENT.md`, `CONTRIBUTING`
   or ADRs.
3. A sample of 3–5 representative source files per layer, to infer real naming, layering, error
   handling, logging and test style. Infer from code, not from what a framework usually does.

Never ask me something the repo already answers. Record what you learned and where.

## Step 2 — Interview me on the gaps, in ONE round

Ask a single numbered list, most important first, at most eight questions. Each gets one line on
why it matters and, where the choice is small, options with your recommendation marked. Then
stop and wait. Cover only what the repo could not answer, drawn from:

1. Domain and sub-systems: what the product does, and its main business components.
2. Risk triggers: which kinds of change must force a stronger review — money, persistence schema or
   migrations, auth/security, external integration, production configuration, PII, cross-repo
   behaviour, auditability. Which of those means `escalated` review depth versus `standard`?
3. Test stack and where tests live: unit, integration, e2e, performance tools and paths; whether
   unit tests may touch real infrastructure.
4. Layering/structure rules: how code is organised (by feature or by layer), and the allowed call
   direction between layers. Which violations should be automatic CRITICALs?
5. Non-negotiable engineering standards: numeric/money handling, logging, async/concurrency,
   null-safety, error handling, secrets, naming.
6. Doc layout: component names for `docs/spec/<component>.md` and `docs/design/<component>.md`.
7. Build and test commands (used by apply).
8. Anything the team has already decided that must not be re-litigated (record as dated rulings).

"I don't know" is a valid answer: record it as an open question with an owner, never as an
assumption. After my answers, play back your understanding in ten lines or fewer and wait for
my confirmation before writing any file.

## Step 3 — Write the files (only after I confirm the playback)

### 3a. `openspec/config.yaml`

Model it on this skeleton. Keep `context:` DENSE — it is returned on every artifact instruction
call, so every extra line is paid on each of eleven calls per change. No prose paragraphs.

```yaml
schema: "sdlc-workflow"

context: |
  domain: <one line>
  sub_systems: [ <component>, <component> ]

  stack:
    runtime: <language + version>
    api: <framework>
    broker: <if any>
    database: <if any>
    resiliency: <if any>

  testing:
    unit: <framework + mocking + assertion lib>. <isolation rule: mocks only? real DB allowed?>
    integration: <framework, what is real vs faked, or "none">
    e2e: <tool>
    performance: <tool>

  paths:
    src: <dir>
    unit_tests: <dir>
    integration_tests: <dir>
    e2e: <dir>
    performance: <dir>
    product_doc: docs/specification.md      # INDEX; component files in docs/spec/
    architecture_doc: docs/design.md        # INDEX; component files in docs/design/
    history: docs/history/                  # change logs and retired items; never read for current behaviour
  ledger_reading: Never read a living ledger whole. Open the index (docs/specification.md or
    docs/design.md, both small), then only the component files the change touches. Never open
    docs/history/. Retire superseded items to docs/history/, do not mark them in place.
  standards_file: openspec/standards.md

  structure:
    style: <folder organisation rule>
    layering: <call direction and what each layer may not do>. Full rules: openspec/standards.md
    projects:
      <project>: <one-line responsibility>

  conventions:
    - <short, checkable rules and dated rulings only>

rules:
  proposal:
    - "ROLE: Author with the `product-engineer` subagent (Agent tool, subagent_type: product-engineer). Not in the main session."
    - "RISK TRIGGERS for this repo: <from interview>. A change hitting one of these needs the artifact that covers it Included, and Review Depth at least `standard` -- `escalated` for <from interview>. Judge every Artifact Plan row against this list. Write `Include` when unsure: over-producing is recoverable, a silent gap is not."
  specs:
    - "ROLE: Author with the `product-engineer` subagent (Agent tool, subagent_type: product-engineer). Not in the main session."
  design:
    - "ROLE: Author with the `principal-architect` subagent (Agent tool, subagent_type: principal-architect). Not in the main session."
  test-plan:
    - "ROLE: Author with the `sdet-agent` subagent (Agent tool, subagent_type: sdet-agent). Not in the main session."
    - "LAYOUT: Before naming any file path, read only the `## Structure and layering` section of `openspec/standards.md` (a line range, not the whole file)."
  tasks:
    - "ROLE: Author with the `tech-lead` subagent (Agent tool, subagent_type: tech-lead). Not in the main session."
    - "LAYOUT: Before naming any file path, read only the `## Structure and layering` section of `openspec/standards.md` (a line range, not the whole file)."
  e2e-test:
    - "ROLE: Author with the `automation-qa` subagent (Agent tool, subagent_type: automation-qa). Not in the main session."
  performance-test:
    - "ROLE: Author with the `performance-engineer` subagent (Agent tool, subagent_type: performance-engineer). Not in the main session."
    - "RUN POLICY: <where each load scenario may execute; from interview>"
  business-specification:
    - "ROLE: Author with the `product-engineer` subagent (Agent tool, subagent_type: product-engineer). Not in the main session."
  system-architecture:
    - "ROLE: Author with the `principal-architect` subagent (Agent tool, subagent_type: principal-architect). Not in the main session."
  final-code-review:
    - "LAYERING AUDIT: <the layering violations that are automatic CRITICAL, from interview>"
    - "RISK TRIGGERS for this repo: <same list as proposal>. Re-test every `Exclude` row against the actual diff using this list."
    - "ROLE: Route by the proposal's Review Depth. `focused` or `standard`: author with the `senior-staff-reviewer` subagent (Agent tool, subagent_type: senior-staff-reviewer). `escalated`: author with the `senior-staff-reviewer-escalated` subagent (subagent_type: senior-staff-reviewer-escalated). Both follow `openspec/roles/senior-staff-reviewer.md`. An isolated context is the point: a reviewer that never saw the implementation being justified cannot rationalise it."
  cost-report:
    - "ROLE: none -- mechanical. The orchestrator runs the script named in the instruction and verifies the file; it never writes or edits the figures. This is the only artifact not authored by a role."

operations:
  apply:
    guidance:
      - <copy the two apply bullets (ORCHESTRATION pointer, POST-APPLY BATCH, risk-trigger pause) verbatim from the reference config `openspec/export-reference/config.reference.yaml`>
  archive:
    guidance:
      - <copy the archive bullets (ORCHESTRATION pointer, COST REPORT, ARTIFACT PLAN RECONCILIATION) verbatim>
```

The `rules:` keys must be exactly the artifact IDs in `schema.yaml`; run `openspec validate --all`
afterwards to confirm. Copy the `operations:` block text exactly from
`openspec/export-reference/config.reference.yaml` (a working config from another project, supplied
as an example only; its domain, stack, paths and risk triggers do NOT apply here). Those bullets
carry the post-apply batch trigger, which only survives into the `all_done` state via config.

The reference model bindings (model names in the reviewer rules) may be changed to the models this
org uses; ask if unsure.

### 3b. `openspec/standards.md`

Read by apply before the first edit and by final review. Every bullet must be a checkable MUST
or a concrete GOOD/BAD example — no aspirations. A MUST violation is an automatic CRITICAL at
review, so write only rules the team will accept as blocking. Sections, in this order, dropping
any that do not apply:

- `## Domain safety` — money/units/precision, idempotency, PII, whichever applies
- `## Logging` — structured logging, levels, what must never be logged, correlation ids
- `## Code` — naming, guard clauses, async rules, immutability, null-safety, no magic values,
  no speculative abstraction
- `## Structure and layering` — **this exact heading** (config rules point at it). Folder shape,
  call direction, what each layer may and may not do, and the explicit list of what counts as a
  defect
- `## Testing` — where tests go, isolation rules, what each scenario must assert

Derive the content from the real code and from my interview answers; where the code contradicts
a rule I stated, surface the conflict rather than pick a side.

### 3c. `AGENT.md` and `CLAUDE.md`

`AGENT.md` (loaded into the orchestrator AND every agent role — keep it free of dispatch
mechanics): workspace root and project breakdown; component-structure rule and pointer to
`openspec/standards.md`; the non-negotiable rule *"Do NOT write, modify, or delete application
code before reading, executing, or creating an OpenSpec Change Proposal"*; the SDD lifecycle
(docs/specification.md = functional only, docs/design.md = technical only; testing workflow;
review gate); and this delegation invariant verbatim:

1. Every OpenSpec artifact is authored by its mapped agent role, routed by `rules:` in
   `openspec/config.yaml`. Role definitions are in `openspec/roles/`. The orchestrator coordinates;
   it does not author. The single exception is `cost-report`, generated by script.
2. If the mapped role cannot be dispatched, STOP and tell the user. Never author the artifact in the
   orchestrator as a fallback, and never report it as done.
3. An agent role runs in an isolated context and cannot see the conversation. Any decision taken
   interactively must be written into an artifact, `openspec/config.yaml`, or this file.

Then: "Orchestration procedure is in `openspec/ORCHESTRATION.md` — if you are the orchestrator, open
it before delegating, running the post-apply batch, or archiving."

`CLAUDE.md`: `@AGENT.md`, the solution-root statement, and the pre-archive self-review loop
(correctness, test coverage, architectural compliance). If a `CLAUDE.md` already exists, merge —
do not overwrite.

### 3d. Ledger index headers

Fill the "Platform Overview" in `docs/specification.md` (non-technical) and C1 context in
`docs/design.md` from what you learned, marking everything not yet verified as PLANNED or
unverified. Add one row per component to each index table and create the matching empty
`docs/spec/<component>.md` and `docs/design/<component>.md` files with a one-line header. Do not
invent business rules, requirement IDs or diagrams for behaviour you have not seen in code.

## Step 4 — Verify and report

1. Run `openspec validate --all` and `openspec schemas`, and confirm `sdlc-workflow` resolves.
   Then delete `openspec/export-reference/`.
2. Run `openspec instructions proposal --change smoke-test --json` after `openspec new change
   smoke-test`, check that `context` and `rules` come back populated, then delete the smoke-test
   change directory.
3. Report: files written, every assumption you made (should be none), every open question with an
   owner, and every place the repo contradicted a rule I gave you.

Ground rules: do not guess — ask or record an open question. Do not paste instruction text into
output files. Do not touch application code, tests, or CI. (CI is not part of this export.) Tell me to restart Claude Code at the
end, because agent bindings register at session start.
