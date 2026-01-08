import { execSync } from 'child_process';

/**
 * Get the most recent git tag
 */
export function getLastTag(): string | null {
  try {
    const tag = execSync('git describe --tags --abbrev=0 2>/dev/null', {
      encoding: 'utf-8',
    }).trim();
    return tag || null;
  } catch {
    return null;
  }
}

/**
 * Get all commits since a given tag (or all commits if no tag)
 * Returns array of { hash, subject, body }
 */
export function getCommitsSince(tag: string | null): Array<{
  hash: string;
  subject: string;
  body: string;
}> {
  const range = tag ? `${tag}..HEAD` : 'HEAD';
  const separator = '---COMMIT_SEP---';
  const fieldSep = '---FIELD_SEP---';

  try {
    const output = execSync(
      `git log ${range} --format="%H${fieldSep}%s${fieldSep}%b${separator}"`,
      { encoding: 'utf-8' }
    );

    return output
      .split(separator)
      .filter((c) => c.trim())
      .map((commit) => {
        const [hash, subject, body] = commit.split(fieldSep);
        return {
          hash: hash?.trim().substring(0, 7) || '',
          subject: subject?.trim() || '',
          body: body?.trim() || '',
        };
      })
      .filter((c) => c.hash && c.subject);
  } catch {
    return [];
  }
}

/**
 * Check if there are uncommitted changes
 */
export function hasUncommittedChanges(): boolean {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    return status.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Get current branch name
 */
export function getCurrentBranch(): string {
  try {
    return execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Check if remote is accessible
 */
export function canPushToRemote(): boolean {
  try {
    execSync('git remote get-url origin', { encoding: 'utf-8' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Stage all package.json and changelog files
 */
export function stageFiles(files: string[]): void {
  for (const file of files) {
    execSync(`git add "${file}"`, { encoding: 'utf-8' });
  }
}

/**
 * Create a git commit
 */
export function createCommit(message: string): void {
  // Use heredoc-style to handle multi-line messages
  execSync(`git commit -m "${message}"`, { encoding: 'utf-8' });
}

/**
 * Create a git tag
 */
export function createTag(version: string): void {
  execSync(`git tag v${version}`, { encoding: 'utf-8' });
}

/**
 * Push commits and tags to remote
 */
export function pushToRemote(): void {
  execSync('git push && git push --tags', { encoding: 'utf-8' });
}
