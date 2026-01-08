export type BumpType = 'major' | 'minor' | 'patch' | 'none';

export interface ConventionalCommit {
  hash: string;
  type: string;
  scope?: string;
  breaking: boolean;
  subject: string;
  body: string;
}

/**
 * Mapping of commit types to bump levels
 */
const COMMIT_TYPE_BUMPS: Record<string, BumpType> = {
  feat: 'minor',
  fix: 'patch',
  perf: 'patch',
  refactor: 'patch',
  chore: 'patch',
  docs: 'patch',
  style: 'patch',
  test: 'patch',
  ci: 'patch',
  build: 'patch',
};

const BUMP_PRIORITY: Record<BumpType, number> = {
  major: 3,
  minor: 2,
  patch: 1,
  none: 0,
};

/**
 * Parse a commit message into conventional commit format
 */
export function parseConventionalCommit(
  hash: string,
  subject: string,
  body: string
): ConventionalCommit | null {
  // Regex: type(scope)!: subject or type!: subject or type: subject
  const regex = /^(\w+)(?:\(([^)]+)\))?(!)?\s*:\s*(.+)$/;
  const match = subject.match(regex);

  if (!match) {
    return null;
  }

  const [, type, scope, breakingMark, commitSubject] = match;

  // Check for breaking change in body or with ! mark
  const hasBreakingInBody = body.includes('BREAKING CHANGE') || body.includes('BREAKING-CHANGE');
  const breaking = !!breakingMark || hasBreakingInBody;

  return {
    hash,
    type: type.toLowerCase(),
    scope: scope || undefined,
    breaking,
    subject: commitSubject.trim(),
    body,
  };
}

/**
 * Calculate the bump type based on commits
 */
export function calculateBump(commits: ConventionalCommit[]): BumpType {
  let highestBump: BumpType = 'none';

  for (const commit of commits) {
    // Breaking changes always trigger major
    if (commit.breaking) {
      return 'major';
    }

    // Get bump for this commit type
    const bump = COMMIT_TYPE_BUMPS[commit.type] || 'none';

    // Keep track of highest bump
    if (BUMP_PRIORITY[bump] > BUMP_PRIORITY[highestBump]) {
      highestBump = bump;
    }
  }

  return highestBump;
}

/**
 * Increment version based on bump type
 */
export function incrementVersion(currentVersion: string, bump: BumpType): string {
  const [major, minor, patch] = currentVersion.split('.').map(Number);

  switch (bump) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      return currentVersion;
  }
}

/**
 * Validate a version string
 */
export function isValidVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(version);
}
