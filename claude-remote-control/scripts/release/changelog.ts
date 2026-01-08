import { readFileSync, writeFileSync, existsSync } from 'fs';
import { ConventionalCommit } from './version.js';

const CHANGELOG_PATH = 'CHANGELOG.md';

/**
 * Group commits by type for changelog
 */
function groupCommitsByType(commits: ConventionalCommit[]): Record<string, ConventionalCommit[]> {
  const groups: Record<string, ConventionalCommit[]> = {};

  for (const commit of commits) {
    const type = commit.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(commit);
  }

  return groups;
}

/**
 * Get display name for commit type
 */
function getTypeDisplayName(type: string): string {
  const displayNames: Record<string, string> = {
    feat: 'Features',
    fix: 'Bug Fixes',
    perf: 'Performance',
    refactor: 'Refactoring',
    docs: 'Documentation',
    style: 'Styling',
    test: 'Tests',
    ci: 'CI/CD',
    build: 'Build',
    chore: 'Chores',
  };
  return displayNames[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Order of types in changelog (most important first)
 */
const TYPE_ORDER = ['feat', 'fix', 'perf', 'refactor', 'docs', 'style', 'test', 'ci', 'build', 'chore'];

/**
 * Generate a changelog entry for a version
 */
export function generateChangelogEntry(
  version: string,
  commits: ConventionalCommit[]
): string {
  const date = new Date().toISOString().split('T')[0];
  const grouped = groupCommitsByType(commits);

  let entry = `## [${version}] - ${date}\n\n`;

  // Check for breaking changes first
  const breakingCommits = commits.filter((c) => c.breaking);
  if (breakingCommits.length > 0) {
    entry += `### Breaking Changes\n\n`;
    for (const commit of breakingCommits) {
      const scope = commit.scope ? `**${commit.scope}**: ` : '';
      entry += `- ${scope}${commit.subject} (${commit.hash})\n`;
    }
    entry += '\n';
  }

  // Add commits by type
  for (const type of TYPE_ORDER) {
    const typeCommits = grouped[type];
    if (!typeCommits || typeCommits.length === 0) continue;

    entry += `### ${getTypeDisplayName(type)}\n\n`;
    for (const commit of typeCommits) {
      const scope = commit.scope ? `**${commit.scope}**: ` : '';
      entry += `- ${scope}${commit.subject} (${commit.hash})\n`;
    }
    entry += '\n';
  }

  return entry;
}

/**
 * Update or create CHANGELOG.md
 */
export function updateChangelog(entry: string): void {
  let content: string;

  if (existsSync(CHANGELOG_PATH)) {
    const existing = readFileSync(CHANGELOG_PATH, 'utf-8');

    // Find where to insert (after the header)
    const headerEnd = existing.indexOf('\n## ');
    if (headerEnd !== -1) {
      content = existing.slice(0, headerEnd) + '\n' + entry + existing.slice(headerEnd + 1);
    } else {
      content = existing + '\n' + entry;
    }
  } else {
    content = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

${entry}`;
  }

  writeFileSync(CHANGELOG_PATH, content, 'utf-8');
}
