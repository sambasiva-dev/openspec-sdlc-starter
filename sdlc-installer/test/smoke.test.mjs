// Smoke tests for the CLI. Run with `npm test`. They need the payload, which `pretest` builds from the repo root.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readdir, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bin = path.join(root, 'bin', 'openspec-sdlc-starter.mjs');

function run(args) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [bin, ...args], (err, stdout, stderr) => {
      if (err) reject(Object.assign(err, { stdout, stderr }));
      else resolve({ stdout, stderr });
    });
  });
}

async function listFiles(dir, base = dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listFiles(full, base)));
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

async function tempTarget() {
  return mkdtemp(path.join(os.tmpdir(), 'sdlc-starter-'));
}

test('--version prints the package version', async () => {
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const { stdout } = await run(['--version']);
  assert.equal(stdout.trim(), pkg.version);
});

test('an unsupported agent is rejected with exit code 1', async () => {
  const target = await tempTarget();
  try {
    await assert.rejects(run(['--agent', 'cursor', '--target', target]), err => {
      assert.equal(err.code, 1);
      assert.match(err.stderr, /unsupported agent "cursor"/);
      return true;
    });
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test('greenfield install writes the schema, Claude bindings and only the greenfield prompt', async () => {
  const target = await tempTarget();
  try {
    await run(['--agent', 'claude', '--bootstrap', 'greenfield', '--target', target]);
    const files = await listFiles(target);
    assert.ok(files.includes('openspec/schemas/sdlc-workflow/schema.yaml'));
    assert.ok(files.includes('.claude/agents/tech-lead.md'));
    assert.ok(files.includes('openspec/bootstrap/greenfield.md'));
    assert.ok(!files.includes('openspec/bootstrap/brownfield.md'));
    assert.ok(files.includes('docs/specification.md'));
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test('--dry-run writes nothing', async () => {
  const target = await tempTarget();
  try {
    const { stdout } = await run(['--dry-run', '--target', target]);
    assert.match(stdout, /Planning/);
    assert.equal((await listFiles(target)).length, 0);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test('a re-run skips existing files unless --overwrite is given', async () => {
  const target = await tempTarget();
  try {
    await run(['--bootstrap', 'greenfield', '--target', target]);
    const { stdout } = await run(['--bootstrap', 'greenfield', '--target', target]);
    assert.match(stdout, /already exists/);
    assert.doesNotMatch(stdout, /^Created/m);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
