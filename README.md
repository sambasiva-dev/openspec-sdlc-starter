# openspec-sdlc-starter

Installs the OpenSpec `sdlc-workflow` schema, Claude Code agent bindings and bootstrap prompts into a
repository, so the bootstrap can configure the project.

## Prerequisites

Install these before you use the package:

1. **Node.js 20+** and npm.
2. **Claude Code**, the CLI agent this package installs bindings for:
   ```sh
   npm install -g @anthropic-ai/claude-code
   ```
   See the [Claude Code docs](https://docs.claude.com/en/docs/claude-code/overview) for other install methods.
3. **OpenSpec CLI** (`openspec`) on your PATH:
   ```sh
   npm install -g @fission-ai/openspec
   openspec --version
   ```
4. **OpenSpec initialized in the repository.** Run this in the repo root before the installer:
   ```sh
   cd /path/to/your-repo
   openspec init --tools claude
   ```
   `openspec init` creates the `openspec/` folder and the default Claude Code bindings. The installer skips any file
   that already exists, so if you want this package's versions of the `.claude/` files, re-run the installer with
   `--overwrite` (see Options). Project ledgers are never replaced.
## Install

```sh
npm install -g openspec-sdlc-starter
cd /path/to/your-repo
openspec-sdlc-starter --agent claude --bootstrap greenfield
```

To avoid a global install, run it with `npx`:

```sh
npx openspec-sdlc-starter@0.1.0 --agent claude --bootstrap greenfield
```

Then, in the repository:

1. Open Claude Code at the repository root and paste the prompt the installer names
   (`openspec/bootstrap/greenfield.md`). It interviews you, then writes `openspec/config.yaml`.
2. Restart Claude Code. Agent bindings register at session start.

For an existing codebase, use `--bootstrap brownfield` and paste `openspec/bootstrap/brownfield.md` instead.

## Build features with the workflow

Once the bootstrap has finished and Claude Code has restarted, use these commands in Claude Code:

- `/opsx:explore`: think through an idea and investigate the code before you commit to a change. It writes nothing.
- `/opsx:ff`: fast-forward. It creates the change and generates every artifact it needs in one go.
- `/opsx:new` and `/opsx:continue`: step through the artifacts one at a time, if you want to review each one.
- `/opsx:apply`: implement the change's tasks.
- `/opsx:verify`: check the implementation against the artifacts before archiving.
- `/opsx:archive`: finish the change and archive it.

### Skipping artifacts

- **Specs:** add `skip_specs: true` to the change's `.openspec.yaml` only when the change alters no observable behavior.
- **Other artifacts** (`e2e-test`, `performance-test`, `business-specification`, `system-architecture`): in the proposal's Artifact Plan table, mark the artifact `Exclude` and give a one-line reason. The workflow then writes no file for it. When unsure, mark `Include`.

### How the workflow works

Each change moves through these stages:

1. **Plan:** `proposal` (what and why), then `specs` (observable behavior), `design`, `test-plan` and `tasks`.
2. **Apply:** implement the tasks, running the tests after each one.
3. **Test and document:** `e2e-test`, `performance-test`, `business-specification` and `system-architecture`. These are optional per change. Each one also updates a project-wide file, so the project's behavior, architecture and test history stay current.
4. **Review and cost:** `final-code-review` checks the change before archive. `cost-report` summarizes the cost of the work.
5. **Archive:** the finished change is closed and its specs are merged into the project's main specs.

For a walkthrough of the workflow with examples, read [How the OpenSpec SDLC workflow works](https://www.sambasiva.dev/blog/openspec-sdlc-workflow/).

For the artifact dependencies, the templates and the cost tool, see the [schema README](https://github.com/sambasiva-dev/openspec-sdlc-starter/blob/master/openspec/schemas/sdlc-workflow/README.md).

## Options

| Option | Meaning |
| :-- | :-- |
| `--agent <name>` | Coding agent to install bindings for. Default `claude`. Only `claude` is supported today. |
| `--bootstrap <kind>` | `greenfield` (new project) or `brownfield` (existing code). Installs only that prompt. Omit to install both. |
| `--target <dir>` | Repository to install into. Default: the current directory. |
| `--overwrite` | Replace existing framework files. Project ledgers and history are never replaced. |
| `--dry-run` | Print what would happen. Write nothing. |
| `--version`, `--help` | |

Without `--overwrite`, existing files are skipped and listed.

## What gets installed

- `openspec/schemas/sdlc-workflow/`: the schema, templates, cost tool and pricing table
- `openspec/roles/` and `openspec/ORCHESTRATION.md`: persona role definitions and the orchestration procedure
- `.claude/agents/`, `.claude/commands/opsx/`, `.claude/skills/openspec-*`: Claude Code bindings
- `openspec/export-reference/config.reference.yaml`: a template with `<FILL: ...>` placeholders
- `openspec/bootstrap/`: the bootstrap prompt(s)
- `docs/specification.md`, `docs/design.md`, `docs/history/`: empty living ledgers, created only if missing

## Maintainers

This README lives at the workspace root. The package folder, `sdlc-installer/`, holds the install code. Its `payload/`, `manifest.json` and `README.md` are generated from the root sources and are gitignored. Edit the source, not the generated files. `prepack` runs the build, so `npm pack` and `npm publish` always ship a fresh copy.

```sh
npm run build -- /path/to/sdlc-source-repo   # defaults to the parent folder; pass a path if this folder is moved
npm run check
npm pack --dry-run
```

`build.mjs` copies only the files in its `MAP` table, tags agent-specific and bootstrap-specific files,
stores dot-prefixed paths under safe names, records a sha256 for each file, and refuses to build if a text
file contains an absolute home path or an email address.

## License

Apache License 2.0. See [LICENSE](LICENSE).

## Contributors

- [sambasiva-dev](https://github.com/sambasiva-dev)
