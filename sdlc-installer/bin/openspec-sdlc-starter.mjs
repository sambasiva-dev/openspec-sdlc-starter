#!/usr/bin/env node
// openspec-sdlc-starter: install the OpenSpec sdlc-workflow schema and Claude Code bindings into a repo.
//
//   npm install openspec-sdlc-starter
//   npx openspec-sdlc-starter --agent claude --bootstrap greenfield
//
// Options
//   --agent <name>        coding agent to install bindings for. Only "claude" is supported today.
//   --bootstrap <kind>    "greenfield" (new project) or "brownfield" (existing code). Installs only that
//                         bootstrap prompt. Omit to install both.
//   --target <dir>        repository to install into (default: current directory).
//   --overwrite           replace existing framework files. Project ledgers and history are never replaced.
//   --dry-run             print what would happen and write nothing.
//   --help, --version

import { readFile, mkdir, writeFile, access, stat, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { install, nextSteps, selectFiles } from '../lib/install-core.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(here, '..');
const AGENTS = ['claude'];
const BOOTSTRAPS = ['greenfield', 'brownfield'];

const USAGE = `usage: openspec-sdlc-starter [--agent claude] [--bootstrap greenfield|brownfield]
                              [--target <dir>] [--overwrite] [--dry-run]

  --agent <name>        coding agent (default: claude)
  --bootstrap <kind>    greenfield (new project) or brownfield (existing code); omit to install both prompts
  --target <dir>        repository to install into (default: current directory)
  --overwrite           replace existing framework files; project ledgers are never replaced
  --dry-run             show what would happen, write nothing
  --version, --help`;

function parseArgs(argv) {
  const opts = { agent: 'claude', bootstrap: null, target: null, overwrite: false, dryRun: false, help: false, version: false, errors: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) { opts.errors.push(`${a} needs a value`); return null; }
      i++;
      return v;
    };
    switch (a) {
      case '--agent': opts.agent = value(); break;
      case '--bootstrap': opts.bootstrap = value(); break;
      case '--target': opts.target = value(); break;
      case '--overwrite': opts.overwrite = true; break;
      case '--dry-run': opts.dryRun = true; break;
      case '--help': case '-h': opts.help = true; break;
      case '--version': case '-v': opts.version = true; break;
      default:
        if (a.startsWith('--')) opts.errors.push(`unknown option: ${a}`);
        else if (!opts.target) opts.target = a;
        else opts.errors.push(`unexpected argument: ${a}`);
    }
  }
  if (opts.agent && !AGENTS.includes(opts.agent)) {
    opts.errors.push(`unsupported agent "${opts.agent}". Supported: ${AGENTS.join(', ')}`);
  }
  if (opts.bootstrap && !BOOTSTRAPS.includes(opts.bootstrap)) {
    opts.errors.push(`unsupported bootstrap "${opts.bootstrap}". Use: ${BOOTSTRAPS.join(' or ')}`);
  }
  return opts;
}

const source = {
  manifest: async () => JSON.parse(await readFile(path.join(packageRoot, 'manifest.json'), 'utf8')),
  read: async entry => new Uint8Array(await readFile(path.join(packageRoot, entry.store))),
};

function fsWriter(root) {
  return {
    exists: async rel => {
      try { await access(path.join(root, rel)); return true; } catch { return false; }
    },
    write: async (rel, bytes) => {
      const full = path.join(root, rel);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, bytes);
    },
  };
}

function hasOpenSpecCli() {
  return new Promise(resolve => {
    execFile('openspec', ['--version'], err => resolve(!err));
  });
}

// Markers that suggest the folder already holds application code.
const CODE_MARKERS = ['package.json', 'pyproject.toml', 'go.mod', 'pom.xml', 'Cargo.toml', 'src', 'app', 'lib'];

async function looksLikeExistingCode(target) {
  const entries = await readdir(target).catch(() => []);
  return entries.some(e => CODE_MARKERS.includes(e) || e.endsWith('.sln'));
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) { console.log(USAGE); return 0; }
  if (opts.version) {
    const pkg = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
    console.log(pkg.version);
    return 0;
  }
  if (opts.errors.length) {
    opts.errors.forEach(e => console.error(`error: ${e}`));
    console.error(USAGE);
    return 1;
  }

  const target = path.resolve(opts.target ?? process.cwd());
  const s = await stat(target).catch(() => null);
  if (!s || !s.isDirectory()) {
    console.error(`error: target is not a directory: ${target}`);
    return 1;
  }

  const warnings = [];
  if (!(await hasOpenSpecCli())) {
    warnings.push('the `openspec` CLI was not found on PATH. Install it before running the bootstrap.');
  }
  if (opts.bootstrap === 'greenfield' && (await looksLikeExistingCode(target))) {
    warnings.push('this folder already contains code (package.json, src/, a solution file, ...). If so, use --bootstrap brownfield.');
  }

  const filtered = {
    manifest: async () => selectFiles(await source.manifest(), { agent: opts.agent, bootstrap: opts.bootstrap }),
    read: source.read,
  };

  console.log(`${opts.dryRun ? 'Planning' : 'Installing'} openspec-sdlc-starter (agent: ${opts.agent}, bootstrap: ${opts.bootstrap ?? 'both'})`);
  console.log(`target: ${target}`);
  const summary = await install({
    source: filtered,
    writer: fsWriter(target),
    overwrite: opts.overwrite,
    dryRun: opts.dryRun,
    log: msg => console.log(`  ${msg}`),
  });

  const list = (title, items, fmt = x => x) => {
    if (!items.length) return;
    console.log(`\n${title} (${items.length}):`);
    for (const i of items) console.log(`  - ${fmt(i)}`);
  };
  list('Created', summary.created);
  list('Overwritten', summary.overwritten);
  list('Skipped', summary.skipped, x => `${x.path}: ${x.reason}`);

  if (warnings.length) {
    console.log('\nWarnings:');
    for (const w of warnings) console.log(`  - ${w}`);
  }
  if (!opts.dryRun) {
    console.log('\nNext steps:');
    nextSteps({ bootstrap: opts.bootstrap }).forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
  }
  return 0;
}

main().then(code => { process.exitCode = code; }).catch(err => {
  console.error(`error: ${err.message}`);
  process.exitCode = 1;
});
