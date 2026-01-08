/**
 * Version management module for auto-update functionality.
 * Reads agent version and provides semver comparison utilities.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let cachedVersion: string | null = null;

/**
 * Get the current agent version from package.json.
 * Tries multiple paths to support both dev and production (bundled in CLI).
 */
export function getAgentVersion(): string {
  if (cachedVersion) return cachedVersion;

  // Paths to try in order:
  // 1. Dev mode: apps/agent/package.json (src -> apps/agent)
  // 2. Prod mode: CLI's package.json (dist -> agent -> cli)
  const paths = [
    join(__dirname, '..', 'package.json'), // dev: src/version.ts -> apps/agent/
    join(__dirname, '..', '..', '..', 'package.json'), // prod: dist/version.js -> agent/dist -> agent -> cli/
  ];

  for (const p of paths) {
    try {
      const pkg = JSON.parse(readFileSync(p, 'utf-8'));
      if (pkg.version) {
        cachedVersion = pkg.version as string;
        return cachedVersion;
      }
    } catch {
      // Try next path
    }
  }

  cachedVersion = '0.0.0';
  return cachedVersion;
}

/**
 * Compare two semver versions.
 * @returns positive if a > b, negative if a < b, 0 if equal
 */
export function compareSemver(a: string, b: string): number {
  // Remove 'v' prefix if present
  const cleanA = a.replace(/^v/, '');
  const cleanB = b.replace(/^v/, '');

  const partsA = cleanA.split('.').map((n) => parseInt(n, 10) || 0);
  const partsB = cleanB.split('.').map((n) => parseInt(n, 10) || 0);

  // Compare major, minor, patch
  for (let i = 0; i < 3; i++) {
    const va = partsA[i] || 0;
    const vb = partsB[i] || 0;
    if (va !== vb) {
      return va - vb;
    }
  }

  return 0;
}

/**
 * Check if the agent needs to update to match the web version.
 * Only returns true if web version is strictly greater (never downgrade).
 */
export function needsUpdate(agentVersion: string, webVersion: string): boolean {
  return compareSemver(webVersion, agentVersion) > 0;
}
