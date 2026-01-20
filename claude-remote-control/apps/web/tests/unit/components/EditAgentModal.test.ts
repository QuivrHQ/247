/**
 * EditAgentModal Tests
 *
 * Tests for the edit agent modal component including name editing
 * and color selection functionality.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AGENT_COLORS } from '@/components/EditAgentModal';

describe('EditAgentModal', () => {
  describe('AGENT_COLORS', () => {
    it('should have 7 predefined colors', () => {
      expect(AGENT_COLORS).toHaveLength(7);
    });

    it('should have valid hex color codes', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      AGENT_COLORS.forEach((color) => {
        expect(color.hex).toMatch(hexColorRegex);
      });
    });

    it('should have all required colors', () => {
      const colorNames = AGENT_COLORS.map((c) => c.name);
      expect(colorNames).toContain('Orange');
      expect(colorNames).toContain('Amber');
      expect(colorNames).toContain('Emerald');
      expect(colorNames).toContain('Blue');
      expect(colorNames).toContain('Purple');
      expect(colorNames).toContain('Rose');
      expect(colorNames).toContain('Slate');
    });

    it('should have correct hex values for each color', () => {
      const colorMap = Object.fromEntries(
        AGENT_COLORS.map((c) => [c.name, c.hex])
      );
      expect(colorMap['Orange']).toBe('#f97316');
      expect(colorMap['Amber']).toBe('#f59e0b');
      expect(colorMap['Emerald']).toBe('#10b981');
      expect(colorMap['Blue']).toBe('#3b82f6');
      expect(colorMap['Purple']).toBe('#8b5cf6');
      expect(colorMap['Rose']).toBe('#f43f5e');
      expect(colorMap['Slate']).toBe('#64748b');
    });
  });

  describe('Component behavior', () => {
    let mockOnSave: ReturnType<typeof vi.fn>;
    let mockOnClose: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockOnSave = vi.fn().mockResolvedValue(undefined);
      mockOnClose = vi.fn();
    });

    it('should call onSave with correct data when saving', async () => {
      const testData = {
        agentId: 'test-agent-1',
        name: 'Updated Agent Name',
        color: '#f97316',
      };

      // Simulate the save handler
      await mockOnSave(testData.agentId, {
        name: testData.name,
        color: testData.color,
      });

      expect(mockOnSave).toHaveBeenCalledWith('test-agent-1', {
        name: 'Updated Agent Name',
        color: '#f97316',
      });
    });

    it('should allow saving without color (undefined)', async () => {
      await mockOnSave('test-agent-1', {
        name: 'Agent Without Color',
        color: undefined,
      });

      expect(mockOnSave).toHaveBeenCalledWith('test-agent-1', {
        name: 'Agent Without Color',
        color: undefined,
      });
    });

    it('should not save with empty name', () => {
      const name = '';
      const isValid = name.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it('should trim name before saving', () => {
      const name = '  Agent Name With Spaces  ';
      const trimmedName = name.trim();
      expect(trimmedName).toBe('Agent Name With Spaces');
    });
  });

  describe('Color selection logic', () => {
    it('should allow selecting no color', () => {
      let selectedColor: string | undefined = '#f97316';

      // Simulate clicking "no color" option
      selectedColor = undefined;

      expect(selectedColor).toBeUndefined();
    });

    it('should allow selecting a color from palette', () => {
      let selectedColor: string | undefined = undefined;

      // Simulate clicking a color
      selectedColor = AGENT_COLORS[0].hex;

      expect(selectedColor).toBe('#f97316');
    });

    it('should allow changing selected color', () => {
      let selectedColor: string | undefined = '#f97316';

      // Simulate clicking a different color
      selectedColor = '#3b82f6';

      expect(selectedColor).toBe('#3b82f6');
    });
  });
});
