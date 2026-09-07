import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const rules = [
  {
    name: 'neon_token',
    pattern: /npg_[A-Za-z0-9]+/g,
  },
  {
    name: 'postgres_url_with_embedded_credentials',
    pattern:
      /postgres(?:ql)?:\/\/(?!(?:<[^>]+>:<[^>]+>|USER:PASSWORD)@)[^:\s/@]+:[^@\s]+@/g,
    skipHistory: true,
  },
  {
    name: 'jwt_secret_assignment',
    pattern: /^JWT_SECRET[^\S\r\n]*=[^\S\r\n]*(?!$|replace-with)[^\s\r\n]{16,}$/gm,
    skipHistory: true,
  },
  {
    name: 'cloudinary_secret_assignment',
    pattern:
      /^CLOUDINARY_API_SECRET[^\S\r\n]*=[^\S\r\n]*(?!$|your-api-secret)[^\s\r\n]+$/gm,
    skipHistory: true,
  },
  {
    name: 'initial_admin_password_assignment',
    pattern:
      /^INITIAL_ADMIN_PASSWORD[^\S\r\n]*=[^\S\r\n]*(?!$|replace-with-a-long-random-password)[^\s\r\n]{8,}$/gm,
    skipHistory: true,
  },
];

const ignoredPaths = new Set(['.env']);

function git(args, options = {}) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
    ...options,
  }).trim();
}

function getTrackedFiles() {
  return git(['ls-files'])
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((file) => !ignoredPaths.has(file));
}

function scanContent(content, rule) {
  rule.pattern.lastIndex = 0;
  return [...content.matchAll(rule.pattern)];
}

function scanWorktree(files) {
  const findings = [];

  for (const file of files) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, 'utf8');

    for (const rule of rules) {
      const matches = scanContent(content, rule);
      for (const match of matches) {
        const line = content.slice(0, match.index).split(/\r?\n/).length;
        findings.push({ scope: 'worktree', rule: rule.name, ref: 'HEAD', file, line });
      }
    }
  }

  return findings;
}

function scanHistory() {
  const findings = [];

  const logOutput = git(
    ['log', '-p', '--all', '--', '.'],
    { maxBuffer: 200 * 1024 * 1024 },
  );

  const commitRe = /^[0-9a-f]{40}(?: \S.+)?$/gm;
  const fileRe = /^\+\+\+ b\/(.+)$/gm;
  const lineRe = /^\+(?![\+\-])/gm;

  const lines = logOutput.split('\n');
  let currentCommit = '?';
  let currentFile = '?';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const commitMatch = line.match(/^commit ([0-9a-f]{40})/);
    if (commitMatch) {
      currentCommit = commitMatch[1].slice(0, 12);
      currentFile = '?';
      continue;
    }

    const fileMatch = line.match(/^\+\+\+ b\/(.+)/);
    if (fileMatch) {
      currentFile = fileMatch[1];
    }

    for (const rule of rules) {
      if (rule.skipHistory) continue;
      rule.pattern.lastIndex = 0;
      const matches = [...line.matchAll(new RegExp(rule.pattern, 'g'))];
      for (const match of matches) {
        findings.push({
          scope: 'history',
          rule: rule.name,
          ref: currentCommit,
          file: currentFile,
          line: i + 1,
        });
      }
    }
  }

  return findings;
}

const files = getTrackedFiles();

const findings = [
  ...scanWorktree(files),
  ...scanHistory(),
];

const uniqueFindings = [
  ...new Map(
    findings.map((f) => [`${f.scope}:${f.rule}:${f.ref}:${f.file}:${f.line}`, f]),
  ).values(),
];

if (uniqueFindings.length > 0) {
  console.error('Secret scan failed. Sanitized findings:');
  for (const f of uniqueFindings) {
    console.error(`${f.scope} ${f.rule} ${f.ref} ${f.file}:${f.line}`);
  }
  process.exitCode = 1;
} else {
  console.info('Secret scan passed. No tracked secrets were detected.');
}
