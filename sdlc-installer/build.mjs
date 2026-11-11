#!/usr/bin/env node
// Builds payload/ and manifest.json from the sdlc-workflow source tree.
//
//   node build.mjs [sourceRoot]
//
// sourceRoot defaults to the parent folder of this repo (the project that holds openspec/).
// The build copies only the portable files listed in MAP, stores each one under a Pages-safe
// name, records its sha256, and FAILS if a text file contains an absolute home path or an email
// address. Nothing in payload/ is hand-edited.

import { readFile, writeFile, mkdir, readdir, rm, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(process.argv[2] ?? path.join(here, '..'));
const payloadDir = path.join(here, 'payload');
const manifestPath = path.join(here, 'manifest.json');

// policy: 'overwrite' = replaced on install when --overwrite is set (portable framework files)
//         'create'    = written only if missing, never replaced (project ledgers and history)
const MAP = [
  { dir: 'openspec/schemas/sdlc-workflow', policy: 'overwrite', exclude: /\.DS_Store$/ },
  { dir: 'openspec/roles', policy: 'overwrite' },
  { file: 'openspec/ORCHESTRATION.md', policy: 'overwrite' },
  { dir: '.claude/agents', policy: 'overwrite', agent: 'claude' },
  { dir: '.claude/commands/opsx', policy: 'overwrite', agent: 'claude' },
  { dir: '.claude/skills', policy: 'overwrite', agent: 'claude', include: /^openspec-.*\/SKILL\.md$/ },
  { file: 'openspec/export-reference/config.reference.yaml', policy: 'overwrite' },
  { file: 'bootstrap-prompt-greenfield.md', to: 'openspec/bootstrap/greenfield.md', policy: 'overwrite', bootstrap: 'greenfield' },
  { file: 'bootstrap-prompt-brownfield.md', to: 'openspec/bootstrap/brownfield.md', policy: 'overwrite', bootstrap: 'brownfield' },
  { file: 'docs/specification.md', policy: 'create' },
  { file: 'docs/design.md', policy: 'create' },
  { dir: 'docs/history', policy: 'create' },
  { text: '', to: 'openspec/specs/.gitkeep', policy: 'create' },
  { text: '', to: 'openspec/changes/.gitkeep', policy: 'create' },
];

const TEXT_EXT = /\.(md|yaml|yml|json|py|mjs|js|txt)$/;

// Refuse to publish text that carries a machine path or an email address.
const GUARDS = [
  { re: /\/Users\//, what: 'absolute home path' },
  { re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, what: 'email address' },
];

async function walk(dir, base = dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full, base)));
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out.sort();
}

async function collect() {
  const entries = [];
  for (const rule of MAP) {
    if (rule.text !== undefined) {
      entries.push({ to: rule.to, bytes: Buffer.from(rule.text), policy: rule.policy, agent: rule.agent, bootstrap: rule.bootstrap });
      continue;
    }
    const files = rule.dir
      ? (await walk(path.join(sourceRoot, rule.dir))).map(f => `${rule.dir}/${f}`)
      : [rule.file];
    for (const rel of files) {
      if (rule.exclude && rule.exclude.test(rel)) continue;
      if (rule.include && !rule.include.test(rel.slice(rule.dir.length + 1))) continue;
      const bytes = await readFile(path.join(sourceRoot, rel)).catch(() => null);
      if (bytes === null) throw new Error(`missing source file: ${rel}`);
      entries.push({ to: rule.to ?? rel, bytes, policy: rule.policy, agent: rule.agent, bootstrap: rule.bootstrap });
    }
  }
  return entries;
}

// Pages may not serve dot-prefixed paths, so payload/ stores ".claude" as "dot-claude" etc.
// The manifest records both: `path` (where the file lands in the repo) and `store` (where it is fetched from).
function storePath(rel) {
  return 'payload/' + rel.split('/').map(seg => (seg.startsWith('.') ? 'dot-' + seg.slice(1) : seg)).join('/');
}

function checkGuards(to, bytes) {
  if (!TEXT_EXT.test(to)) return;
  const text = bytes.toString('utf8');
  for (const { re, what } of GUARDS) {
    const m = text.match(re);
    if (m) {
      const line = text.slice(0, m.index).split('\n').length;
      throw new Error(`${what} "${m[0]}" found in ${to}:${line}. Remove it from the source before building.`);
    }
  }
}

async function main() {
  const entries = await collect();
  await rm(payloadDir, { recursive: true, force: true });
  const files = [];
  for (const e of entries) {
    checkGuards(e.to, e.bytes);
    const store = storePath(e.to);
    const out = path.join(here, store);
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, e.bytes);
    files.push({
      path: e.to,
      store,
      policy: e.policy,
      ...(e.agent ? { agent: e.agent } : {}),
      ...(e.bootstrap ? { bootstrap: e.bootstrap } : {}),
      bytes: e.bytes.length,
      sha256: createHash('sha256').update(e.bytes).digest('hex'),
    });
  }
  const manifest = {
    name: 'sdlc-workflow',
    builtFrom: 'source tree (see build.mjs MAP)',
    fileCount: files.length,
    files,
  };
  // The package README and LICENSE are the workspace-root files, copied so npm ships them with the package.
  await copyFile(path.join(sourceRoot, 'README.md'), path.join(here, 'README.md'));
  await copyFile(path.join(sourceRoot, 'LICENSE'), path.join(here, 'LICENSE'));
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`built ${files.length} files into payload/ and manifest.json from ${sourceRoot}`);
}

main().catch(err => {
  console.error(`build failed: ${err.message}`);
  process.exit(1);
});
