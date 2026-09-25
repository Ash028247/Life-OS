import {
  PriorityEngine,
  DEFAULT_WEIGHTS,
  GOAL_PRIORITY_IMPACT,
  DEADLINE_PRESSURE,
  MOMENTUM_VALUES,
  DEPENDENCY_VALUES,
  EFFORT_VALUES,
  SWITCHING_COSTS,
} from '../packages/core/src/engines/priorityEngine';
import { CandidateTask, Task, Project, Goal, PrioritySignals } from '../packages/types/src';

// Helper to create test data
const createTask = (overrides: Partial<Task> = {}): Task => ({
  id: `task-${Math.random().toString(36).substr(2, 9)}`,
  user_id: 'test-user',
  project_id: null,
  title: 'Test Task',
  description: null,
  status: 'pending',
  estimated_minutes: null,
  deadline: null,
  energy_required: null,
  context: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  completed_at: null,
  ...overrides,
});

const createProject = (overrides: Partial<Project> = {}): Project => ({
  id: `project-${Math.random().toString(36).substr(2, 9)}`,
  user_id: 'test-user',
  goal_id: null,
  title: 'Test Project',
  description: null,
  status: 'active',
  target_date: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createGoal = (overrides: Partial<Goal> = {}): Goal => ({
  id: `goal-${Math.random().toString(36).substr(2, 9)}`,
  user_id: 'test-user',
  title: 'Test Goal',
  description: null,
  status: 'active',
  priority: 3,
  target_date: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createCandidate = (overrides: Partial<CandidateTask> = {}): CandidateTask => ({
  task: createTask(),
  project: undefined,
  goal: undefined,
  dependencies: [],
  blockingTasks: [],
  signals: {
    goalImpact: 0,
    deadlinePressure: 0,
    momentum: 0,
    dependencyValue: 0,
    contextFit: 0,
    effort: 0,
    switchingCost: 0,
    finalScore: 0,
  },
  ...overrides,
});

describe('Priority Engine', () => {
  let engine: PriorityEngine;

  beforeEach(() => {
    engine = new PriorityEngine(DEFAULT_WEIGHTS);
  });

  describe('Goal Impact Calculation', () => {
    it('should return correct impact for priority 1 goal', () => {
      const candidate = createCandidate({
        goal: createGoal({ priority: 1 }),
      });
      
      const signals = engine['calculateGoalImpact'](candidate);
      expect(signals).toBe(GOAL_PRIORITY_IMPACT[1]);
    });

    it('should return correct impact for priority 5 goal', () => {
      const candidate = createCandidate({
        goal: createGoal({ priority: 5 }),
      });
      
      const signals = engine['calculateGoalImpact'](candidate);
      expect(signals).toBe(GOAL_PRIORITY_IMPACT[5]);
    });

    it('should return neutral impact for task without goal', () => {
      const candidate = createCandidate({
        goal: undefined,
        project: undefined,
      });
      
      const signals = engine['calculateGoalImpact'](candidate);
      expect(signals).toBe(0.3);
    });
  });

  describe('Deadline Pressure Calculation', () => {
    it('should return 0 for no deadline', () => {
      const task = createTask({ deadline: null });
      const pressure = engine['calculateDeadlinePressure'](task);
      expect(pressure).toBe(DEADLINE_PRESSURE['no_deadline']);
    });

    it('should return 1 for past due deadline', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const task = createTask({ deadline: yesterday.toISOString() });
      const pressure = engine['calculateDeadlinePressure'](task);
      expect(pressure).toBe(DEADLINE_PRESSURE['past_due']);
    });

    it('should return 0.75 for deadline in 24 hours', () => {
      const tomorrow = new Date();
      tomorrow.setHours(tomorrow.getHours() + 24);
      const task = createTask({ deadline: tomorrow.toISOString() });
      const pressure = engine['calculateDeadlinePressure'](task);
      expect(pressure).toBe(DEADLINE_PRESSURE['<=24_hours']);
    });

    it('should return 0.5 for deadline in 72 hours', () => {
      const in72Hours = new Date();
      in72Hours.setHours(in72Hours.getHours() + 72);
      const task = createTask({ deadline: in72Hours.toISOString() });
      const pressure = engine['calculateDeadlinePressure'](task);
      expect(pressure).toBe(DEADLINE_PRESSURE['<=72_hours']);
    });
  });

  describe('Momentum Calculation', () => {
    const context = {
      now: new Date().toISOString(),
      period: 'morning' as const,
      device: 'mobile' as const,
      connectivity: 'online' as const,
    };

    it('should return 1 for active project', () => {
      const project = createProject();
      const candidate = createCandidate({
        task: createTask({ project_id: project.id }),
        project,
      });
      
      const momentum = engine['calculateMomentum'](candidate, context, project.id, []);
      expect(momentum).toBe(MOMENTUM_VALUES.active_project);
    });

    it('should return 0.6 for recent project', () => {
      const project = createProject();
      const candidate = createCandidate({
        task: createTask({ project_id: project.id }),
        project,
      });
      
      const momentum = engine['calculateMomentum'](candidate, context, undefined, [project.id]);
      expect(momentum).toBe(MOMENTUM_VALUES.recent_project);
    });

    it('should return 0.2 for other project', () => {
      const project = createProject();
      const candidate = createCandidate({
        task: createTask({ project_id: project.id }),
        project,
      });
      
      const momentum = engine['calculateMomentum'](candidate, context, 'different-project', []);
      expect(momentum).toBe(MOMENTUM_VALUES.other_project);
    });

    it('should return 0.2 for task without project', () => {
      const candidate = createCandidate({
        task: createTask({ project_id: null }),
        project: undefined,
      });
      
      const momentum = engine['calculateMomentum'](candidate, context, undefined, []);
      expect(momentum).toBe(MOMENTUM_VALUES.no_project);
    });
  });

  describe('Dependency Value Calculation', () => {
    it('should return 0 for task that unblocks nothing', () => {
      const candidate = createCandidate({
        blockingTasks: [],
      });
      
      const value = engine['calculateDependencyValue'](candidate);
      expect(value).toBe(DEPENDENCY_VALUES[0]);
    });

    it('should return 0.3 for task that unblocks 1 task', () => {
      const candidate = createCandidate({
        blockingTasks: [{ id: 'dep-1', task_id: 'other', depends_on_task_id: 'test', created_at: '' }],
      });
      
      const value = engine['calculateDependencyValue'](candidate);
      expect(value).toBe(DEPENDENCY_VALUES[1]);
    });

    it('should return 0.6 for task that unblocks 2 tasks', () => {
      const candidate = createCandidate({
        blockingTasks: [
          { id: 'dep-1', task_id: 'other1', depends_on_task_id: 'test', created_at: '' },
          { id: 'dep-2', task_id: 'other2', depends_on_task_id: 'test', created_at: '' },
        ],
      });
      
      const value = engine['calculateDependencyValue'](candidate);
      expect(value).toBe(DEPENDENCY_VALUES[2]);
    });

    it('should return 1 for task that unblocks 3+ tasks', () => {
      const candidate = createCandidate({
        blockingTasks: [
          { id: 'dep-1', task_id: 'other1', depends_on_task_id: 'test', created_at: '' },
          { id: 'dep-2', task_id: 'other2', depends_on_task_id: 'test', created_at: '' },
          { id: 'dep-3', task_id: 'other3', depends_on_task_id: 'test', created_at: '' },
          { id: 'dep-4', task_id: 'other4', depends_on_task_id: 'test', created_at: '' },
        ],
      });
      
      const value = engine['calculateDependencyValue'](candidate);
      expect(value).toBe(DEPENDENCY_VALUES[3]);
    });
  });

  describe('Effort Calculation', () => {
    it('should return 0.2 for task <= 15 min', () => {
      const task = createTask({ estimated_minutes: 10 });
      const effort = engine['calculateEffort'](task);
      expect(effort).toBe(EFFORT_VALUES['<=15_min']);
    });

    it('should return 0.4 for task <= 30 min', () => {
      const task = createTask({ estimated_minutes: 25 });
      const effort = engine['calculateEffort'](task);
      expect(effort).toBe(EFFORT_VALUES['<=30_min']);
    });

    it('should return 0.7 for task <= 60 min', () => {
      const task = createTask({ estimated_minutes: 45 });
      const effort = engine['calculateEffort'](task);
      expect(effort).toBe(EFFORT_VALUES['<=60_min']);
    });

    it('should return 1 for task > 60 min', () => {
      const task = createTask({ estimated_minutes: 90 });
      const effort = engine['calculateEffort'](task);
      expect(effort).toBe(EFFORT_VALUES['>60_min']);
    });

    it('should return 0.5 for task with unknown effort', () => {
      const task = createTask({ estimated_minutes: null });
      const effort = engine['calculateEffort'](task);
      expect(effort).toBe(EFFORT_VALUES['unknown']);
    });
  });

  describe('Switching Cost Calculation', () => {
    const context = {
      now: new Date().toISOString(),
      period: 'morning' as const,
      device: 'mobile' as const,
      connectivity: 'online' as const,
    };

    it('should return 0 for same project', () => {
      const project = createProject();
      const candidate = createCandidate({
        task: createTask({ project_id: project.id }),
        project,
      });
      
      const cost = engine['calculateSwitchingCost'](candidate, context, project.id);
      expect(cost).toBe(SWITCHING_COSTS.same_project);
    });

    it('should return 0.5 for different project', () => {
      const project = createProject();
      const candidate = createCandidate({
        task: createTask({ project_id: project.id }),
        project,
      });
      
      const cost = engine['calculateSwitchingCost'](candidate, context, 'different-project');
      expect(cost).toBe(SWITCHING_COSTS.different_project);
    });

    it('should return 0 when no active project', () => {
      const project = createProject();
      const candidate = createCandidate({
        task: createTask({ project_id: project.id }),
        project,
      });
      
      const cost = engine['calculateSwitchingCost'](candidate, context, undefined);
      expect(cost).toBe(0);
    });
  });

  describe('Full Scoring', () => {
    const context = {
      now: new Date().toISOString(),
      availableMinutes: 30,
      period: 'morning' as const,
      device: 'mobile' as const,
      connectivity: 'online' as const,
    };

    it('should correctly score a high-priority task with deadline', () => {
      const goal = createGoal({ priority: 5 });
      const project = createProject({ goal_id: goal.id });
      const task = createTask({
        project_id: project.id,
        estimated_minutes: 25,
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        energy_required: 'medium',
      });
      
      const candidate = createCandidate({
        task,
        project,
        goal,
        blockingTasks: [],
      });

      const signals = engine['calculateSignals'](candidate, context, project.id, []);
      
      // Should have high goal impact
      expect(signals.goalImpact).toBe(GOAL_PRIORITY_IMPACT[5]);
      
      // Should have high deadline pressure
      expect(signals.deadlinePressure).toBe(DEADLINE_PRESSURE['<=24_hours']);
      
      // Should have high momentum (active project)
      expect(signals.momentum).toBe(MOMENTUM_VALUES.active_project);
      
      // Should have good context fit (30 min available, 25 min task)
      expect(signals.contextFit).toBeGreaterThan(0.7);
      
      // Should have low effort (25 min)
      expect(signals.effort).toBe(EFFORT_VALUES['<=30_min']);
      
      // Should have no switching cost
      expect(signals.switchingCost).toBe(0);
      
      // Should have positive final score
      expect(signals.finalScore).toBeGreaterThan(0);
    });

    it('should score short task higher when time is limited', () => {
      const project = createProject();
      
      const shortTask = createTask({
        project_id: project.id,
        estimated_minutes: 15,
      });
      
      const longTask = createTask({
        project_id: project.id,
        estimated_minutes: 120,
      });

      const shortCandidate = createCandidate({
        task: shortTask,
        project,
        blockingTasks: [],
      });

      const longCandidate = createCandidate({
        task: longTask,
        project,
        blockingTasks: [],
      });

      const shortSignals = engine['calculateSignals'](shortCandidate, context, project.id, []);
      const longSignals = engine['calculateSignals'](longCandidate, context, project.id, []);

      // Short task should have better context fit
      expect(shortSignals.contextFit).toBeGreaterThan(longSignals.contextFit);
      
      // Short task should have lower effort
      expect(shortSignals.effort).toBeLessThan(longSignals.effort);
    });
  });

  describe('Scenario Tests', () => {
    const context = {
      now: new Date().toISOString(),
      availableMinutes: 20,
      energy: 'medium' as const,
      period: 'morning' as const,
      device: 'mobile' as const,
      connectivity: 'online' as const,
    };

    it('Scenario 1: 20 minutes available, medium energy - short task should be favored', () => {
      const project = createProject();
      
      const taskA = createTask({
        project_id: project.id,
        estimated_minutes: 15,
        energy_required: 'medium',
      });
      
      const taskB = createTask({
        project_id: project.id,
        estimated_minutes: 120,
        energy_required: 'medium',
      });

      const candidateA = createCandidate({ task: taskA, project });
      const candidateB = createCandidate({ task: taskB, project });

      const signalsA = engine['calculateSignals'](candidateA, context, project.id, []);
      const signalsB = engine['calculateSignals'](candidateB, context, project.id, []);

      // Task A should have better context fit (fits in 20 min)
      expect(signalsA.contextFit).toBeGreaterThan(signalsB.contextFit);
      
      // Task A should have lower effort
      expect(signalsA.effort).toBeLessThan(signalsB.effort);
    });

    it('Scenario 2: Task with deadline in 2 hours should have higher pressure', () => {
      const project = createProject();
      
      const taskA = createTask({
        project_id: project.id,
        deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
      });
      
      const taskB = createTask({
        project_id: project.id,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      });

      const candidateA = createCandidate({ task: taskA, project });
      const candidateB = createCandidate({ task: taskB, project });

      const signalsA = engine['calculateSignals'](candidateA, context, project.id, []);
      const signalsB = engine['calculateSignals'](candidateB, context, project.id, []);

      expect(signalsA.deadlinePressure).toBeGreaterThan(signalsB.deadlinePressure);
    });

    it('Scenario 3: Active project task should have momentum bonus', () => {
      const activeProject = createProject();
      const otherProject = createProject();
      
      const taskA = createTask({ project_id: activeProject.id });
      const taskB = createTask({ project_id: otherProject.id });

      const candidateA = createCandidate({ task: taskA, project: activeProject });
      const candidateB = createCandidate({ task: taskB, project: otherProject });

      const signalsA = engine['calculateSignals'](candidateA, context, activeProject.id, []);
      const signalsB = engine['calculateSignals'](candidateB, context, activeProject.id, []);

      expect(signalsA.momentum).toBeGreaterThan(signalsB.momentum);
    });

    it('Scenario 4: Task that unblocks 3 tasks should have higher dependency value', () => {
      const project = createProject();
      
      const taskA = createTask({ project_id: project.id });
      const taskB = createTask({ project_id: project.id });

      const candidateA = createCandidate({
        task: taskA,
        project,
        blockingTasks: [
          { id: '1', task_id: 'x', depends_on_task_id: taskA.id, created_at: '' },
          { id: '2', task_id: 'y', depends_on_task_id: taskA.id, created_at: '' },
          { id: '3', task_id: 'z', depends_on_task_id: taskA.id, created_at: '' },
        ],
      });
      
      const candidateB = createCandidate({
        task: taskB,
        project,
        blockingTasks: [],
      });

      const signalsA = engine['calculateSignals'](candidateA, context, project.id, []);
      const signalsB = engine['calculateSignals'](candidateB, context, project.id, []);

      expect(signalsA.dependencyValue).toBeGreaterThan(signalsB.dependencyValue);
    });
  });
});
