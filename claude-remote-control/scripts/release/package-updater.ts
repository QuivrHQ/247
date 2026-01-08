import { readFileSync, writeFileSync } from 'fs';

/**
 * All package.json files that need version updates
 */
export const PACKAGE_FILES = [
  'package.json',
  'packages/cli/package.json',
  'packages/shared/package.json',
  'apps/agent/package.json',
  'apps/web/package.json',
];

/**
 * The CLI index.ts file that contains version string
 */
const CLI_INDEX_PATH = 'packages/cli/src/index.ts';

/**
 * Get current version from root package.json
 */
export function getCurrentVersion(): string {
  const rootPkg = JSON.parse(readFileSync('package.json', 'utf-8'));
  return rootPkg.version;
}

/**
 * Update version in all package.json files
 */
export function updatePackageVersions(newVersion: string): string[] {
  const updatedFiles: string[] = [];

  for (const file of PACKAGE_FILES) {
    try {
      const content = readFileSync(file, 'utf-8');
      const pkg = JSON.parse(content);
      pkg.version = newVersion;

      // Preserve formatting with 2-space indent
      writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
      updatedFiles.push(file);
    } catch (error) {
      console.error(`Failed to update ${file}:`, error);
    }
  }

  return updatedFiles;
}

/**
 * Update version in CLI index.ts (.version('x.y.z'))
 */
export function updateCliVersionString(newVersion: string): boolean {
  try {
    let content = readFileSync(CLI_INDEX_PATH, 'utf-8');

    // Replace .version('x.y.z') with new version
    const versionRegex = /\.version\(['"][\d.]+['"]\)/;
    if (versionRegex.test(content)) {
      content = content.replace(versionRegex, `.version('${newVersion}')`);
      writeFileSync(CLI_INDEX_PATH, content, 'utf-8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Failed to update CLI version string:`, error);
    return false;
  }
}

/**
 * Get all files that will be modified
 */
export function getFilesToUpdate(): string[] {
  return [...PACKAGE_FILES, CLI_INDEX_PATH, 'CHANGELOG.md'];
}
