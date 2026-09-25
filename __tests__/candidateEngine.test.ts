import { CandidateEngine } from '../packages/core/src/engines/candidateEngine';
import { Task, Project, Goal, TaskDependency, Status } from '../packages/types/src';

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

const createDependency = (overrides: Partial<TaskDependency> = {}): TaskDependency => ({
  id: `dep-${Math.random().toString(36).substr(2, 9)}`,
  task_id: '',
  depends_on_task_id: '',
  created_at: new Date().toISOString(),
  ...overrides,
});

describe('Candidate Engine', () => {
  let engine: CandidateEngine;

  beforeEach(() => {
    engine = new CandidateEngine();
  });

  describe('Filter Active Tasks', () => {
    it('should filter out completed tasks', () => {
      const tasks = [
        createTask({ status: 'pending' }),
        createTask({ status: 'in_progress' }),
        createTask({ status: 'completed' }),
        createTask({ status: 'cancelled' }),
      ];

      const result = engine['filterActiveTasks'](tasks);
      
      expect(result.active).toHaveLength(2);
      expect(result.completed).toHaveLength(1);
      expect(result.cancelled).toHaveLength(1);
    });

    it('should return empty arrays when no tasks', () => {
      const result = engine['filterActiveTasks']([]);
      
      expect(result.active).toHaveLength(0);
      expect(result.completed).toHaveLength(0);
      expect(result.cancelled).toHaveLength(0);
    });

    it('should handle all completed tasks', () => {
      const tasks = [
        createTask({ status: 'completed' }),
        createTask({ status: 'completed' }),
      ];

      const result = engine['filterActiveTasks'](tasks);
      
      expect(result.active).toHaveLength(0);
      expect(result.completed).toHaveLength(2);
    });
  });

  describe('Dependency Checking', () => {
    it('should identify blocked tasks', () => {
      const taskA = createTask({ id: 'task-a' });
      const taskB = createTask({ id: 'task-b' });
      const taskC = createTask({ id: 'task-c' });
      
      const dependencies = [
        createDependency({ task_id: 'task-b', depends_on_task_id: 'task-a' }),
        createDependency({ task_id: 'task-c', depends_on_task_id: 'task-b' }),
      ];

      const allTasks = [taskA, taskB, taskC];

      // Task B is blocked by A
      expect(engine['isBlocked'](taskB, dependencies, allTasks)).toBe(true);
      
      // Task C is blocked by B
      expect(engine['isBlocked'](taskC, dependencies, allTasks)).toBe(true);
      
      // Task A is not blocked
      expect(engine['isBlocked'](taskA, dependencies, allTasks)).toBe(false);
    });

    it('should handle completed dependencies', () => {
      const taskA = createTask({ id: 'task-a', status: 'completed' });
      const taskB = createTask({ id: 'task-b' });
      
      const dependencies = [
        createDependency({ task_id: 'task-b', depends_on_task_id: 'task-a' }),
      ];

      const allTasks = [taskA, taskB];

      // Task B should not be blocked because A is completed
      expect(engine['isBlocked'](taskB, dependencies, allTasks)).toBe(false);
    });

    it('should handle circular dependencies gracefully', () => {
      const taskA = createTask({ id: 'task-a' });
      const taskB = createTask({ id: 'task-b' });
      
      // Note: This shouldn't happen in real data due to constraint
      const dependencies = [
        createDependency({ task_id: 'task-a', depends_on_task_id: 'task-b' }),
        createDependency({ task_id: 'task-b', depends_on_task_id: 'task-a' }),
      ];

      const allTasks = [taskA, taskB];

      // Both should be considered blocked
      expect(engine['isBlocked'](taskA, dependencies, allTasks)).toBe(true);
      expect(engine['isBlocked'](taskB, dependencies, allTasks)).toBe(true);
    });

    it('should get blocking dependencies', () => {
      const dependencies = [
        createDependency({ task_id: 'task-b', depends_on_task_id: 'task-a' }),
        createDependency({ task_id: 'task-c', depends_on_task_id: 'task-a' }),
        createDependency({ task_id: 'task-d', depends_on_task_id: 'task-b' }),
      ];

      const blocking = engine['getBlockingDependencies']('task-b', dependencies);
      expect(blocking).toEqual(['task-a']);
    });

    it('should get blocked tasks', () => {
      const dependencies = [
        createDependency({ task_id: 'task-b', depends_on_task_id: 'task-a' }),
        createDependency({ task_id: 'task-c', depends_on_task_id: 'task-a' }),
        createDependency({ task_id: 'task-d', depends_on_task_id: 'task-b' }),
      ];

      const blocking = engine['getBlockedTasks'](['task-a', 'task-b', 'task-c', 'task-d'], dependencies);
      expect(blocking.sort()).toEqual(['task-b', 'task-c', 'task-d'].sort());
    });
  });

  describe('Feasibility Checking', () => {
    const context = {
      now: new Date().toISOString(),
      availableMinutes: 30,
      period: 'morning' as const,
      device: 'mobile' as const,
      connectivity: 'online' as const,
    };

    it('should filter tasks that take longer than available time', () => {
      const task = createTask({ estimated_minutes: 60 });
      
      expect(engine['isFeasible'](task, context)).toBe(false);
    });

    it('should allow tasks that fit in available time', () => {
      const task = createTask({ estimated_minutes: 20 });
      
      expect(engine['isFeasible'](task, context)).toBe(true);
    });

    it('should filter high energy tasks when user has low energy', () => {
      const lowEnergyContext = { ...context, energy: 'low' as const };
      const task = createTask({ energy_required: 'high' });
      
      expect(engine['isFeasible'](task, lowEnergyContext)).toBe(false);
    });

    it('should allow medium energy tasks when user has medium energy', () => {
      const mediumEnergyContext = { ...context, energy: 'medium' as const };
      const task = createTask({ energy_required: 'medium' });
      
      expect(engine['isFeasible'](task, mediumEnergyContext)).toBe(true);
    });

    it('should allow tasks without energy requirement', () => {
      const lowEnergyContext = { ...context, energy: 'low' as const };
      const task = createTask({ energy_required: null });
      
      expect(engine['isFeasible'](task, lowEnergyContext)).toBe(true);
    });

    it('should allow tasks without estimated time', () => {
      const task = createTask({ estimated_minutes: null });
      
      expect(engine['isFeasible'](task, context)).toBe(true);
    });
  });

  describe('Context Compatibility', () => {
    const context = {
      now: new Date().toISOString(),
      availableMinutes: 30,
      period: 'morning' as const,
      device: 'mobile' as const,
      connectivity: 'online' as const,
    };

    it('should be compatible when energy matches', () => {
      const task = createTask({ energy_required: 'medium' });
      const compatibleContext = { ...context, energy: 'medium' as const };
      
      expect(engine['isContextCompatible'](task, compatibleContext)).toBe(true);
    });

    it('should not be compatible when energy is insufficient', () => {
      const task = createTask({ energy_required: 'high' });
      const lowEnergyContext = { ...context, energy: 'low' as const };
      
      expect(engine['isContextCompatible'](task, lowEnergyContext)).toBe(false);
    });

    it('should be compatible when task has no energy requirement', () => {
      const task = createTask({ energy_required: null });
      const lowEnergyContext = { ...context, energy: 'low' as const };
      
      expect(engine['isContextCompatible'](task, lowEnergyContext)).toBe(true);
    });
  });

  describe('Full Candidate Selection', () => {
    const context = {
      now: new Date().toISOString(),
      availableMinutes: 30,
      period: 'morning' as const,
      device: 'mobile' as const,
      connectivity: 'online' as const,
    };

    it('should exclude completed tasks', () => {
      const tasks = [
        createTask({ status: 'completed' }),
        createTask({ status: 'pending' }),
      ];

      const result = engine.getCandidates({
        tasks,
        projects: [],
        goals: [],
        dependencies: [],
        context,
      });

      expect(result.candidates).toHaveLength(1);
      expect(result.excluded.completed).toHaveLength(1);
    });

    it('should exclude cancelled tasks', () => {
      const tasks = [
        createTask({ status: 'cancelled' }),
        createTask({ status: 'pending' }),
      ];

      const result = engine.getCandidates({
        tasks,
        projects: [],
        goals: [],
        dependencies: [],
        context,
      });

      expect(result.candidates).toHaveLength(1);
      expect(result.excluded.cancelled).toHaveLength(1);
    });

    it('should exclude blocked tasks', () => {
      const taskA = createTask({ id: 'task-a', status: 'pending' });
      const taskB = createTask({ id: 'task-b', status: 'pending' });
      
      const dependencies = [
        createDependency({ task_id: 'task-b', depends_on_task_id: 'task-a' }),
      ];

      const result = engine.getCandidates({
        tasks: [taskA, taskB],
        projects: [],
        goals: [],
        dependencies,
        context,
      });

      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0].task.id).toBe('task-a');
      expect(result.excluded.blocked).toHaveLength(1);
      expect(result.excluded.blocked[0].id).toBe('task-b');
    });

    it('should exclude infeasible tasks', () => {
      const task = createTask({ estimated_minutes: 60 });

      const result = engine.getCandidates({
        tasks: [task],
        projects: [],
        goals: [],
        dependencies: [],
        context,
      });

      expect(result.candidates).toHaveLength(0);
      expect(result.excluded.infeasible).toHaveLength(1);
    });

    it('should exclude context incompatible tasks', () => {
      const task = createTask({ energy_required: 'high' });
      const lowEnergyContext = { ...context, energy: 'low' as const };

      const result = engine.getCandidates({
        tasks: [task],
        projects: [],
        goals: [],
        dependencies: [],
        context: lowEnergyContext,
      });

      expect(result.candidates).toHaveLength(0);
      expect(result.excluded.contextMismatch).toHaveLength(1);
    });

    it('should return all tasks when all are valid', () => {
      const tasks = [
        createTask({ status: 'pending', estimated_minutes: 20, energy_required: 'medium' }),
        createTask({ status: 'pending', estimated_minutes: 15, energy_required: 'low' }),
      ];
      const mediumEnergyContext = { ...context, energy: 'medium' as const };

      const result = engine.getCandidates({
        tasks,
        projects: [],
        goals: [],
        dependencies: [],
        context: mediumEnergyContext,
      });

      expect(result.candidates).toHaveLength(2);
    });

    it('should return empty array when no valid candidates', () => {
      const tasks = [
        createTask({ status: 'completed' }),
        createTask({ status: 'cancelled' }),
      ];

      const result = engine.getCandidates({
        tasks,
        projects: [],
        goals: [],
        dependencies: [],
        context,
      });

      expect(result.candidates).toHaveLength(0);
    });

    it('should include project and goal in candidate', () => {
      const goal = createGoal({ id: 'goal-1' });
      const project = createProject({ id: 'project-1', goal_id: goal.id });
      const task = createTask({ id: 'task-1', project_id: project.id });

      const result = engine.getCandidates({
        tasks: [task],
        projects: [project],
        goals: [goal],
        dependencies: [],
        context,
      });

      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0].project?.id).toBe(project.id);
      expect(result.candidates[0].goal?.id).toBe(goal.id);
    });

    it('should include dependencies in candidate', () => {
      const taskA = createTask({ id: 'task-a' });
      const taskB = createTask({ id: 'task-b' });
      const dependency = createDependency({ task_id: 'task-b', depends_on_task_id: 'task-a' });

      const result = engine.getCandidates({
        tasks: [taskA, taskB],
        projects: [],
        goals: [],
        dependencies: [dependency],
        context,
      });

      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0].task.id).toBe('task-a');
      
      // Task B should be in blocked
      expect(result.excluded.blocked).toHaveLength(1);
      expect(result.excluded.blocked[0].id).toBe('task-b');
    });
  });

  describe('Blocking Tasks', () => {
    it('should identify tasks that block others', () => {
      const taskA = createTask({ id: 'task-a' });
      const taskB = createTask({ id: 'task-b' });
      const taskC = createTask({ id: 'task-c' });
      
      const dependencies = [
        createDependency({ task_id: 'task-b', depends_on_task_id: 'task-a' }),
        createDependency({ task_id: 'task-c', depends_on_task_id: 'task-a' }),
      ];

      const blockingTasks = engine.getBlockingTasks(
        [taskA, taskB, taskC],
        dependencies
      );

      expect(blockingTasks).toHaveLength(1);
      expect(blockingTasks[0].id).toBe('task-a');
    });

    it('should identify tasks that are blocked', () => {
      const taskA = createTask({ id: 'task-a' });
      const taskB = createTask({ id: 'task-b' });
      const taskC = createTask({ id: 'task-c' });
      
      const dependencies = [
        createDependency({ task_id: 'task-b', depends_on_task_id: 'task-a' }),
        createDependency({ task_id: 'task-c', depends_on_task_id: 'task-a' }),
      ];

      const blockedTasks = engine.getBlockedTasks(
        [taskA, taskB, taskC],
        dependencies
      );

      expect(blockedTasks).toHaveLength(2);
      expect(blockedTasks.map(t => t.id).sort()).toEqual(['task-b', 'task-c'].sort());
    });
  });
});
