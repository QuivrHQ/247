/**
 * VAPID key management for Web Push notifications.
 * Keys are generated once and stored in ~/.247/vapid.json
 */

import webpush from 'web-push';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

interface VapidKeys {
  publicKey: string;
  privateKey: string;
  subject: string;
}

const CONFIG_DIR = resolve(process.env.HOME || '~', '.247');
const VAPID_FILE = resolve(CONFIG_DIR, 'vapid.json');

let cachedKeys: VapidKeys | null = null;

/**
 * Get or generate VAPID keys.
 * Keys are cached in memory and persisted to disk.
 */
export function getVapidKeys(): VapidKeys {
  if (cachedKeys) {
    return cachedKeys;
  }

  // Try to load from file
  if (existsSync(VAPID_FILE)) {
    try {
      const content = readFileSync(VAPID_FILE, 'utf-8');
      const loaded = JSON.parse(content) as Partial<VapidKeys>;

      // Validate that all required fields exist
      if (loaded.publicKey && loaded.privateKey && loaded.subject) {
        cachedKeys = loaded as VapidKeys;
        console.log('[VAPID] Loaded keys from file');
        return cachedKeys;
      }

      // Keys incomplete, will regenerate
      console.log('[VAPID] Loaded keys are incomplete, regenerating...');
    } catch (err) {
      console.error('[VAPID] Failed to load keys, regenerating:', err);
    }
  }

  // Generate new keys
  console.log('[VAPID] Generating new keys...');
  const keys = webpush.generateVAPIDKeys();

  cachedKeys = {
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
    subject: 'mailto:247@quivr.com', // Required for VAPID
  };

  // Persist to file
  try {
    const dir = dirname(VAPID_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(VAPID_FILE, JSON.stringify(cachedKeys, null, 2));
    console.log('[VAPID] Keys saved to:', VAPID_FILE);
  } catch (err) {
    console.error('[VAPID] Failed to save keys:', err);
  }

  return cachedKeys;
}

/**
 * Get the public VAPID key (for client subscription).
 */
export function getPublicVapidKey(): string {
  return getVapidKeys().publicKey;
}

/**
 * Initialize web-push with VAPID keys.
 * Call this at server startup.
 */
export function initWebPush(): void {
  try {
    const keys = getVapidKeys();
    webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
    console.log('[VAPID] web-push initialized');
  } catch (err) {
    // In test environments, we may not have proper config directory access
    console.warn('[VAPID] Failed to initialize web-push:', (err as Error).message);
    console.warn('[VAPID] Push notifications will be disabled');
  }
}
