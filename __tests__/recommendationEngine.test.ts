import { RecommendationEngine } from '../packages/core/src/engines/recommendationEngine';
import { Task, Project, Goal, TaskDependency, ContextSnapshot } from '../packages/types/src';

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

const context: ContextSnapshot = {
  now: new Date().toISOString(),
  availableMinutes: 30,
  period: 'morning',
  device: 'mobile',
  connectivity: 'online',
};

describe('Recommendation Engine', () => {
  let engine: RecommendationEngine;

  beforeEach(() => {
    engine = new RecommendationEngine();
  });

  describe('Recommendation Generation', () => {
    it('should return null recommendation when no candidates', async () => {
      const result = await engine.recommend({
        tasks: [],
        projects: [],
        goals: [],
        dependencies: [],
        context,
      });

      expect(result.recommendation).toBeNull();
      expect(result.candidates).toHaveLength(0);
      expect(result.topCandidates).toHaveLength(0);
    });

    it('should return recommendation for single candidate', async () => {
      const task = createTask({ title: 'Test Task' });

      const result = await engine.recommend({
        tasks: [task],
        projects: [],
        goals: [],
        dependencies: [],
        context,
      });

      expect(result.recommendation).not.toBeNull();
      expect(result.recommendation?.taskId).toBe(task.id);
      expect(result.recommendation?.taskTitle).toBe(task.title);
    });

    it('should generate reasons for recommendation', async () => {
      const goal = createGoal({ priority: 5, title: 'Important Goal' });
      const project = createProject({ goal_id: goal.id, title: 'Important Project' });
      const task = createTask({
        project_id: project.id,
        title: 'Important Task',
        estimated_minutes: 25,
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      const result = await engine.recommend({
        tasks: [task],
        projects: [project],
        goals: [goal],
        dependencies: [],
        context: { ...context, availableMinutes: 30 },
        activeProjectId: project.id,
      });

      expect(result.recommendation).not.toBeNull();
      expect(result.recommendation?.reasons).toBeDefined();
      expect(result.recommendation?.reasons.length).toBeGreaterThan(0);
    });

    it('should calculate confidence for recommendation', async () => {
      const task = createTask({ title: 'Test Task' });

      const result = await engine.recommend({
        tasks: [task],
        projects: [],
        goals: [],
        dependencies: [],
        context,
      });

      expect(result.recommendation?.confidence).toBeGreaterThan(0);
      expect(result.recommendation?.confidence).toBeLessThanOrEqual(1);
    });

    it('should return top candidates', async () => {
      const tasks = [
        createTask({ title: 'Task 1' }),
        createTask({ title: 'Task 2' }),
        createTask({ title: 'Task 3' }),
      ];

      const result = await engine.recommend({
        tasks,
        projects: [],
        goals: [],
        dependencies: [],
        context,
      });

      expect(result.topCandidates).toHaveLength(3);
    });

    it('should limit top candidates to 3', async () => {
      const tasks = Array.from({ length: 10 }, () => createTask());

      const result = await engine.recommend({
        tasks,
        projects: [],
        goals: [],
        dependencies: [],
        context,
      });

      expect(result.topCandidates.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Multiple Recommendations', () => {
    it('should return multiple recommendations', async () => {
      const tasks = [
        createTask({ title: 'Task 1' }),
        createTask({ title: 'Task 2' }),
        createTask({ title: 'Task 3' }),
      ];

      const recommendations = await engine.recommendMultiple(
        {
          tasks,
          projects: [],
          goals: [],
          dependencies: [],
          context,
        },
        3
      );

      expect(recommendations).toHaveLength(3);
    });

    it('should return requested number of recommendations', async () => {
      const tasks = Array.from({ length: 10 }, () => createTask());

      const recommendations = await engine.recommendMultiple(
        {
          tasks,
          projects: [],
          goals: [],
          dependencies: [],
          context,
        },
        5
      );

      expect(recommendations).toHaveLength(5);
    });

    it('should return empty array when no candidates', async () => {
      const recommendations = await engine.recommendMultiple(
        {
          tasks: [],
          projects: [],
          goals: [],
          dependencies: [],
          context,
        },
        3
      );

      expect(recommendations).toHaveLength(0);
    });
  });

  describe('Recommendation Validation', () => {
    it('should validate recommendation with current tasks', () => {
      const task = createTask({ title: 'Test Task' });
      const recommendation = {
        taskId: task.id,
        taskTitle: task.title,
        confidence: 0.8,
        reasons: ['Test reason'],
      };

      const isValid = engine.isRecommendationValid(recommendation, [task]);
      expect(isValid).toBe(true);
    });

    it('should invalidate recommendation for completed task', () => {
      const task = createTask({ status: 'completed' });
      const recommendation = {
        taskId: task.id,
        taskTitle: task.title,
        confidence: 0.8,
        reasons: ['Test reason'],
      };

      const isValid = engine.isRecommendationValid(recommendation, [task]);
      expect(isValid).toBe(false);
    });

    it('should invalidate recommendation for cancelled task', () => {
      const task = createTask({ status: 'cancelled' });
      const recommendation = {
        taskId: task.id,
        taskTitle: task.title,
        confidence: 0.8,
        reasons: ['Test reason'],
      };

      const isValid = engine.isRecommendationValid(recommendation, [task]);
      expect(isValid).toBe(false);
    });

    it('should invalidate recommendation for non-existent task', () => {
      const recommendation = {
        taskId: 'non-existent',
        taskTitle: 'Non-existent Task',
        confidence: 0.8,
        reasons: ['Test reason'],
      };

      const isValid = engine.isRecommendationValid(recommendation, []);
      expect(isValid).toBe(false);
    });
  });

  describe('AI Arbitration', () => {
    it('should use AI when enabled and available', async () => {
      const task = createTask({ title: 'Test Task' });
      const mockAIProvider = {
        arbitrateRecommendation: jest.fn().mockResolvedValue({
          selectedTaskId: task.id,
          confidence: 0.9,
          reason: 'AI selected this task',
        }),
      };

      const result = await engine.recommend({
        tasks: [task],
        projects: [],
        goals: [],
        dependencies: [],
        context,
        useAI: true,
        aiProvider: mockAIProvider as any,
      });

      expect(result.usedAI).toBe(true);
      expect(result.aiRecommendation).toBeDefined();
      expect(result.recommendation?.confidence).toBe(0.9);
      expect(result.recommendation?.reasons).toContain('AI selected this task');
    });

    it('should fallback to deterministic when AI fails', async () => {
      const task = createTask({ title: 'Test Task' });
      const mockAIProvider = {
        arbitrateRecommendation: jest.fn().mockRejectedValue(new Error('AI Error')),
      };

      const result = await engine.recommend({
        tasks: [task],
        projects: [],
        goals: [],
        dependencies: [],
        context,
        useAI: true,
        aiProvider: mockAIProvider as any,
      });

      expect(result.usedAI).toBe(false);
      expect(result.recommendation).not.toBeNull();
    });

    it('should fallback when AI selects invalid task', async () => {
      const task = createTask({ title: 'Test Task' });
      const mockAIProvider = {
        arbitrateRecommendation: jest.fn().mockResolvedValue({
          selectedTaskId: 'invalid-task-id',
          confidence: 0.9,
          reason: 'Invalid selection',
        }),
      };

      const result = await engine.recommend({
        tasks: [task],
        projects: [],
        goals: [],
        dependencies: [],
        context,
        useAI: true,
        aiProvider: mockAIProvider as any,
      });

      // Should fallback to deterministic
      expect(result.usedAI).toBe(false);
      expect(result.recommendation?.taskId).toBe(task.id);
    });

    it('should not use AI when disabled', async () => {
      const task = createTask({ title: 'Test Task' });
      const mockAIProvider = {
        arbitrateRecommendation: jest.fn(),
      };

      const result = await engine.recommend({
        tasks: [task],
        projects: [],
        goals: [],
        dependencies: [],
        context,
        useAI: false,
        aiProvider: mockAIProvider as any,
      });

      expect(result.usedAI).toBe(false);
      expect(mockAIProvider.arbitrateRecommendation).not.toHaveBeenCalled();
    });
  });

  describe('Context Integration', () => {
    it('should use context for filtering', async () => {
      const shortTask = createTask({ estimated_minutes: 15, title: 'Short Task' });
      const longTask = createTask({ estimated_minutes: 120, title: 'Long Task' });

      const result = await engine.recommend({
        tasks: [shortTask, longTask],
        projects: [],
        goals: [],
        dependencies: [],
        context: { ...context, availableMinutes: 20 },
      });

      // Long task should be filtered out
      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0].task.id).toBe(shortTask.id);
    });

    it('should use active project for momentum', async () => {
      const project = createProject();
      const taskInProject = createTask({ project_id: project.id, title: 'Task in Project' });
      const taskNotInProject = createTask({ title: 'Task not in Project' });

      const result = await engine.recommend({
        tasks: [taskInProject, taskNotInProject],
        projects: [project],
        goals: [],
        dependencies: [],
        context,
        activeProjectId: project.id,
      });

      // Task in project should have higher momentum
      expect(result.topCandidates[0].task.id).toBe(taskInProject.id);
    });

    it('should use recent projects for momentum', async () => {
      const recentProject = createProject({ id: 'recent-project' });
      const otherProject = createProject({ id: 'other-project' });
      
      const taskInRecent = createTask({ project_id: recentProject.id, title: 'Recent Task' });
      const taskInOther = createTask({ project_id: otherProject.id, title: 'Other Task' });

      const result = await engine.recommend({
        tasks: [taskInRecent, taskInOther],
        projects: [recentProject, otherProject],
        goals: [],
        dependencies: [],
        context,
        recentProjectIds: [recentProject.id],
      });

      // Task in recent project should have higher momentum
      expect(result.topCandidates[0].task.id).toBe(taskInRecent.id);
    });
  });
});
