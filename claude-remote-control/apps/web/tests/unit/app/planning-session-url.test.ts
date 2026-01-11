import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test the planning session URL handling logic

describe('Planning Session URL Handling', () => {
  const DEFAULT_MACHINE_ID = 'local-agent';

  interface SelectedSession {
    machineId: string;
    sessionName: string;
    project: string;
    environmentId?: string;
    planningProjectId?: string;
  }

  describe('URL Parameter Parsing for Planning Sessions', () => {
    const parseplanningSessionFromUrl = (searchParams: URLSearchParams): {
      sessionParam: string | null;
      machineParam: string;
      createParam: boolean;
      projectParam: string | null;
      planningProjectIdParam: string | null;
    } => {
      return {
        sessionParam: searchParams.get('session'),
        machineParam: searchParams.get('machine') || DEFAULT_MACHINE_ID,
        createParam: searchParams.get('create') === 'true',
        projectParam: searchParams.get('project'),
        planningProjectIdParam: searchParams.get('planningProjectId'),
      };
    };

    it('parses all planning session parameters', () => {
      const params = new URLSearchParams(
        'project=BrainStorming&session=planning-my-project&create=true&planningProjectId=abc-123'
      );
      const parsed = parseplanningSessionFromUrl(params);

      expect(parsed.sessionParam).toBe('planning-my-project');
      expect(parsed.machineParam).toBe(DEFAULT_MACHINE_ID);
      expect(parsed.createParam).toBe(true);
      expect(parsed.projectParam).toBe('BrainStorming');
      expect(parsed.planningProjectIdParam).toBe('abc-123');
    });

    it('returns null for missing planningProjectId', () => {
      const params = new URLSearchParams('project=Test&session=test-session&create=true');
      const parsed = parseplanningSessionFromUrl(params);

      expect(parsed.planningProjectIdParam).toBeNull();
    });

    it('parses create=false as boolean false', () => {
      const params = new URLSearchParams('session=test&create=false');
      const parsed = parseplanningSessionFromUrl(params);

      expect(parsed.createParam).toBe(false);
    });

    it('parses missing create param as boolean false', () => {
      const params = new URLSearchParams('session=test');
      const parsed = parseplanningSessionFromUrl(params);

      expect(parsed.createParam).toBe(false);
    });

    it('handles UUID-style planningProjectId', () => {
      const uuid = 'a7df39e3-2ad9-4a6b-b549-b32f0ded0bae';
      const params = new URLSearchParams(`planningProjectId=${uuid}`);
      const parsed = parseplanningSessionFromUrl(params);

      expect(parsed.planningProjectIdParam).toBe(uuid);
    });
  });

  describe('Creating Selected Session from URL', () => {
    const createSelectedSessionFromUrl = (
      searchParams: URLSearchParams
    ): SelectedSession | null => {
      const sessionParam = searchParams.get('session');
      const machineParam = searchParams.get('machine') || DEFAULT_MACHINE_ID;
      const createParam = searchParams.get('create') === 'true';
      const projectParam = searchParams.get('project');
      const planningProjectIdParam = searchParams.get('planningProjectId');

      // Handle session creation from URL (e.g., from planning modal)
      if (createParam && sessionParam && projectParam) {
        return {
          machineId: machineParam,
          sessionName: sessionParam,
          project: projectParam,
          planningProjectId: planningProjectIdParam || undefined,
        };
      }

      return null;
    };

    it('creates selected session when all params present', () => {
      const params = new URLSearchParams(
        'project=MyProject&session=planning-test&create=true&planningProjectId=proj-123'
      );
      const session = createSelectedSessionFromUrl(params);

      expect(session).not.toBeNull();
      expect(session?.machineId).toBe(DEFAULT_MACHINE_ID);
      expect(session?.sessionName).toBe('planning-test');
      expect(session?.project).toBe('MyProject');
      expect(session?.planningProjectId).toBe('proj-123');
    });

    it('returns null when create is false', () => {
      const params = new URLSearchParams(
        'project=MyProject&session=planning-test&create=false&planningProjectId=proj-123'
      );
      const session = createSelectedSessionFromUrl(params);

      expect(session).toBeNull();
    });

    it('returns null when session is missing', () => {
      const params = new URLSearchParams('project=MyProject&create=true&planningProjectId=proj-123');
      const session = createSelectedSessionFromUrl(params);

      expect(session).toBeNull();
    });

    it('returns null when project is missing', () => {
      const params = new URLSearchParams('session=planning-test&create=true&planningProjectId=proj-123');
      const session = createSelectedSessionFromUrl(params);

      expect(session).toBeNull();
    });

    it('creates session without planningProjectId when not provided', () => {
      const params = new URLSearchParams('project=MyProject&session=my-session&create=true');
      const session = createSelectedSessionFromUrl(params);

      expect(session).not.toBeNull();
      expect(session?.planningProjectId).toBeUndefined();
    });

    it('uses custom machineId when provided', () => {
      const params = new URLSearchParams(
        'project=MyProject&session=test&create=true&machine=custom-machine'
      );
      const session = createSelectedSessionFromUrl(params);

      expect(session?.machineId).toBe('custom-machine');
    });
  });

  describe('Building Planning Session URL', () => {
    const buildPlanningSessionUrl = (
      baseProject: string,
      sessionName: string,
      planningProjectId: string
    ): string => {
      const params = new URLSearchParams({
        project: baseProject,
        session: sessionName,
        create: 'true',
        planningProjectId: planningProjectId,
      });
      return `/?${params.toString()}`;
    };

    it('builds URL with all planning params', () => {
      const url = buildPlanningSessionUrl('BrainStorming', 'planning-add-auth', 'proj-abc');

      expect(url).toContain('project=BrainStorming');
      expect(url).toContain('session=planning-add-auth');
      expect(url).toContain('create=true');
      expect(url).toContain('planningProjectId=proj-abc');
    });

    it('URL-encodes special characters', () => {
      const url = buildPlanningSessionUrl('My Project', 'planning-test', 'id-123');

      expect(url).toContain('project=My+Project');
    });

    it('handles UUID planningProjectId correctly', () => {
      const uuid = 'a7df39e3-2ad9-4a6b-b549-b32f0ded0bae';
      const url = buildPlanningSessionUrl('Test', 'planning-test', uuid);

      expect(url).toContain(`planningProjectId=${uuid}`);
    });
  });

  describe('Planning Session Name Generation', () => {
    const generatePlanningSessionName = (projectName: string): string => {
      return `planning-${projectName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')}`;
    };

    it('generates session name from project name', () => {
      expect(generatePlanningSessionName('My Project')).toBe('planning-my-project');
    });

    it('converts to lowercase', () => {
      expect(generatePlanningSessionName('MyProject')).toBe('planning-myproject');
    });

    it('replaces spaces with hyphens', () => {
      expect(generatePlanningSessionName('My Awesome Project')).toBe(
        'planning-my-awesome-project'
      );
    });

    it('removes special characters', () => {
      expect(generatePlanningSessionName('Project @#$% Special!')).toBe(
        'planning-project--special'
      );
    });

    it('handles numbers', () => {
      expect(generatePlanningSessionName('Project V2')).toBe('planning-project-v2');
    });

    it('handles multiple spaces by collapsing them', () => {
      // Multiple spaces get replaced by single hyphens due to \s+ regex
      expect(generatePlanningSessionName('My   Project')).toBe('planning-my-project');
    });
  });

  describe('WebSocket URL Building with Planning Project ID', () => {
    const buildWebSocketUrl = (
      agentUrl: string,
      project: string,
      sessionName: string,
      options: {
        environmentId?: string;
        isNewSession?: boolean;
        useWorktree?: boolean;
        planningProjectId?: string;
      } = {}
    ): string => {
      const { environmentId, isNewSession, useWorktree, planningProjectId } = options;

      let wsUrl = `${agentUrl}/terminal?project=${encodeURIComponent(
        project
      )}&session=${encodeURIComponent(sessionName)}`;

      if (environmentId) wsUrl += `&environment=${encodeURIComponent(environmentId)}`;
      if (isNewSession) wsUrl += '&create=true';
      if (useWorktree) wsUrl += '&worktree=true';
      if (planningProjectId)
        wsUrl += `&planningProjectId=${encodeURIComponent(planningProjectId)}`;

      return wsUrl;
    };

    it('adds planningProjectId to WebSocket URL', () => {
      const url = buildWebSocketUrl('ws://localhost:4678', 'test-project', 'my-session', {
        planningProjectId: 'proj-123',
      });

      expect(url).toContain('planningProjectId=proj-123');
    });

    it('combines all options in WebSocket URL', () => {
      const url = buildWebSocketUrl('ws://localhost:4678', 'test-project', 'my-session', {
        environmentId: 'env-1',
        isNewSession: true,
        useWorktree: true,
        planningProjectId: 'proj-abc',
      });

      expect(url).toContain('environment=env-1');
      expect(url).toContain('create=true');
      expect(url).toContain('worktree=true');
      expect(url).toContain('planningProjectId=proj-abc');
    });

    it('excludes planningProjectId when not provided', () => {
      const url = buildWebSocketUrl('ws://localhost:4678', 'test-project', 'my-session', {
        isNewSession: true,
      });

      expect(url).not.toContain('planningProjectId');
    });

    it('URL-encodes planningProjectId', () => {
      const url = buildWebSocketUrl('ws://localhost:4678', 'test-project', 'my-session', {
        planningProjectId: 'proj+special/id',
      });

      expect(url).toContain('planningProjectId=proj%2Bspecial%2Fid');
    });
  });

  describe('Session Type Detection', () => {
    const isPlanningSession = (sessionName: string): boolean => {
      return sessionName.startsWith('planning-');
    };

    const isNewSession = (sessionName: string): boolean => {
      return sessionName.endsWith('--new');
    };

    it('detects planning session by prefix', () => {
      expect(isPlanningSession('planning-my-project')).toBe(true);
      expect(isPlanningSession('planning-test')).toBe(true);
    });

    it('returns false for non-planning sessions', () => {
      expect(isPlanningSession('my-project--session-1')).toBe(false);
      expect(isPlanningSession('regular-session')).toBe(false);
    });

    it('detects new session by suffix', () => {
      expect(isNewSession('project--new')).toBe(true);
      expect(isNewSession('my-app--new')).toBe(true);
    });

    it('returns false for existing sessions', () => {
      expect(isNewSession('project--brave-lion-42')).toBe(false);
      expect(isNewSession('project--session')).toBe(false);
    });

    it('handles edge case: planning new session', () => {
      // A planning session that is also new
      expect(isPlanningSession('planning-my-project')).toBe(true);
      expect(isNewSession('planning-my-project')).toBe(false);
    });
  });

  describe('URL Cleanup After Session Creation', () => {
    const cleanupCreationParams = (searchParams: URLSearchParams): URLSearchParams => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('create');
      // Keep planningProjectId as it may be needed for reconnects
      return params;
    };

    it('removes create param after session creation', () => {
      const params = new URLSearchParams(
        'project=Test&session=test&create=true&planningProjectId=abc'
      );
      const cleaned = cleanupCreationParams(params);

      expect(cleaned.get('create')).toBeNull();
      expect(cleaned.get('session')).toBe('test');
      expect(cleaned.get('planningProjectId')).toBe('abc');
    });

    it('preserves other params', () => {
      const params = new URLSearchParams(
        'project=Test&session=test&create=true&machine=my-machine'
      );
      const cleaned = cleanupCreationParams(params);

      expect(cleaned.get('machine')).toBe('my-machine');
      expect(cleaned.get('project')).toBe('Test');
    });
  });

  describe('Selected Session with Planning Project ID', () => {
    it('includes planningProjectId in SelectedSession type', () => {
      const session: SelectedSession = {
        machineId: 'local-agent',
        sessionName: 'planning-test',
        project: 'TestProject',
        planningProjectId: 'proj-123',
      };

      expect(session.planningProjectId).toBe('proj-123');
    });

    it('allows undefined planningProjectId', () => {
      const session: SelectedSession = {
        machineId: 'local-agent',
        sessionName: 'regular-session',
        project: 'TestProject',
      };

      expect(session.planningProjectId).toBeUndefined();
    });

    it('coexists with environmentId', () => {
      const session: SelectedSession = {
        machineId: 'local-agent',
        sessionName: 'planning-test',
        project: 'TestProject',
        environmentId: 'env-456',
        planningProjectId: 'proj-123',
      };

      expect(session.environmentId).toBe('env-456');
      expect(session.planningProjectId).toBe('proj-123');
    });
  });

  describe('Start Planning API Response Handling', () => {
    interface StartPlanningResponse {
      success: boolean;
      sessionName: string;
      baseProject: string;
      projectPath: string;
      prompt: string;
    }

    const buildRedirectUrl = (response: StartPlanningResponse, projectId: string): string => {
      const params = new URLSearchParams({
        project: response.baseProject,
        session: response.sessionName,
        create: 'true',
        planningProjectId: projectId,
      });
      return `/?${params.toString()}`;
    };

    it('builds redirect URL from API response', () => {
      const response: StartPlanningResponse = {
        success: true,
        sessionName: 'planning-my-app',
        baseProject: 'my-app',
        projectPath: '/home/user/projects/my-app',
        prompt: 'Planning prompt...',
      };

      const url = buildRedirectUrl(response, 'proj-xyz');

      expect(url).toContain('session=planning-my-app');
      expect(url).toContain('project=my-app');
      expect(url).toContain('create=true');
      expect(url).toContain('planningProjectId=proj-xyz');
    });

    it('uses baseProject for project param, not projectPath', () => {
      const response: StartPlanningResponse = {
        success: true,
        sessionName: 'planning-test',
        baseProject: 'simple-name',
        projectPath: '/some/complex/path/simple-name',
        prompt: 'Prompt...',
      };

      const url = buildRedirectUrl(response, 'proj-123');

      expect(url).toContain('project=simple-name');
      expect(url).not.toContain('complex%2Fpath');
    });
  });
});
