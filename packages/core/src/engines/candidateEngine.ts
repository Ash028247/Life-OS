import {
  Task,
  Project,
  Goal,
  TaskDependency,
  CandidateTask,
  Status,
  EnergyLevel,
} from '@life-os/types';
import { ContextSnapshot } from '@life-os/types';

/**
 * Candidate Engine
 * 
 * Filters and selects candidate tasks based on:
 * 1. Active status
 * 2. Not blocked by dependencies
 * 3. Feasible (can be done)
 * 4. Compatible with context
 * 5. Pertinent
 */

export interface CandidateEngineInput {
  tasks: Task[];
  projects: Project[];
  goals: Goal[];
  dependencies: TaskDependency[];
  context: ContextSnapshot;
}

export interface CandidateEngineResult {
  candidates: CandidateTask[];
  excluded: {
    completed: Task[];
    cancelled: Task[];
    blocked: Task[];
    infeasible: Task[];
    contextMismatch: Task[];
  };
}

export class CandidateEngine {
  /**
   * Filter out completed and cancelled tasks
   */
  private filterActiveTasks(tasks: Task[]): { active: Task[]; completed: Task[]; cancelled: Task[] } {
    const completed: Task[] = [];
    const cancelled: Task[] = [];
    const active: Task[] = [];

    for (const task of tasks) {
      if (task.status === 'completed') {
        completed.push(task);
      } else if (task.status === 'cancelled') {
        cancelled.push(task);
      } else {
        active.push(task);
      }
    }

    return { active, completed, cancelled };
  }

  /**
   * Find all tasks that block a given task
   */
  private getBlockingDependencies(taskId: string, dependencies: TaskDependency[]): string[] {
    return dependencies
      .filter(dep => dep.task_id === taskId)
      .map(dep => dep.depends_on_task_id);
  }

  /**
   * Find all tasks that a given task blocks
   */
  private getBlockedTasks(taskId: string, dependencies: TaskDependency[]): string[] {
    return dependencies
      .filter(dep => dep.depends_on_task_id === taskId)
      .map(dep => dep.task_id);
  }

  /**
   * Check if a task is blocked by any incomplete dependencies
   */
  private isBlocked(task: Task, dependencies: TaskDependency[], allTasks: Task[]): boolean {
    const blockingTaskIds = this.getBlockingDependencies(task.id, dependencies);
    
    if (blockingTaskIds.length === 0) return false;

    // Check if any blocking task is not completed
    for (const blockingId of blockingTaskIds) {
      const blockingTask = allTasks.find(t => t.id === blockingId);
      if (blockingTask && blockingTask.status !== 'completed') {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a task is feasible given the context
   */
  private isFeasible(task: Task, context: ContextSnapshot): boolean {
    // Check time constraints
    if (context.availableMinutes !== undefined && task.estimated_minutes) {
      if (task.estimated_minutes > context.availableMinutes) {
        return false;
      }
    }

    // Check energy constraints
    if (context.energy && task.energy_required) {
      // If user has low energy, they can't do high energy tasks
      if (context.energy === 'low' && task.energy_required === 'high') {
        return false;
      }
    }

    // Check device constraints (if task specifies a context)
    if (task.context) {
      // For now, we don't have strict device requirements
      // This could be extended later
    }

    return true;
  }

  /**
   * Check if a task is compatible with the context
   */
  private isContextCompatible(task: Task, context: ContextSnapshot): boolean {
    // If task requires specific energy and user doesn't have it
    if (task.energy_required && context.energy) {
      const energyLevels: Record<EnergyLevel, number> = { low: 1, medium: 2, high: 3 };
      const taskEnergy = energyLevels[task.energy_required];
      const userEnergy = energyLevels[context.energy];
      
      if (userEnergy < taskEnergy) {
        return false;
      }
    }

    // If task has a context requirement (could be extended)
    if (task.context) {
      // For now, accept all context matches
      // Later: could check device type, etc.
    }

    return true;
  }

  /**
   * Get the project for a task
   */
  private getTaskProject(task: Task, projects: Project[]): Project | undefined {
    if (!task.project_id) return undefined;
    return projects.find(p => p.id === task.project_id);
  }

  /**
   * Get the goal for a task (through its project)
   */
  private getTaskGoal(task: Task, projects: Project[], goals: Goal[]): Goal | undefined {
    const project = this.getTaskProject(task, projects);
    if (!project?.goal_id) return undefined;
    return goals.find(g => g.id === project.goal_id);
  }

  /**
   * Build a CandidateTask from a Task
   */
  private buildCandidateTask(
    task: Task,
    projects: Project[],
    goals: Goal[],
    dependencies: TaskDependency[]
  ): CandidateTask {
    const project = this.getTaskProject(task, projects);
    const goal = this.getTaskGoal(task, projects, goals);
    const taskDependencies = dependencies.filter(dep => dep.task_id === task.id);
    const blockingDependencies = dependencies.filter(dep => dep.depends_on_task_id === task.id);

    return {
      task,
      project,
      goal,
      dependencies: taskDependencies,
      blockingTasks: blockingDependencies,
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
    };
  }

  /**
   * Main method: filter and select candidate tasks
   */
  getCandidates(input: CandidateEngineInput): CandidateEngineResult {
    const { tasks, projects, goals, dependencies, context } = input;

    // Step 1: Filter out completed and cancelled tasks
    const { active, completed, cancelled } = this.filterActiveTasks(tasks);

    // Step 2: Filter out blocked tasks
    const notBlocked: Task[] = [];
    const blocked: Task[] = [];

    for (const task of active) {
      if (this.isBlocked(task, dependencies, active)) {
        blocked.push(task);
      } else {
        notBlocked.push(task);
      }
    }

    // Step 3: Filter out infeasible tasks
    const feasible: Task[] = [];
    const infeasible: Task[] = [];

    for (const task of notBlocked) {
      if (this.isFeasible(task, context)) {
        feasible.push(task);
      } else {
        infeasible.push(task);
      }
    }

    // Step 4: Filter for context compatibility
    const compatible: Task[] = [];
    const contextMismatch: Task[] = [];

    for (const task of feasible) {
      if (this.isContextCompatible(task, context)) {
        compatible.push(task);
      } else {
        contextMismatch.push(task);
      }
    }

    // Step 5: Build candidate tasks
    const candidates: CandidateTask[] = compatible.map(task =>
      this.buildCandidateTask(task, projects, goals, dependencies)
    );

    return {
      candidates,
      excluded: {
        completed,
        cancelled,
        blocked,
        infeasible,
        contextMismatch,
      },
    };
  }

  /**
   * Get tasks that are blocking other tasks (high value for dependency)
   */
  getBlockingTasks(tasks: Task[], dependencies: TaskDependency[]): Task[] {
    const blockingTaskIds = new Set(
      dependencies.map(dep => dep.depends_on_task_id)
    );
    return tasks.filter(task => blockingTaskIds.has(task.id));
  }

  /**
   * Get tasks that are blocked by other tasks
   */
  getBlockedTasks(tasks: Task[], dependencies: TaskDependency[]): Task[] {
    const blockedTaskIds = new Set(
      dependencies.map(dep => dep.task_id)
    );
    return tasks.filter(task => blockedTaskIds.has(task.id));
  }
}

export const candidateEngine = new CandidateEngine();
