/**
 * Planner Service
 *
 * Manages project planning sessions using Claude Code.
 * The planner helps users break down projects into actionable issues
 * by asking clarifying questions and generating detailed plans.
 */

import { EventEmitter } from 'events';
import { createTerminal, type Terminal } from '../terminal.js';
import { config } from '../config.js';
import * as projectsDb from '../db/projects.js';
import * as issuesDb from '../db/issues.js';
import type {
  PlanningPhase,
  PlanningQuestion,
  IssueSpec,
  IssuePriority,
} from '247-shared';

// ============================================================================
// Types
// ============================================================================

export interface PlanningSession {
  id: string;
  projectId: string;
  phase: PlanningPhase;
  startedAt: number;
  questions: PlanningQuestion[];
  answers: Map<string, string>;
  generatedPlan?: GeneratedPlan;
  terminal?: Terminal;
  outputBuffer: string;
  isWaitingForResponse: boolean;
}

export interface GeneratedPlan {
  summary: string;
  issues: IssueSpec[];
  risks: string[];
  estimatedComplexity: 'low' | 'medium' | 'high';
}

export interface PlannerEvents {
  'phase-change': (sessionId: string, phase: PlanningPhase) => void;
  'question': (sessionId: string, question: PlanningQuestion) => void;
  'progress': (sessionId: string, message: string) => void;
  'plan-ready': (sessionId: string, plan: GeneratedPlan) => void;
  'issues-created': (sessionId: string, issueIds: string[]) => void;
  'error': (sessionId: string, error: string) => void;
  'output': (sessionId: string, output: string) => void;
}

// ============================================================================
// Planner Service
// ============================================================================

export class PlannerService extends EventEmitter {
  private sessions: Map<string, PlanningSession> = new Map();

  constructor() {
    super();
  }

  /**
   * Start a new planning session for a project
   */
  async startPlanning(projectId: string, trustMode: boolean = false): Promise<string> {
    const project = projectsDb.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const sessionId = `planning-${projectId}-${Date.now()}`;

    // Get the base project path
    const baseProject = project.baseProject;
    if (!baseProject) {
      throw new Error('Project has no base project configured');
    }

    const whitelist = config.projects.whitelist as string[];
    if (!whitelist.includes(baseProject)) {
      throw new Error(`Base project not in whitelist: ${baseProject}`);
    }

    const projectPath = `${config.projects.basePath}/${baseProject}`.replace(
      '~',
      process.env.HOME!
    );

    const session: PlanningSession = {
      id: sessionId,
      projectId,
      phase: 'gathering',
      startedAt: Date.now(),
      questions: [],
      answers: new Map(),
      outputBuffer: '',
      isWaitingForResponse: false,
    };

    this.sessions.set(sessionId, session);

    // Update project status
    projectsDb.updateProjectStatus(projectId, 'planning');

    // Create the planning prompt based on mode
    const planningPrompt = this.generatePlanningPrompt(project.name, project.description, trustMode);

    // Create a hidden terminal for Claude Code
    const terminal = createTerminal(projectPath, `planning-${projectId}`, {
      customEnvVars: {
        CLAUDE_PLANNING_SESSION: sessionId,
        CLAUDE_PLANNING_MODE: trustMode ? 'trust' : 'interactive',
      },
    });

    session.terminal = terminal;

    // Listen for terminal output
    terminal.onData((data) => {
      session.outputBuffer += data;
      this.emit('output', sessionId, data);

      // Parse output for questions, progress, and plan completion
      this.parseTerminalOutput(sessionId);
    });

    terminal.onExit(() => {
      console.log(`[Planner] Terminal exited for session ${sessionId}`);
      if (session.phase !== 'complete') {
        this.emit('error', sessionId, 'Planning session terminated unexpectedly');
      }
    });

    // Wait for terminal to be ready, then start Claude
    terminal.onReady(() => {
      console.log(`[Planner] Terminal ready, starting Claude for session ${sessionId}`);

      // Start Claude Code with the planning prompt
      terminal.write(`claude "${planningPrompt.replace(/"/g, '\\"')}"\n`);
    });

    this.emit('phase-change', sessionId, 'gathering');
    this.emit('progress', sessionId, 'Starting planning session...');

    return sessionId;
  }

  /**
   * Answer a planning question
   */
  answerQuestion(sessionId: string, questionId: string, answer: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Planning session not found: ${sessionId}`);
    }

    if (!session.terminal) {
      throw new Error('Planning session has no active terminal');
    }

    session.answers.set(questionId, answer);
    session.isWaitingForResponse = false;

    // Send the answer to Claude
    session.terminal.write(`${answer}\n`);

    this.emit('progress', sessionId, 'Processing your answer...');
  }

  /**
   * Approve the generated plan and create issues
   */
  async approvePlan(sessionId: string): Promise<string[]> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Planning session not found: ${sessionId}`);
    }

    if (!session.generatedPlan) {
      throw new Error('No plan to approve');
    }

    // Update phase
    session.phase = 'complete';
    this.emit('phase-change', sessionId, 'complete');

    // Create issues from the plan
    const issueInputs = session.generatedPlan.issues.map((spec) => ({
      title: spec.title,
      description: spec.description,
      priority: spec.priority as IssuePriority,
      plan: spec.plan,
    }));

    const createdIssues = issuesDb.createIssues(session.projectId, issueInputs);
    const issueIds = createdIssues.map((issue) => issue.id);

    // Update project plan
    projectsDb.updateProjectPlan(session.projectId, session.generatedPlan.summary);
    projectsDb.updateProjectStatus(session.projectId, 'active');

    // Clean up terminal
    if (session.terminal) {
      session.terminal.write('\x03'); // Ctrl+C to exit Claude
      setTimeout(() => {
        session.terminal?.kill();
      }, 500);
    }

    this.emit('issues-created', sessionId, issueIds);
    this.emit('progress', sessionId, `Created ${issueIds.length} issues`);

    return issueIds;
  }

  /**
   * Cancel a planning session
   */
  cancelPlanning(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    if (session.terminal) {
      session.terminal.write('\x03'); // Ctrl+C
      session.terminal.kill();
    }

    this.sessions.delete(sessionId);
    this.emit('progress', sessionId, 'Planning cancelled');
  }

  /**
   * Get planning session info by session ID
   */
  getSession(sessionId: string): PlanningSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get planning session by project ID
   */
  getSessionByProjectId(projectId: string): PlanningSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.projectId === projectId) {
        return session;
      }
    }
    return undefined;
  }

  /**
   * Send input to the planning terminal
   */
  sendInput(sessionId: string, input: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.terminal) {
      throw new Error('Planning session not found or no terminal');
    }

    session.terminal.write(input);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Generate the initial planning prompt for Claude
   */
  private generatePlanningPrompt(
    projectName: string,
    description: string | null,
    trustMode: boolean
  ): string {
    if (trustMode) {
      return `You are a project planning assistant. Create a detailed implementation plan for the following project:

Project: ${projectName}
${description ? `Description: ${description}` : ''}

Generate a comprehensive plan with:
1. A summary of the approach
2. A list of 3-8 concrete issues/tasks to implement this
3. For each issue, provide:
   - A clear title
   - A detailed description
   - Priority (0=none, 1=low, 2=medium, 3=high, 4=urgent)
   - An execution plan with specific steps

Output your plan in the following format at the end:
===PLAN_START===
{
  "summary": "...",
  "issues": [
    {
      "title": "...",
      "description": "...",
      "priority": 2,
      "plan": "Step 1: ...\\nStep 2: ..."
    }
  ],
  "risks": ["..."],
  "estimatedComplexity": "medium"
}
===PLAN_END===`;
    }

    return `You are a project planning assistant. I need help planning the following project:

Project: ${projectName}
${description ? `Description: ${description}` : ''}

Please ask me clarifying questions one at a time to understand:
- The scope and requirements
- Technical constraints or preferences
- Priority and timeline

Format each question like this:
===QUESTION===
{
  "id": "q1",
  "question": "Your question here?",
  "type": "text",
  "context": "Why you're asking this"
}
===END_QUESTION===

After gathering enough information (3-5 questions), generate a plan with format:
===PLAN_START===
{
  "summary": "...",
  "issues": [...],
  "risks": ["..."],
  "estimatedComplexity": "low|medium|high"
}
===PLAN_END===`;
  }

  /**
   * Parse terminal output for structured data (questions, plan)
   */
  private parseTerminalOutput(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const output = session.outputBuffer;

    // Look for questions
    const questionMatch = output.match(/===QUESTION===\s*([\s\S]*?)\s*===END_QUESTION===/);
    if (questionMatch && !session.isWaitingForResponse) {
      try {
        const questionJson = questionMatch[1].trim();
        const question = JSON.parse(questionJson) as PlanningQuestion;

        session.questions.push(question);
        session.isWaitingForResponse = true;
        session.phase = 'gathering';

        // Clear the matched portion from buffer
        session.outputBuffer = output.replace(questionMatch[0], '');

        this.emit('question', sessionId, question);
        this.emit('phase-change', sessionId, 'gathering');
      } catch (e) {
        console.error('[Planner] Failed to parse question:', e);
      }
    }

    // Look for plan
    const planMatch = output.match(/===PLAN_START===\s*([\s\S]*?)\s*===PLAN_END===/);
    if (planMatch) {
      try {
        const planJson = planMatch[1].trim();
        const plan = JSON.parse(planJson) as GeneratedPlan;

        session.generatedPlan = plan;
        session.phase = 'review';

        // Clear the matched portion from buffer
        session.outputBuffer = output.replace(planMatch[0], '');

        this.emit('plan-ready', sessionId, plan);
        this.emit('phase-change', sessionId, 'review');
      } catch (e) {
        console.error('[Planner] Failed to parse plan:', e);
      }
    }
  }
}

// Singleton instance
export const plannerService = new PlannerService();
