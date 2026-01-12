import { logger } from './logger.js';

const FLYIO_GRAPHQL_URL = 'https://api.fly.io/graphql';

export interface FlyOrganization {
  id: string;
  name: string;
  slug: string;
  type: string;
}

export interface ValidateTokenResult {
  valid: boolean;
  organizations: FlyOrganization[];
  error?: string;
}

/**
 * Validates a Fly.io token and retrieves the user's organizations
 */
export async function validateTokenAndGetOrgs(token: string): Promise<ValidateTokenResult> {
  const query = `
    query {
      viewer {
        organizations {
          nodes {
            id
            name
            slug
            type
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(FLYIO_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, 'Fly.io API returned non-OK status');
      return {
        valid: false,
        organizations: [],
        error: response.status === 401 ? 'Invalid token' : `API error: ${response.status}`,
      };
    }

    const data = (await response.json()) as {
      data?: {
        viewer?: {
          organizations?: {
            nodes?: FlyOrganization[];
          };
        };
      };
      errors?: Array<{ message: string }>;
    };

    if (data.errors && data.errors.length > 0) {
      logger.warn({ errors: data.errors }, 'Fly.io GraphQL returned errors');
      return {
        valid: false,
        organizations: [],
        error: data.errors[0].message,
      };
    }

    const organizations = data.data?.viewer?.organizations?.nodes || [];

    return {
      valid: true,
      organizations,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to validate Fly.io token');
    return {
      valid: false,
      organizations: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetches the list of organizations for a validated token
 */
export async function getOrganizations(token: string): Promise<FlyOrganization[]> {
  const result = await validateTokenAndGetOrgs(token);
  return result.organizations;
}

// =============================================================================
// IP Address Allocation (GraphQL API)
// The Machines REST API doesn't support IP allocation, so we use GraphQL
// =============================================================================

/**
 * Allocate a shared IPv4 address for the app via GraphQL API
 * Required for public internet access when using Machines API
 */
export async function allocateSharedIPv4(
  token: string,
  appName: string
): Promise<{ success: boolean; error?: string }> {
  const mutation = `
    mutation ($input: AllocateIPAddressInput!) {
      allocateIpAddress(input: $input) {
        app { sharedIpAddress }
      }
    }
  `;

  try {
    const response = await fetch(FLYIO_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: mutation,
        variables: { input: { appId: appName, type: 'shared_v4' } },
      }),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = (await response.json()) as {
      data?: unknown;
      errors?: Array<{ message: string }>;
    };

    if (data.errors && data.errors.length > 0) {
      const error = data.errors[0].message;
      // Ignore "already allocated" errors
      if (error.includes('already') || error.includes('exists')) {
        logger.info({ appName }, 'Shared IPv4 already allocated');
        return { success: true };
      }
      return { success: false, error };
    }

    logger.info({ appName }, 'Shared IPv4 allocated successfully');
    return { success: true };
  } catch (error) {
    logger.error({ error, appName }, 'Failed to allocate shared IPv4');
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Allocate a dedicated IPv6 address for the app via GraphQL API
 * Required for public internet access when using Machines API
 */
export async function allocateIPv6(
  token: string,
  appName: string
): Promise<{ success: boolean; error?: string }> {
  const mutation = `
    mutation ($input: AllocateIPAddressInput!) {
      allocateIpAddress(input: $input) {
        ipAddress { address type }
      }
    }
  `;

  try {
    const response = await fetch(FLYIO_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: mutation,
        variables: { input: { appId: appName, type: 'v6' } },
      }),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = (await response.json()) as {
      data?: unknown;
      errors?: Array<{ message: string }>;
    };

    if (data.errors && data.errors.length > 0) {
      const error = data.errors[0].message;
      // Ignore "already allocated" errors
      if (error.includes('already') || error.includes('exists')) {
        logger.info({ appName }, 'IPv6 already allocated');
        return { success: true };
      }
      return { success: false, error };
    }

    logger.info({ appName }, 'IPv6 allocated successfully');
    return { success: true };
  } catch (error) {
    logger.error({ error, appName }, 'Failed to allocate IPv6');
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// =============================================================================
// Fly.io Machines REST API
// =============================================================================

const FLY_MACHINES_API = 'https://api.machines.dev';

export interface FlyApp {
  id: string;
  name: string;
  organization: {
    slug: string;
  };
  created_at: number;
}

export interface FlyVolume {
  id: string;
  name: string;
  state: string;
  size_gb: number;
  region: string;
  attached_machine_id: string | null;
  created_at: string;
}

export interface FlyMachineService {
  protocol: 'tcp' | 'udp';
  internal_port: number;
  ports: Array<{
    port: number;
    handlers: string[];
  }>;
  autostop?: 'off' | 'stop' | 'suspend';
  autostart?: boolean;
}

export interface FlyMachineCheck {
  type: 'http' | 'tcp';
  port?: number;
  path?: string;
  interval?: string;
  timeout?: string;
  grace_period?: string;
}

export interface FlyMachineConfig {
  image: string;
  env?: Record<string, string>;
  guest?: {
    cpu_kind?: 'shared' | 'performance';
    cpus?: number;
    memory_mb?: number;
  };
  services?: FlyMachineService[];
  mounts?: Array<{
    volume: string;
    path: string;
  }>;
  restart?: {
    policy?: 'no' | 'on-failure' | 'always';
  };
  auto_destroy?: boolean;
  checks?: Record<string, FlyMachineCheck>;
}

export interface FlyMachine {
  id: string;
  name: string;
  state: 'created' | 'starting' | 'started' | 'stopping' | 'stopped' | 'destroying' | 'destroyed';
  region: string;
  instance_id: string;
  private_ip: string;
  created_at: string;
  updated_at: string;
  config: FlyMachineConfig;
}

export interface CreateAppResult {
  success: boolean;
  app?: FlyApp;
  error?: string;
}

export interface CreateVolumeResult {
  success: boolean;
  volume?: FlyVolume;
  error?: string;
}

export interface CreateMachineResult {
  success: boolean;
  machine?: FlyMachine;
  error?: string;
}

/**
 * Helper to make authenticated requests to Fly.io Machines API
 */
async function machinesApiRequest<T>(
  token: string,
  method: string,
  path: string,
  body?: unknown
): Promise<{ data?: T; error?: string; status: number }> {
  try {
    const response = await fetch(`${FLY_MACHINES_API}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const status = response.status;

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorText;
      } catch {
        errorMessage = errorText || `HTTP ${status}`;
      }
      logger.warn({ status, path, error: errorMessage }, 'Fly.io Machines API error');
      return { error: errorMessage, status };
    }

    // Handle empty responses (204 No Content)
    if (status === 204 || response.headers.get('content-length') === '0') {
      return { data: undefined, status };
    }

    const data = (await response.json()) as T;
    return { data, status };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error, path }, 'Fly.io Machines API request failed');
    return { error: message, status: 0 };
  }
}

/**
 * Create a new Fly.io app
 */
export async function createApp(
  token: string,
  appName: string,
  orgSlug: string
): Promise<CreateAppResult> {
  logger.info({ appName, orgSlug }, 'Creating Fly.io app');

  const { data, error } = await machinesApiRequest<FlyApp>(token, 'POST', '/v1/apps', {
    app_name: appName,
    org_slug: orgSlug,
  });

  if (error) {
    return { success: false, error };
  }

  logger.info({ appId: data?.id, appName }, 'Fly.io app created');
  return { success: true, app: data };
}

/**
 * Delete a Fly.io app
 */
export async function deleteApp(
  token: string,
  appName: string
): Promise<{ success: boolean; error?: string }> {
  logger.info({ appName }, 'Deleting Fly.io app');

  const { error } = await machinesApiRequest(token, 'DELETE', `/v1/apps/${appName}`);

  if (error) {
    return { success: false, error };
  }

  logger.info({ appName }, 'Fly.io app deleted');
  return { success: true };
}

/**
 * Create a volume for persistent storage
 */
export async function createVolume(
  token: string,
  appName: string,
  volumeName: string,
  region: string,
  sizeGb: number
): Promise<CreateVolumeResult> {
  logger.info({ appName, volumeName, region, sizeGb }, 'Creating Fly.io volume');

  const { data, error } = await machinesApiRequest<FlyVolume>(
    token,
    'POST',
    `/v1/apps/${appName}/volumes`,
    {
      name: volumeName,
      region,
      size_gb: sizeGb,
      encrypted: true,
    }
  );

  if (error) {
    return { success: false, error };
  }

  logger.info({ volumeId: data?.id, volumeName }, 'Fly.io volume created');
  return { success: true, volume: data };
}

/**
 * Delete a volume
 */
export async function deleteVolume(
  token: string,
  appName: string,
  volumeId: string
): Promise<{ success: boolean; error?: string }> {
  logger.info({ appName, volumeId }, 'Deleting Fly.io volume');

  const { error } = await machinesApiRequest(
    token,
    'DELETE',
    `/v1/apps/${appName}/volumes/${volumeId}`
  );

  if (error) {
    return { success: false, error };
  }

  logger.info({ volumeId }, 'Fly.io volume deleted');
  return { success: true };
}

/**
 * Create and start a machine
 */
export async function createMachine(
  token: string,
  appName: string,
  config: FlyMachineConfig,
  region: string,
  name?: string
): Promise<CreateMachineResult> {
  logger.info({ appName, region, image: config.image }, 'Creating Fly.io machine');

  const { data, error } = await machinesApiRequest<FlyMachine>(
    token,
    'POST',
    `/v1/apps/${appName}/machines`,
    {
      name,
      region,
      config,
    }
  );

  if (error) {
    return { success: false, error };
  }

  logger.info({ machineId: data?.id, state: data?.state }, 'Fly.io machine created');
  return { success: true, machine: data };
}

/**
 * Get machine details and current status
 */
export async function getMachine(
  token: string,
  appName: string,
  machineId: string
): Promise<{ machine?: FlyMachine; error?: string }> {
  const { data, error } = await machinesApiRequest<FlyMachine>(
    token,
    'GET',
    `/v1/apps/${appName}/machines/${machineId}`
  );

  if (error) {
    return { error };
  }

  return { machine: data };
}

/**
 * List all machines in an app
 */
export async function listMachines(
  token: string,
  appName: string
): Promise<{ machines?: FlyMachine[]; error?: string }> {
  const { data, error } = await machinesApiRequest<FlyMachine[]>(
    token,
    'GET',
    `/v1/apps/${appName}/machines`
  );

  if (error) {
    return { error };
  }

  return { machines: data || [] };
}

/**
 * Start a stopped machine
 */
export async function startMachine(
  token: string,
  appName: string,
  machineId: string
): Promise<{ success: boolean; error?: string }> {
  logger.info({ appName, machineId }, 'Starting Fly.io machine');

  const { error } = await machinesApiRequest(
    token,
    'POST',
    `/v1/apps/${appName}/machines/${machineId}/start`
  );

  if (error) {
    return { success: false, error };
  }

  logger.info({ machineId }, 'Fly.io machine started');
  return { success: true };
}

/**
 * Stop a running machine
 */
export async function stopMachine(
  token: string,
  appName: string,
  machineId: string
): Promise<{ success: boolean; error?: string }> {
  logger.info({ appName, machineId }, 'Stopping Fly.io machine');

  const { error } = await machinesApiRequest(
    token,
    'POST',
    `/v1/apps/${appName}/machines/${machineId}/stop`
  );

  if (error) {
    return { success: false, error };
  }

  logger.info({ machineId }, 'Fly.io machine stopped');
  return { success: true };
}

/**
 * Destroy a machine permanently
 */
export async function destroyMachine(
  token: string,
  appName: string,
  machineId: string
): Promise<{ success: boolean; error?: string }> {
  logger.info({ appName, machineId }, 'Destroying Fly.io machine');

  const { error } = await machinesApiRequest(
    token,
    'DELETE',
    `/v1/apps/${appName}/machines/${machineId}?force=true`
  );

  if (error) {
    return { success: false, error };
  }

  logger.info({ machineId }, 'Fly.io machine destroyed');
  return { success: true };
}

/**
 * Wait for a machine to reach a specific state
 */
export async function waitForMachineState(
  token: string,
  appName: string,
  machineId: string,
  targetState: FlyMachine['state'],
  timeoutMs: number = 60000
): Promise<{ success: boolean; machine?: FlyMachine; error?: string }> {
  const startTime = Date.now();
  const pollInterval = 2000;

  while (Date.now() - startTime < timeoutMs) {
    const { machine, error } = await getMachine(token, appName, machineId);

    if (error) {
      return { success: false, error };
    }

    if (machine?.state === targetState) {
      return { success: true, machine };
    }

    // Check for terminal failure states
    if (machine?.state === 'destroyed') {
      return { success: false, error: 'Machine was destroyed' };
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  return { success: false, error: `Timeout waiting for machine to reach state: ${targetState}` };
}
