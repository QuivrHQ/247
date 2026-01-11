import { describe, it, expect } from 'vitest';
import { generatePlanningPrompt } from '../../src/lib/planning-prompt.js';

describe('planning-prompt', () => {
  describe('generatePlanningPrompt', () => {
    it('generates a prompt with project name', () => {
      const prompt = generatePlanningPrompt(
        'project-123',
        'My Project',
        null,
        'http://localhost:4678'
      );

      expect(prompt).toContain('You are a project planning assistant');
      expect(prompt).toContain('helping to plan: "My Project"');
    });

    it('includes description when provided', () => {
      const prompt = generatePlanningPrompt(
        'project-123',
        'My Project',
        'This is a detailed project description',
        'http://localhost:4678'
      );

      expect(prompt).toContain('## Description');
      expect(prompt).toContain('This is a detailed project description');
    });

    it('excludes description section when null', () => {
      const prompt = generatePlanningPrompt(
        'project-123',
        'My Project',
        null,
        'http://localhost:4678'
      );

      expect(prompt).not.toContain('## Description');
    });

    it('excludes description section when empty string', () => {
      const prompt = generatePlanningPrompt(
        'project-123',
        'My Project',
        '',
        'http://localhost:4678'
      );

      // Empty string is falsy, so no description section
      expect(prompt).not.toContain('## Description');
    });

    it('includes correct API endpoint for creating issues', () => {
      const prompt = generatePlanningPrompt(
        'abc-123',
        'Test',
        null,
        'http://localhost:4678'
      );

      expect(prompt).toContain('curl -X POST http://localhost:4678/api/managed-projects/abc-123/issues/batch');
    });

    it('includes correct API endpoint for updating status', () => {
      const prompt = generatePlanningPrompt(
        'xyz-789',
        'Test',
        null,
        'http://localhost:9999'
      );

      expect(prompt).toContain('curl -X PATCH http://localhost:9999/api/managed-projects/xyz-789/status');
    });

    it('includes instructions for investigating codebase', () => {
      const prompt = generatePlanningPrompt(
        'project-123',
        'My Project',
        null,
        'http://localhost:4678'
      );

      expect(prompt).toContain('Investigate the codebase');
      expect(prompt).toContain('Ask clarifying questions');
      expect(prompt).toContain('Create a plan');
    });

    it('includes priority level documentation', () => {
      const prompt = generatePlanningPrompt(
        'project-123',
        'My Project',
        null,
        'http://localhost:4678'
      );

      expect(prompt).toContain('Priority levels: 0=none, 1=low, 2=medium, 3=high, 4=urgent');
    });

    it('includes issue schema example', () => {
      const prompt = generatePlanningPrompt(
        'project-123',
        'My Project',
        null,
        'http://localhost:4678'
      );

      expect(prompt).toContain('"title": "Issue title"');
      expect(prompt).toContain('"description": "Detailed description"');
      expect(prompt).toContain('"priority": 2');
      expect(prompt).toContain('"plan":');
    });

    it('includes status update to active', () => {
      const prompt = generatePlanningPrompt(
        'project-123',
        'My Project',
        null,
        'http://localhost:4678'
      );

      expect(prompt).toContain('{"status": "active"}');
    });

    it('handles special characters in project name', () => {
      const prompt = generatePlanningPrompt(
        'project-123',
        'My "Special" Project',
        null,
        'http://localhost:4678'
      );

      expect(prompt).toContain('helping to plan: "My "Special" Project"');
    });

    it('handles special characters in description', () => {
      const prompt = generatePlanningPrompt(
        'project-123',
        'Test',
        'Description with "quotes" and $variables',
        'http://localhost:4678'
      );

      expect(prompt).toContain('Description with "quotes" and $variables');
    });

    it('uses provided agent URL in all endpoints', () => {
      const customUrl = 'https://custom.agent.com:8080';
      const prompt = generatePlanningPrompt(
        'proj-1',
        'Test',
        null,
        customUrl
      );

      // Check both endpoints use the custom URL
      expect(prompt).toContain(`${customUrl}/api/managed-projects/proj-1/issues/batch`);
      expect(prompt).toContain(`${customUrl}/api/managed-projects/proj-1/status`);
    });

    it('includes bash code blocks for curl commands', () => {
      const prompt = generatePlanningPrompt(
        'project-123',
        'My Project',
        null,
        'http://localhost:4678'
      );

      expect(prompt).toContain('```bash');
      // Should have two code blocks (one for issues, one for status)
      const bashBlocks = prompt.match(/```bash/g);
      expect(bashBlocks?.length).toBe(2);
    });

    it('ends with instruction to start exploring', () => {
      const prompt = generatePlanningPrompt(
        'project-123',
        'My Project',
        null,
        'http://localhost:4678'
      );

      expect(prompt).toContain('Start by exploring the codebase');
    });
  });
});
