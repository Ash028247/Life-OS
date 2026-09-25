import { ContextEngine } from '../packages/core/src/engines/contextEngine';
import { ContextSnapshot, Period, DeviceType, Connectivity, EnergyLevel } from '../packages/types/src';

describe('Context Engine', () => {
  let engine: ContextEngine;

  beforeEach(() => {
    engine = new ContextEngine();
  });

  describe('Period Detection', () => {
    it('should detect morning (6-12)', () => {
      const morningDate = new Date();
      morningDate.setHours(9, 0, 0, 0);
      
      const snapshot = engine.createSnapshot({ now: morningDate });
      expect(snapshot.period).toBe('morning');
    });

    it('should detect afternoon (12-18)', () => {
      const afternoonDate = new Date();
      afternoonDate.setHours(14, 0, 0, 0);
      
      const snapshot = engine.createSnapshot({ now: afternoonDate });
      expect(snapshot.period).toBe('afternoon');
    });

    it('should detect evening (18-22)', () => {
      const eveningDate = new Date();
      eveningDate.setHours(20, 0, 0, 0);
      
      const snapshot = engine.createSnapshot({ now: eveningDate });
      expect(snapshot.period).toBe('evening');
    });

    it('should detect night (22-6)', () => {
      const nightDate = new Date();
      nightDate.setHours(23, 0, 0, 0);
      
      const snapshot = engine.createSnapshot({ now: nightDate });
      expect(snapshot.period).toBe('night');
    });

    it('should detect night at midnight', () => {
      const midnightDate = new Date();
      midnightDate.setHours(0, 0, 0, 0);
      
      const snapshot = engine.createSnapshot({ now: midnightDate });
      expect(snapshot.period).toBe('night');
    });

    it('should detect night at 5am', () => {
      const earlyMorningDate = new Date();
      earlyMorningDate.setHours(5, 0, 0, 0);
      
      const snapshot = engine.createSnapshot({ now: earlyMorningDate });
      expect(snapshot.period).toBe('night');
    });
  });

  describe('Device Type Detection', () => {
    it('should detect mobile from platform', () => {
      const snapshot = engine.createSnapshot({ device: 'mobile' });
      expect(snapshot.device).toBe('mobile');
    });

    it('should detect desktop from platform', () => {
      const snapshot = engine.createSnapshot({ device: 'desktop' });
      expect(snapshot.device).toBe('desktop');
    });

    it('should detect tablet from platform', () => {
      const snapshot = engine.createSnapshot({ device: 'tablet' });
      expect(snapshot.device).toBe('tablet');
    });

    it('should default to unknown', () => {
      const snapshot = engine.createSnapshot({ device: undefined });
      expect(snapshot.device).toBe('unknown');
    });
  });

  describe('Snapshot Creation', () => {
    it('should create snapshot with all provided values', () => {
      const input = {
        now: new Date('2024-01-15T10:00:00Z'),
        availableMinutes: 30,
        energy: 'medium',
        device: 'mobile',
        connectivity: 'online',
        activeProjectId: 'project-1',
        recentProjectIds: ['project-2', 'project-3'],
        userIntention: 'Work on important task',
      };

      const snapshot = engine.createSnapshot(input);

      expect(snapshot.now).toBe(input.now?.toISOString());
      expect(snapshot.availableMinutes).toBe(30);
      expect(snapshot.energy).toBe('medium');
      expect(snapshot.device).toBe('mobile');
      expect(snapshot.connectivity).toBe('online');
      expect(snapshot.activeProjectId).toBe('project-1');
      expect(snapshot.recentProjectIds).toEqual(['project-2', 'project-3']);
      expect(snapshot.userIntention).toBe('Work on important task');
      expect(snapshot.period).toBe('morning');
    });

    it('should create snapshot with defaults', () => {
      const snapshot = engine.createSnapshot();

      expect(snapshot.now).toBeDefined();
      expect(snapshot.period).toBeDefined();
      expect(snapshot.device).toBe('unknown');
      expect(snapshot.connectivity).toBe('online');
      expect(snapshot.activeProjectId).toBeUndefined();
      expect(snapshot.recentProjectIds).toEqual([]);
      expect(snapshot.availableMinutes).toBeUndefined();
      expect(snapshot.energy).toBeUndefined();
      expect(snapshot.userIntention).toBeUndefined();
    });
  });

  describe('Snapshot Update', () => {
    it('should update snapshot values', () => {
      const originalSnapshot: ContextSnapshot = {
        now: new Date().toISOString(),
        period: 'morning',
        device: 'mobile',
        connectivity: 'online',
      };

      const updatedSnapshot = engine.updateSnapshot(originalSnapshot, {
        availableMinutes: 45,
        energy: 'high',
      });

      expect(updatedSnapshot.availableMinutes).toBe(45);
      expect(updatedSnapshot.energy).toBe('high');
      expect(updatedSnapshot.now).toBe(originalSnapshot.now);
      expect(updatedSnapshot.period).toBe(originalSnapshot.period);
    });

    it('should preserve existing values when updating', () => {
      const originalSnapshot: ContextSnapshot = {
        now: new Date().toISOString(),
        availableMinutes: 30,
        energy: 'medium',
        period: 'morning',
        device: 'mobile',
        connectivity: 'online',
      };

      const updatedSnapshot = engine.updateSnapshot(originalSnapshot, {
        energy: 'high',
      });

      expect(updatedSnapshot.availableMinutes).toBe(30);
      expect(updatedSnapshot.energy).toBe('high');
    });
  });

  describe('Sufficient Context Check', () => {
    it('should return false for empty context', () => {
      const snapshot: ContextSnapshot = {
        now: new Date().toISOString(),
        period: 'morning',
        device: 'unknown',
        connectivity: 'online',
      };

      expect(engine.hasSufficientContext(snapshot)).toBe(false);
    });

    it('should return true with time info', () => {
      const snapshot: ContextSnapshot = {
        now: new Date().toISOString(),
        availableMinutes: 30,
        period: 'morning',
        device: 'mobile',
        connectivity: 'online',
      };

      expect(engine.hasSufficientContext(snapshot)).toBe(true);
    });

    it('should return true with energy info', () => {
      const snapshot: ContextSnapshot = {
        now: new Date().toISOString(),
        energy: 'medium',
        period: 'morning',
        device: 'mobile',
        connectivity: 'online',
      };

      expect(engine.hasSufficientContext(snapshot)).toBe(true);
    });

    it('should return true with project info', () => {
      const snapshot: ContextSnapshot = {
        now: new Date().toISOString(),
        activeProjectId: 'project-1',
        period: 'morning',
        device: 'mobile',
        connectivity: 'online',
      };

      expect(engine.hasSufficientContext(snapshot)).toBe(true);
    });

    it('should return true with multiple info', () => {
      const snapshot: ContextSnapshot = {
        now: new Date().toISOString(),
        availableMinutes: 30,
        energy: 'medium',
        activeProjectId: 'project-1',
        recentProjectIds: ['project-2'],
        period: 'morning',
        device: 'mobile',
        connectivity: 'online',
      };

      expect(engine.hasSufficientContext(snapshot)).toBe(true);
    });
  });
});
