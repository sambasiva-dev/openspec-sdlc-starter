# openspec-sdlc-starter

Installs the OpenSpec `sdlc-workflow` schema, Claude Code agent bindings and bootstrap prompts into a
repository, so the bootstrap can configure the project.

## Use

```sh
npm install openspec-sdlc-starter
npx openspec-sdlc-starter --agent claude --bootstrap greenfield
```

Then, in the repository:

1. Open Claude Code at the repository root and paste the prompt the installer names
   (`openspec/bootstrap/greenfield.md`). It interviews you, then writes `openspec/config.yaml`.
2. Restart Claude Code. Agent bindings register at session start.

Requires Node 20+ and the OpenSpec CLI (`openspec`) on your PATH.

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
