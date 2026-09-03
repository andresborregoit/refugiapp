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
  },
  {
    name: 'jwt_secret_assignment',
    pattern: /^JWT_SECRET[^\S\r\n]*=[^\S\r\n]*(?!$|replace-with)[^\s\r\n]{16,}$/gm,
  },
  {
    name: 'cloudinary_secret_assignment',
    pattern:
      /^CLOUDINARY_API_SECRET[^\S\r\n]*=[^\S\r\n]*(?!$|your-api-secret)[^\s\r\n]+$/gm,
  },
  {
    name: 'initial_admin_password_assignment',
    pattern:
      /^INITIAL_ADMIN_PASSWORD[^\S\r\n]*=[^\S\r\n]*(?!$|replace-with-a-long-random-password)[^\s\r\n]{8,}$/gm,
  },
];

const ignoredPaths = new Set(['.env']);

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function getTrackedFiles() {
  return git(['ls-files'])
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((file) => !ignoredPaths.has(file));
}

function getCommits() {
  return git(['rev-list', '--all']).split(/\r?\n/).filter(Boolean);
}

function scanContent(scope, ref, file, content) {
  const findings = [];

  for (const rule of rules) {
    rule.pattern.lastIndex = 0;

    for (const match of content.matchAll(rule.pattern)) {
      const line = content.slice(0, match.index).split(/\r?\n/).length;

      findings.push({ scope, rule: rule.name, ref, file, line });
    }
  }

  return findings;
}

function readFileAtCommit(commit, file) {
  try {
    return execFileSync('git', ['show', `${commit}:${file}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return '';
  }
}

const files = getTrackedFiles();
const findings = [];

for (const file of files) {
  if (!existsSync(file)) {
    continue;
  }

  findings.push(...scanContent('worktree', 'HEAD', file, readFileSync(file, 'utf8')));
}

for (const commit of getCommits()) {
  for (const file of files) {
    findings.push(...scanContent('history', commit.slice(0, 12), file, readFileAtCommit(commit, file)));
  }
}

const uniqueFindings = [
  ...new Map(
    findings.map((finding) => [
      `${finding.scope}:${finding.rule}:${finding.ref}:${finding.file}:${finding.line}`,
      finding,
    ]),
  ).values(),
];

if (uniqueFindings.length > 0) {
  console.error('Secret scan failed. Sanitized findings:');

  for (const finding of uniqueFindings) {
    console.error(
      `${finding.scope} ${finding.rule} ${finding.ref} ${finding.file}:${finding.line}`,
    );
  }

  process.exitCode = 1;
} else {
  console.info('Secret scan passed. No tracked secrets were detected.');
}
