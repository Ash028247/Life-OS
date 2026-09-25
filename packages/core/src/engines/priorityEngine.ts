import {
  Task,
  Project,
  Goal,
  TaskDependency,
  CandidateTask,
  PrioritySignals,
  ContextSnapshot,
  EnergyLevel,
  Status,
} from '@life-os/types';

/**
 * Priority Engine
 * 
 * Calculates priority signals and scores for tasks
 * 
 * Formula:
 * score = 0.22 * goalImpact
 *      + 0.20 * deadlinePressure
 *      + 0.15 * momentum
 *      + 0.15 * dependencyValue
 *      + 0.18 * contextFit
 *      - 0.07 * effort
 *      - 0.03 * switchingCost
 */

// Configuration for priority weights
export interface PriorityWeights {
  goalImpact: number;
  deadlinePressure: number;
  momentum: number;
  dependencyValue: number;
  contextFit: number;
  effort: number;
  switchingCost: number;
}

// Default weights (sum to ~1.0)
export const DEFAULT_WEIGHTS: PriorityWeights = {
  goalImpact: 0.22,
  deadlinePressure: 0.20,
  momentum: 0.15,
  dependencyValue: 0.15,
  contextFit: 0.18,
  effort: -0.07,
  switchingCost: -0.03,
};

// Goal priority to impact mapping
export const GOAL_PRIORITY_IMPACT: Record<number, number> = {
  1: 0.2,
  2: 0.4,
  3: 0.6,
  4: 0.8,
  5: 1.0,
};

// Deadline pressure mapping (days until deadline)
export const DEADLINE_PRESSURE: Record<string, number> = {
  'no_deadline': 0,
  '>7_days': 0.1,
  '<=7_days': 0.25,
  '<=72_hours': 0.5,
  '<=24_hours': 0.75,
  '<=6_hours': 0.9,
  'past_due': 1.0,
};

// Momentum values
export const MOMENTUM_VALUES = {
  active_project: 1.0,
  recent_project: 0.6,
  other_project: 0.2,
  no_project: 0.2,
};

// Dependency value (number of tasks this unblocks)
export const DEPENDENCY_VALUES: Record<number, number> = {
  0: 0,
  1: 0.3,
  2: 0.6,
  3: 1.0,
  // 4+ also maps to 1.0
};

// Effort values (normalized)
export const EFFORT_VALUES: Record<string, number> = {
  'unknown': 0.5,
  '<=15_min': 0.2,
  '<=30_min': 0.4,
  '<=60_min': 0.7,
  '>60_min': 1.0,
};

// Switching cost
export const SWITCHING_COSTS = {
  same_project: 0,
  different_project: 0.5,
};

export interface PriorityEngineInput {
  candidates: CandidateTask[];
  context: ContextSnapshot;
  activeProjectId?: string;
  recentProjectIds?: string[];
  weights?: PriorityWeights;
}

export interface PriorityEngineResult {
  scoredTasks: CandidateTask[];
  topCandidates: CandidateTask[];
}

export class PriorityEngine {
  private weights: PriorityWeights;

  constructor(weights: PriorityWeights = DEFAULT_WEIGHTS) {
    this.weights = weights;
  }

  /**
   * Calculate goal impact signal (0-1)
   */
  private calculateGoalImpact(candidate: CandidateTask): number {
    // If task has a goal, use its priority
    if (candidate.goal) {
      const priority = Math.max(1, Math.min(5, candidate.goal.priority));
      return GOAL_PRIORITY_IMPACT[priority] || 0.6;
    }
    
    // If task has a project with a goal
    if (candidate.project?.goal_id) {
      // We don't have the goal here, but we could look it up
      // For now, return medium impact
      return 0.6;
    }
    
    // No goal association
    return 0.3;
  }

  /**
   * Calculate deadline pressure signal (0-1)
   */
  private calculateDeadlinePressure(task: Task): number {
    if (!task.deadline) {
      return DEADLINE_PRESSURE['no_deadline'];
    }

    const now = new Date();
    const deadlineDate = new Date(task.deadline);
    const hoursUntilDeadline = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilDeadline <= 0) {
      return DEADLINE_PRESSURE['past_due'];
    } else if (hoursUntilDeadline <= 6) {
      return DEADLINE_PRESSURE['<=6_hours'];
    } else if (hoursUntilDeadline <= 24) {
      return DEADLINE_PRESSURE['<=24_hours'];
    } else if (hoursUntilDeadline <= 72) {
      return DEADLINE_PRESSURE['<=72_hours'];
    } else if (hoursUntilDeadline <= 168) { // 7 days
      return DEADLINE_PRESSURE['<=7_days'];
    } else {
      return DEADLINE_PRESSURE['>7_days'];
    }
  }

  /**
   * Calculate momentum signal (0-1)
   */
  private calculateMomentum(
    candidate: CandidateTask,
    context: ContextSnapshot,
    activeProjectId?: string,
    recentProjectIds?: string[]
  ): number {
    const taskProjectId = candidate.task.project_id;
    
    // If active project matches
    if (activeProjectId && taskProjectId === activeProjectId) {
      return MOMENTUM_VALUES.active_project;
    }
    
    // If recent project matches
    if (recentProjectIds && taskProjectId && recentProjectIds.includes(taskProjectId)) {
      return MOMENTUM_VALUES.recent_project;
    }
    
    // If task has a project but it's not active/recent
    if (taskProjectId) {
      return MOMENTUM_VALUES.other_project;
    }
    
    // No project
    return MOMENTUM_VALUES.no_project;
  }

  /**
   * Calculate dependency value signal (0-1)
   */
  private calculateDependencyValue(candidate: CandidateTask): number {
    // Count how many tasks this candidate unblocks
    const unblocksCount = candidate.blockingTasks.length;
    
    if (unblocksCount >= 3) {
      return DEPENDENCY_VALUES[3];
    } else if (unblocksCount >= 2) {
      return DEPENDENCY_VALUES[2];
    } else if (unblocksCount >= 1) {
      return DEPENDENCY_VALUES[1];
    }
    
    return DEPENDENCY_VALUES[0];
  }

  /**
   * Calculate context fit signal (0-1)
   */
  private calculateContextFit(candidate: CandidateTask, context: ContextSnapshot): number {
    let score = 0.5; // Base score
    const signals: number[] = [];

    // Time available fit
    if (context.availableMinutes !== undefined && candidate.task.estimated_minutes) {
      const estimated = candidate.task.estimated_minutes;
      const available = context.availableMinutes;
      
      if (estimated <= available) {
        signals.push(1.0); // Perfect fit
      } else if (estimated <= available * 1.5) {
        signals.push(0.7); // Slightly over
      } else {
        signals.push(0.3); // Poor fit
      }
    }

    // Energy fit
    if (context.energy && candidate.task.energy_required) {
      const energyLevels: Record<EnergyLevel, number> = { low: 1, medium: 2, high: 3 };
      const taskEnergy = energyLevels[candidate.task.energy_required];
      const userEnergy = energyLevels[context.energy];
      
      if (userEnergy >= taskEnergy) {
        signals.push(1.0);
      } else if (userEnergy >= taskEnergy - 1) {
        signals.push(0.5);
      } else {
        signals.push(0.2);
      }
    }

    // Device/context fit (if task specifies context)
    if (candidate.task.context) {
      // For now, assume good fit
      signals.push(0.8);
    }

    // Average signals
    if (signals.length > 0) {
      score = signals.reduce((a, b) => a + b, 0) / signals.length;
    }

    return score;
  }

  /**
   * Calculate effort signal (0-1)
   */
  private calculateEffort(task: Task): number {
    if (!task.estimated_minutes) {
      return EFFORT_VALUES['unknown'];
    }

    const minutes = task.estimated_minutes;
    
    if (minutes <= 15) {
      return EFFORT_VALUES['<=15_min'];
    } else if (minutes <= 30) {
      return EFFORT_VALUES['<=30_min'];
    } else if (minutes <= 60) {
      return EFFORT_VALUES['<=60_min'];
    } else {
      return EFFORT_VALUES['>60_min'];
    }
  }

  /**
   * Calculate switching cost signal (0-1)
   */
  private calculateSwitchingCost(
    candidate: CandidateTask,
    context: ContextSnapshot,
    activeProjectId?: string
  ): number {
    const taskProjectId = candidate.task.project_id;
    
    // If no active project, no switching cost
    if (!activeProjectId) {
      return 0;
    }
    
    // If task is in the same project as active
    if (taskProjectId === activeProjectId) {
      return SWITCHING_COSTS.same_project;
    }
    
    // Different project
    return SWITCHING_COSTS.different_project;
  }

  /**
   * Calculate all signals for a candidate
   */
  private calculateSignals(
    candidate: CandidateTask,
    context: ContextSnapshot,
    activeProjectId?: string,
    recentProjectIds?: string[]
  ): PrioritySignals {
    const goalImpact = this.calculateGoalImpact(candidate);
    const deadlinePressure = this.calculateDeadlinePressure(candidate.task);
    const momentum = this.calculateMomentum(candidate, context, activeProjectId, recentProjectIds);
    const dependencyValue = this.calculateDependencyValue(candidate);
    const contextFit = this.calculateContextFit(candidate, context);
    const effort = this.calculateEffort(candidate.task);
    const switchingCost = this.calculateSwitchingCost(candidate, context, activeProjectId);

    // Calculate final score
    const finalScore = 
      this.weights.goalImpact * goalImpact +
      this.weights.deadlinePressure * deadlinePressure +
      this.weights.momentum * momentum +
      this.weights.dependencyValue * dependencyValue +
      this.weights.contextFit * contextFit +
      this.weights.effort * effort +
      this.weights.switchingCost * switchingCost;

    return {
      goalImpact,
      deadlinePressure,
      momentum,
      dependencyValue,
      contextFit,
      effort,
      switchingCost,
      finalScore,
    };
  }

  /**
   * Score all candidates
   */
  scoreCandidates(input: PriorityEngineInput): PriorityEngineResult {
    const { candidates, context, activeProjectId, recentProjectIds, weights } = input;
    
    // Use provided weights or defaults
    const engine = weights ? new PriorityEngine(weights) : this;

    // Calculate signals for each candidate
    const scoredTasks: CandidateTask[] = candidates.map(candidate => {
      const signals = engine.calculateSignals(
        candidate,
        context,
        activeProjectId,
        recentProjectIds
      );
      return {
        ...candidate,
        signals,
      };
    });

    // Sort by final score (descending)
    const sorted = [...scoredTasks].sort((a, b) => b.signals.finalScore - a.signals.finalScore);

    // Get top 3 candidates
    const topCandidates = sorted.slice(0, 3);

    return {
      scoredTasks: sorted,
      topCandidates,
    };
  }

  /**
   * Get top N candidates
   */
  getTopCandidates(
    input: PriorityEngineInput,
    count: number = 3
  ): CandidateTask[] {
    const result = this.scoreCandidates(input);
    return result.scoredTasks.slice(0, count);
  }

  /**
   * Get the best candidate
   */
  getBestCandidate(input: PriorityEngineInput): CandidateTask | null {
    const result = this.scoreCandidates(input);
    return result.scoredTasks[0] || null;
  }
}

export const priorityEngine = new PriorityEngine();
