export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'chat' | 'clarification' | 'decision' | 'progress';
  options?: string[];
}

export interface SubAgent {
  id: string;
  name: string;
  type: string; // Agent type from SDK (code-agent, test-agent, general-purpose, Explore, etc.)
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  output: string[];
  cost: number;
  startedAt?: Date;
  completedAt?: Date;
}

export interface Orchestration {
  id: string;
  name: string;
  project: string;
  status: 'planning' | 'clarifying' | 'executing' | 'iterating' | 'paused' | 'completed' | 'failed';
  currentIteration: number;
  maxIterations: number;
  totalCost: number;
  progress: number;
  agents: SubAgent[];
}

export interface Iteration {
  id: string;
  orchestrationId: string;
  iterationNumber: number;
  trigger: 'test_failure' | 'review_issue' | 'user_feedback';
  summary: string;
  status: 'in_progress' | 'resolved' | 'escalated';
  createdAt: Date;
  completedAt?: Date;
}
