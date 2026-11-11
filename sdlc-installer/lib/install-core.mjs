// Shared install logic for the browser installer and the Node CLI.
// No DOM and no Node built-ins here: both environments pass in a `source` and a `writer`.
//
//   source: { manifest(): Promise<Manifest>, read(entry): Promise<Uint8Array> }   // entry.store = where to fetch
//   writer: { exists(path): Promise<boolean>, write(path, bytes): Promise<void> }
//
// Policies (set per file by build.mjs):
//   overwrite  portable framework files. Replaced only when `overwrite: true`.
//   create     project ledgers and history. Written only when missing. Never replaced.

export async function sha256Hex(bytes) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Decide what each manifest entry does. Pure except for the writer.exists() lookups.
export async function plan(manifest, writer, { overwrite = false } = {}) {
  const result = { create: [], overwrite: [], skip: [] };
  for (const file of manifest.files) {
    const present = await writer.exists(file.path);
    if (!present) {
      result.create.push(file);
    } else if (file.policy === 'overwrite' && overwrite) {
      result.overwrite.push(file);
    } else {
      const reason = file.policy === 'create'
        ? 'project file already exists (never replaced)'
        : 'already exists (run with overwrite to replace)';
      result.skip.push({ ...file, reason });
    }
  }
  return result;
}

// Install into writer. Verifies each payload file's sha256 against the manifest before writing.
export async function install({ source, writer, overwrite = false, dryRun = false, log = () => {} }) {
  const manifest = await source.manifest();
  const p = await plan(manifest, writer, { overwrite });
  const summary = {
    created: p.create.map(f => f.path),
    overwritten: p.overwrite.map(f => f.path),
    skipped: p.skip.map(f => ({ path: f.path, reason: f.reason })),
    dryRun,
  };
  if (dryRun) {
    log(`dry run: would create ${summary.created.length}, overwrite ${summary.overwritten.length}, skip ${summary.skipped.length}`);
    return summary;
  }
  for (const file of [...p.create, ...p.overwrite]) {
    const bytes = await source.read(file);
    const actual = await sha256Hex(bytes);
    if (actual !== file.sha256) {
      throw new Error(`checksum mismatch for ${file.path}: payload is corrupt, rebuild the installer`);
    }
    await writer.write(file.path, bytes);
    log(`${p.create.includes(file) ? 'created' : 'overwrote'} ${file.path}`);
  }
  return summary;
}

// Steps shown after an install. `bootstrap` is the prompt the user chose, or null for both.
export function nextSteps({ bootstrap = null } = {}) {
  const prompt = bootstrap
    ? `openspec/bootstrap/${bootstrap}.md`
    : 'openspec/bootstrap/greenfield.md (new project) or openspec/bootstrap/brownfield.md (existing code)';
  return [
    `Open Claude Code at the repo root and paste ${prompt}. The bootstrap interviews you, then writes openspec/config.yaml from openspec/export-reference/config.reference.yaml.`,
    'Restart Claude Code after the bootstrap finishes: agent bindings register at session start.',
    'Make sure the OpenSpec CLI (`openspec`) is on your PATH; the bootstrap and the schema both call it.',
  ];
}

// Keep only the manifest entries that apply to the chosen agent and bootstrap.
// Untagged entries (portable framework files, ledgers) always apply.
export function selectFiles(manifest, { agent = null, bootstrap = null } = {}) {
  return {
    ...manifest,
    files: manifest.files.filter(f =>
      (!f.agent || f.agent === agent) && (!f.bootstrap || !bootstrap || f.bootstrap === bootstrap)),
  };
}
