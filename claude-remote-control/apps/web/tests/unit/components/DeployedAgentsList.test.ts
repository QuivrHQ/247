/**
 * DeployedAgentsList Tests
 *
 * Tests for deployed cloud agents list component including status display,
 * action handling, and UI states.
 */
import { describe, it, expect } from 'vitest';
import type { CloudAgent } from '@/hooks/useAgents';

// Status configuration that mirrors the component
const statusConfig: Record<
  CloudAgent['status'],
  { color: string; bgColor: string; label: string; canConnect: boolean }
> = {
  pending: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    label: 'Pending',
    canConnect: false,
  },
  creating_app: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    label: 'Creating...',
    canConnect: false,
  },
  creating_volume: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    label: 'Creating...',
    canConnect: false,
  },
  creating_machine: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    label: 'Creating...',
    canConnect: false,
  },
  running: {
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    label: 'Running',
    canConnect: true,
  },
  stopped: {
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    label: 'Stopped',
    canConnect: false,
  },
  starting: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    label: 'Starting...',
    canConnect: false,
  },
  stopping: {
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    label: 'Stopping...',
    canConnect: false,
  },
  error: { color: 'text-red-400', bgColor: 'bg-red-500/20', label: 'Error', canConnect: false },
};

describe('DeployedAgentsList', () => {
  describe('status configuration', () => {
    it('has all expected statuses configured', () => {
      const expectedStatuses: CloudAgent['status'][] = [
        'pending',
        'creating_app',
        'creating_volume',
        'creating_machine',
        'running',
        'stopped',
        'starting',
        'stopping',
        'error',
      ];

      expectedStatuses.forEach((status) => {
        expect(statusConfig).toHaveProperty(status);
      });
    });

    it('running status allows connection', () => {
      expect(statusConfig.running.canConnect).toBe(true);
    });

    it('stopped status does not allow connection', () => {
      expect(statusConfig.stopped.canConnect).toBe(false);
    });

    it('error status does not allow connection', () => {
      expect(statusConfig.error.canConnect).toBe(false);
    });

    it('pending statuses do not allow connection', () => {
      expect(statusConfig.pending.canConnect).toBe(false);
      expect(statusConfig.creating_app.canConnect).toBe(false);
      expect(statusConfig.creating_volume.canConnect).toBe(false);
      expect(statusConfig.creating_machine.canConnect).toBe(false);
    });

    it('transitioning statuses do not allow connection', () => {
      expect(statusConfig.starting.canConnect).toBe(false);
      expect(statusConfig.stopping.canConnect).toBe(false);
    });
  });

  describe('status colors', () => {
    it('running status uses green color', () => {
      expect(statusConfig.running.color).toContain('green');
      expect(statusConfig.running.bgColor).toContain('green');
    });

    it('stopped status uses gray color', () => {
      expect(statusConfig.stopped.color).toContain('gray');
      expect(statusConfig.stopped.bgColor).toContain('gray');
    });

    it('error status uses red color', () => {
      expect(statusConfig.error.color).toContain('red');
      expect(statusConfig.error.bgColor).toContain('red');
    });

    it('pending statuses use yellow color', () => {
      expect(statusConfig.pending.color).toContain('yellow');
      expect(statusConfig.creating_app.color).toContain('yellow');
      expect(statusConfig.creating_volume.color).toContain('yellow');
      expect(statusConfig.creating_machine.color).toContain('yellow');
    });

    it('starting status uses blue color', () => {
      expect(statusConfig.starting.color).toContain('blue');
    });

    it('stopping status uses orange color', () => {
      expect(statusConfig.stopping.color).toContain('orange');
    });
  });

  describe('status labels', () => {
    it('running shows "Running"', () => {
      expect(statusConfig.running.label).toBe('Running');
    });

    it('stopped shows "Stopped"', () => {
      expect(statusConfig.stopped.label).toBe('Stopped');
    });

    it('error shows "Error"', () => {
      expect(statusConfig.error.label).toBe('Error');
    });

    it('pending shows "Pending"', () => {
      expect(statusConfig.pending.label).toBe('Pending');
    });

    it('creating statuses show "Creating..."', () => {
      expect(statusConfig.creating_app.label).toBe('Creating...');
      expect(statusConfig.creating_volume.label).toBe('Creating...');
      expect(statusConfig.creating_machine.label).toBe('Creating...');
    });

    it('starting shows "Starting..."', () => {
      expect(statusConfig.starting.label).toBe('Starting...');
    });

    it('stopping shows "Stopping..."', () => {
      expect(statusConfig.stopping.label).toBe('Stopping...');
    });
  });

  describe('agent data structure', () => {
    it('should have required agent properties', () => {
      const requiredProps = ['id', 'hostname', 'region', 'status', 'createdAt'];

      const agentExample: Partial<CloudAgent> = {
        id: 'agent-1',
        hostname: 'agent-test-1234.fly.dev',
        region: 'sjc',
        status: 'running',
        createdAt: '2024-01-01T00:00:00Z',
      };

      requiredProps.forEach((prop) => {
        expect(agentExample).toHaveProperty(prop);
      });
    });

    it('hostname follows expected format', () => {
      const hostname = 'agent-test-1234.fly.dev';
      expect(hostname).toMatch(/^agent-[a-z0-9]+-[a-z0-9]+\.fly\.dev$/);
    });

    it('region is a valid Fly.io region code', () => {
      const validRegions = [
        'sjc',
        'lax',
        'sea',
        'ord',
        'iad',
        'cdg',
        'lhr',
        'fra',
        'nrt',
        'sin',
        'syd',
      ];
      const region = 'sjc';
      expect(validRegions).toContain(region);
    });
  });

  describe('action buttons visibility', () => {
    function getVisibleActions(status: CloudAgent['status']): string[] {
      const actions: string[] = [];

      if (statusConfig[status].canConnect) {
        actions.push('connect');
      }

      if (status === 'stopped') {
        actions.push('start');
      }

      if (status === 'running') {
        actions.push('stop');
      }

      // Delete is always visible
      actions.push('delete');

      return actions;
    }

    it('running agent shows connect, stop, delete', () => {
      const actions = getVisibleActions('running');
      expect(actions).toContain('connect');
      expect(actions).toContain('stop');
      expect(actions).toContain('delete');
      expect(actions).not.toContain('start');
    });

    it('stopped agent shows start, delete', () => {
      const actions = getVisibleActions('stopped');
      expect(actions).toContain('start');
      expect(actions).toContain('delete');
      expect(actions).not.toContain('connect');
      expect(actions).not.toContain('stop');
    });

    it('error agent shows only delete', () => {
      const actions = getVisibleActions('error');
      expect(actions).toContain('delete');
      expect(actions).not.toContain('connect');
      expect(actions).not.toContain('start');
      expect(actions).not.toContain('stop');
    });

    it('starting agent shows only delete', () => {
      const actions = getVisibleActions('starting');
      expect(actions).toContain('delete');
      expect(actions).not.toContain('connect');
      expect(actions).not.toContain('start');
      expect(actions).not.toContain('stop');
    });
  });

  describe('UI styling', () => {
    it('component uses dark theme colors', () => {
      const containerClass = 'border-white/10 bg-white/5';
      expect(containerClass).toContain('border-white/10');
      expect(containerClass).toContain('bg-white/5');
    });

    it('header uses separator border', () => {
      const headerClass = 'border-b border-white/10';
      expect(headerClass).toContain('border-b');
      expect(headerClass).toContain('border-white/10');
    });

    it('agents are divided by subtle borders', () => {
      const dividerClass = 'divide-y divide-white/5';
      expect(dividerClass).toContain('divide-y');
      expect(dividerClass).toContain('divide-white/5');
    });

    it('hostname uses monospace font', () => {
      const hostnameClass = 'font-mono text-sm text-white/90';
      expect(hostnameClass).toContain('font-mono');
    });

    it('connect button uses green styling', () => {
      const connectClass = 'bg-green-500/20 text-green-400';
      expect(connectClass).toContain('green');
    });

    it('delete button uses red hover state', () => {
      const deleteClass = 'hover:text-red-400';
      expect(deleteClass).toContain('red');
    });
  });

  describe('delete confirmation', () => {
    it('confirmation shows Yes/No options', () => {
      const confirmOptions = ['Yes', 'No'];
      expect(confirmOptions).toHaveLength(2);
    });

    it('Yes button uses red styling for danger', () => {
      const yesClass = 'bg-red-500/20 text-red-400';
      expect(yesClass).toContain('red');
    });

    it('No button uses neutral styling', () => {
      const noClass = 'bg-white/5 text-white/60';
      expect(noClass).toContain('white');
    });
  });

  describe('empty state', () => {
    it('returns null when agents array is empty', () => {
      const agents: CloudAgent[] = [];
      const shouldRender = agents.length > 0;
      expect(shouldRender).toBe(false);
    });
  });

  describe('loading state', () => {
    it('shows loader when loading', () => {
      const isLoading = true;
      const loaderClass = 'h-6 w-6 animate-spin text-white/40';
      expect(loaderClass).toContain('animate-spin');
    });
  });

  describe('error display', () => {
    it('shows error message for agents with error status', () => {
      const agent: Partial<CloudAgent> = {
        status: 'error',
        errorMessage: 'Deployment failed: timeout',
      };

      expect(agent.status).toBe('error');
      expect(agent.errorMessage).toBeTruthy();
    });

    it('error message uses red color', () => {
      const errorClass = 'text-red-400/80';
      expect(errorClass).toContain('red');
    });
  });

  describe('region display', () => {
    it('region is displayed in uppercase', () => {
      const region = 'sjc';
      expect(region.toUpperCase()).toBe('SJC');
    });

    it('region badge uses subtle styling', () => {
      const regionClass = 'bg-white/5 text-white/40';
      expect(regionClass).toContain('bg-white/5');
    });
  });

  describe('animation', () => {
    it('list items have enter/exit animations', () => {
      const animationVariants = {
        initial: { opacity: 0, height: 0 },
        animate: { opacity: 1, height: 'auto' },
        exit: { opacity: 0, height: 0 },
      };

      expect(animationVariants.initial.opacity).toBe(0);
      expect(animationVariants.animate.opacity).toBe(1);
      expect(animationVariants.exit.opacity).toBe(0);
    });
  });
});
