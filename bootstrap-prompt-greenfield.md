# Bootstrap prompt — GREENFIELD (new project)

Paste everything below the line into Claude Code, opened at the solution root of a **new** repo,
after the portable sdlc-workflow files are installed. Use your strongest model. Replace nothing; the
prompt interviews you for the gaps.

---

You are bootstrapping the `sdlc-workflow` OpenSpec setup for a NEW repository (greenfield). The
portable parts are installed: `openspec/schemas/sdlc-workflow/`, `openspec/roles/`, `.claude/agents/`,
`.claude/commands/opsx/`, `openspec/ORCHESTRATION.md`, and empty ledgers under `docs/`. Your job is to
write the **project-owned** files. The code does not exist yet, so the decisions are made here and
recorded here, not inferred.

Do not edit anything under `openspec/schemas/`, `openspec/roles/`, `.claude/`, or
`openspec/ORCHESTRATION.md`. If you believe one needs a project-specific change, tell me instead.
Do not create application code, tests, or CI in this step. The first OpenSpec change creates those.

## Step 0 — Precondition check

Confirm these exist: `openspec/schemas/sdlc-workflow/schema.yaml`, `openspec/roles/`,
`.claude/agents/`, `.claude/commands/opsx/`, `openspec/ORCHESTRATION.md`, `docs/specification.md`,
`docs/design.md`, `docs/history/`. If any is missing, STOP and tell me. Do not recreate them.

Confirm `openspec/specs/` is empty apart from `.gitkeep`. If it is not, this is not a greenfield repo:
STOP and tell me to use the brownfield bootstrap.

## Step 1 — Read what exists (read only)

Greenfield repos have little to read. Check, and stop at the first answer:

1. `openspec/schemas/sdlc-workflow/README.md` ("Adopting it in a new repo", "Artifact Plan") and the
   `# PORTING THIS SCHEMA` header of `schema.yaml`. These define the contract.
2. Any existing `README`, product brief, requirements doc, ADR, or `CLAUDE.md` / `AGENTS.md` / `AGENT.md`.
   If `CLAUDE.md` exists, note it for merging, never overwrite. If a requirements or brief document
   exists, read it; it answers part of the interview.
3. Any existing solution or build files (`*.sln`, `package.json`, `pom.xml`, `go.mod`, `pyproject.toml`).
   Record what is already chosen and what is not.

Do not infer style from code. There is none yet. Every convention will be a decision recorded in Step 2.

Never ask me something a document in the repo already answers. Record what you learned and where.

## Step 2 — Interview me in ONE round

Ask a single numbered list, most important first, **at most eight questions**. Each gets one line on
why it matters and, where the choice is small, options with your recommendation marked. Then stop and
wait. Cover only what the repo could not answer. Include, as applicable:

1. **Domain and components** (fills `domain`, `sub_systems`, `structure.projects`, `structure.style`):
   what the product does, its main business components, each source project and its one-line
   responsibility, how folders are organised, and what is explicitly out of scope for v1.
2. **Stack** (fills `stack.*`): runtime and version, API framework, message broker, database and
   data-access layer, retry and circuit-breaker tooling. For anything not yet chosen, record it as an
   open decision with an owner. Do not pick one for me.
3. **Testing and paths** (fills `testing.*` and `paths.*`): unit, integration, e2e and performance tools;
   whether unit tests may touch real infrastructure; the source and test root folders; and where the
   first deployed environment will run.
4. **Layering** (fills `structure.layering` and the LAYERING AUDIT rule): the allowed call direction
   between layers, what each layer may not do, and which violations are automatic CRITICALs.
5. **Risk triggers and review depth** (fills the RISK TRIGGERS lines of the `proposal` and
   `final-code-review` rules): which kinds of change must force a stronger review (money, persistence
   schema or migrations, auth/security, external integration, production configuration, PII, cross-repo
   behaviour, auditability), and which of those mean `escalated` rather than `standard`.
6. **Performance run policy and standards** (fills RUN POLICY and `standards.md`): where each load
   scenario may run (default offered: smoke and sustained locally; spike and soak only in the performance
   environment), and the engineering standards: numeric and money handling, logging, async and
   concurrency, null-safety, error handling, secrets, naming. These become blocking MUSTs from day one,
   so confirm each one is one the team will enforce.
7. **Rulings and conventions** (fills `conventions`): decisions already made that must not be
   re-litigated, recorded as dated rulings.
8. **Doc layout** (fills the component names for `docs/spec/` and `docs/design/`): the component names
   for the ledger files, and the first deployed environment's name if one exists.

"I don't know" is a valid answer: record it as an open question with an owner, never as an assumption.
After my answers, play back your understanding in ten lines or fewer and wait for my confirmation
before writing any file.

## Step 3 — Write the files (only after I confirm the playback)

### 3a. `openspec/config.yaml`

Start from `openspec/export-reference/config.reference.yaml`: copy it to `openspec/config.yaml`. It is a
template. Every `<FILL: ...>` in it is a question from Step 2. Replace each one with the confirmed answer,
or with `OPEN: <owner>` when the answer is not decided yet. Keep the key names and the ROLE lines, and
keep `context:` DENSE: it is returned on every artifact instruction call, so every extra line is paid on
each of eleven calls per change.

Add these two lines to `context.conventions`:

```yaml
    - Harness first: until the unit test project exists, the first change's first task group creates it.
      Every later task runs the full suite, so no task may be marked done on a suite that does not run.
```

Confirm the `rules:` keys are exactly the artifact IDs in `schema.yaml`, and that the `operations:`
block matches the reference text. The reference model bindings may be changed to the models this org
uses; ask if unsure.

### 3b. `openspec/standards.md`

Read by apply before the first edit and by final review. Every bullet must be a checkable MUST or a
concrete GOOD/BAD example. A MUST violation is an automatic CRITICAL, so write only rules the team
accepted in Step 2.

Sections in this order, dropping any that do not apply:

- `## Domain safety`: money, units, precision, idempotency, PII
- `## Logging`: structured logging, levels, what must never be logged, correlation ids
- `## Code`: naming, guard clauses, async rules, immutability, null-safety, no magic values, no speculative abstraction
- `## Structure and layering`: **this exact heading** (config rules point at it). Folder shape, call
  direction, what each layer may and may not do, and the explicit list of what counts as a defect
- `## Testing`: where tests go, isolation rules, what each scenario must assert

Write `openspec/standards.md` before the first change. Apply reads it before its first edit.

### 3c. `AGENT.md` and `CLAUDE.md`

`AGENT.md` (loaded into the orchestrator AND every agent role, so keep it free of dispatch mechanics):
workspace root and project breakdown; the component-structure rule and a pointer to
`openspec/standards.md`; the non-negotiable rule *"Do NOT write, modify, or delete application code
before reading, executing, or creating an OpenSpec Change Proposal"*; the SDD lifecycle
(`docs/specification.md` = functional only, `docs/design.md` = technical only; testing workflow; review
gate); and this delegation invariant verbatim:

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
overwrite.

### 3d. Living ledgers, planned

- `docs/specification.md`: fill "Platform Overview" in non-technical terms from the interview. Mark
  everything not yet built as `PLANNED`. Never name a datastore, service, endpoint, table, queue or topic.
- `docs/design.md`: draw C1 (context) from the interview, and C2 (containers) as `PLANNED`, dashed and
  labelled. Every diagram must be syntactically valid.
- Add one index row per component to each index table. Create `docs/spec/<component>.md` and
  `docs/design/<component>.md` for every component, each with a one-line header and every feature row
  set to `planned`.

Do not invent business rules, requirement IDs or diagrams for behaviour that has not been specified.

### 3e. Record the decisions

Every interview ruling, every open decision, and every owner must be in `openspec/config.yaml`
(`conventions:` or `context:`), `openspec/standards.md`, or `AGENT.md`. Subagents cannot see this
conversation, so anything left only in chat will not reach them.

## Step 4 — Verify and report

1. Run `grep -rn "<FILL:" openspec/config.yaml` and confirm it prints nothing: every placeholder must be
   filled or set to `OPEN: <owner>`. Then run `openspec validate --all --strict` and `openspec schemas`,
   and confirm `sdlc-workflow` resolves.
   Then delete `openspec/export-reference/`.
2. Run `openspec new change smoke-test`, then `openspec instructions proposal --change smoke-test --json`.
   Check that `context` and `rules` come back populated, then delete the smoke-test change directory.
3. Run `openspec status --change smoke-test` after the delete to confirm no leftover change exists.
4. Report:
   - files written
   - every open decision with its owner (for example, the stack or the deployed environment)
   - every risk trigger and the review depth each one forces
   - every assumption you made (should be none)

Ground rules: do not guess; ask or record an open question. Do not paste instruction text into output
files. Tell me to restart Claude Code at the end, because agent bindings register at session start.
