import {
  Task,
  Project,
  Goal,
  TaskDependency,
  CandidateTask,
  Recommendation,
  ContextSnapshot,
  AIRecommendation,
} from '@life-os/types';
import { CandidateEngine, CandidateEngineInput } from './candidateEngine';
import { PriorityEngine, PriorityEngineInput, DEFAULT_WEIGHTS } from './priorityEngine';
import { ContextEngine } from './contextEngine';

/**
 * Recommendation Engine
 * 
 * Pipeline:
 * Context -> Candidates -> Signals -> Ranking -> Top 3 -> AI Arbitration -> Recommendation
 */

export interface RecommendationEngineInput {
  tasks: Task[];
  projects: Project[];
  goals: Goal[];
  dependencies: TaskDependency[];
  context: ContextSnapshot;
  activeProjectId?: string;
  recentProjectIds?: string[];
  useAI?: boolean;
  aiProvider?: {
    arbitrateRecommendation: (
      context: ContextSnapshot,
      candidates: CandidateTask[]
    ) => Promise<AIRecommendation>;
  };
}

export interface RecommendationEngineResult {
  recommendation: Recommendation | null;
  candidates: CandidateTask[];
  topCandidates: CandidateTask[];
  context: ContextSnapshot;
  usedAI: boolean;
  aiRecommendation?: AIRecommendation;
}

export class RecommendationEngine {
  private candidateEngine: CandidateEngine;
  private priorityEngine: PriorityEngine;
  private contextEngine: ContextEngine;

  constructor() {
    this.candidateEngine = new CandidateEngine();
    this.priorityEngine = new PriorityEngine(DEFAULT_WEIGHTS);
    this.contextEngine = new ContextEngine();
  }

  /**
   * Generate human-readable reasons for a recommendation
   */
  private generateReasons(candidate: CandidateTask, context: ContextSnapshot): string[] {
    const reasons: string[] = [];
    const signals = candidate.signals;

    // Goal impact
    if (signals.goalImpact > 0.7) {
      if (candidate.goal) {
        reasons.push(`It advances your high-priority goal: "${candidate.goal.title}"`);
      } else if (candidate.project) {
        reasons.push(`It advances your project: "${candidate.project.title}"`);
      }
    }

    // Deadline pressure
    if (signals.deadlinePressure > 0.5) {
      if (candidate.task.deadline) {
        const deadline = new Date(candidate.task.deadline);
        const now = new Date();
        const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntil <= 1) {
          reasons.push('It has a deadline very soon');
        } else if (daysUntil <= 3) {
          reasons.push(`It has a deadline in ${daysUntil} days`);
        } else if (daysUntil <= 7) {
          reasons.push(`It has a deadline in ${daysUntil} days`);
        }
      }
    }

    // Dependency value
    if (signals.dependencyValue > 0.5) {
      const unblocksCount = candidate.blockingTasks.length;
      if (unblocksCount > 0) {
        reasons.push(`It unblocks ${unblocksCount} other task${unblocksCount > 1 ? 's' : ''}`);
      }
    }

    // Context fit
    if (signals.contextFit > 0.7) {
      if (context.availableMinutes !== undefined && candidate.task.estimated_minutes) {
        if (candidate.task.estimated_minutes <= context.availableMinutes) {
          reasons.push(`You have enough time (${context.availableMinutes} min available)`);
        }
      }
      if (context.energy && candidate.task.energy_required) {
        if (context.energy === candidate.task.energy_required) {
          reasons.push(`It matches your current energy level (${context.energy})`);
        }
      }
    }

    // Momentum
    if (signals.momentum > 0.5) {
      if (context.activeProjectId && candidate.task.project_id === context.activeProjectId) {
        reasons.push('You were recently working on this project');
      } else if (context.recentProjectIds?.includes(candidate.task.project_id || '')) {
        reasons.push('It\'s from a project you\'ve been working on');
      }
    }

    // Effort
    if (signals.effort < 0.5 && candidate.task.estimated_minutes) {
      reasons.push(`It's a quick task (${candidate.task.estimated_minutes} min)`);
    }

    // If we have no reasons, add a default
    if (reasons.length === 0) {
      reasons.push('It\'s the highest priority task based on your goals and context');
    }

    return reasons;
  }

  /**
   * Convert candidate to recommendation
   */
  private candidateToRecommendation(
    candidate: CandidateTask,
    context: ContextSnapshot,
    rank: number = 1
  ): Recommendation {
    return {
      taskId: candidate.task.id,
      taskTitle: candidate.task.title,
      projectId: candidate.task.project_id || undefined,
      projectTitle: candidate.project?.title,
      estimatedMinutes: candidate.task.estimated_minutes || undefined,
      reasons: this.generateReasons(candidate, context),
      confidence: this.calculateConfidence(candidate),
      alternativeTaskId: rank === 1 && candidate.signals.finalScore > 0.3 ? undefined : candidate.task.id,
    };
  }

  /**
   * Calculate confidence score for a recommendation
   */
  private calculateConfidence(candidate: CandidateTask): number {
    const signals = candidate.signals;
    
    // Higher scores = higher confidence
    // But cap at 0.95 to allow for uncertainty
    const confidence = Math.min(0.95, signals.finalScore * 1.1);
    
    // If the task has high signals in multiple areas, increase confidence
    const highSignals = Object.values(signals).filter(s => s > 0.7).length;
    if (highSignals >= 3) {
      return Math.min(0.99, confidence + 0.05);
    }
    
    return confidence;
  }

  /**
   * Validate AI recommendation
   */
  private validateAIRecommendation(
    aiRec: AIRecommendation,
    candidates: CandidateTask[]
  ): AIRecommendation | null {
    // Check if selected task is in candidates
    const candidateIds = candidates.map(c => c.task.id);
    if (!candidateIds.includes(aiRec.selectedTaskId)) {
      console.warn('AI selected a task that is not in candidates, falling back to deterministic');
      return null;
    }

    // Ensure confidence is between 0 and 1
    aiRec.confidence = Math.max(0, Math.min(1, aiRec.confidence));

    return aiRec;
  }

  /**
   * Fallback to deterministic recommendation when AI fails
   */
  private fallbackToDeterministic(
    candidates: CandidateTask[],
    context: ContextSnapshot
  ): Recommendation | null {
    if (candidates.length === 0) {
      return null;
    }

    // Get the top candidate
    const topCandidate = candidates[0];
    return this.candidateToRecommendation(topCandidate, context, 1);
  }

  /**
   * Main recommendation method
   */
  async recommend(input: RecommendationEngineInput): Promise<RecommendationEngineResult> {
    const {
      tasks,
      projects,
      goals,
      dependencies,
      context,
      activeProjectId,
      recentProjectIds,
      useAI = false,
      aiProvider,
    } = input;

    // Step 1: Get candidates
    const candidateInput: CandidateEngineInput = {
      tasks,
      projects,
      goals,
      dependencies,
      context,
    };

    const candidateResult = this.candidateEngine.getCandidates(candidateInput);
    const candidates = candidateResult.candidates;

    // If no candidates, return null recommendation
    if (candidates.length === 0) {
      return {
        recommendation: null,
        candidates: [],
        topCandidates: [],
        context,
        usedAI: false,
      };
    }

    // Step 2: Score candidates
    const priorityInput: PriorityEngineInput = {
      candidates,
      context,
      activeProjectId,
      recentProjectIds,
      weights: DEFAULT_WEIGHTS,
    };

    const priorityResult = this.priorityEngine.scoreCandidates(priorityInput);
    const scoredCandidates = priorityResult.scoredTasks;
    const topCandidates = priorityResult.topCandidates;

    // Step 3: AI Arbitration (if enabled and available)
    let aiRecommendation: AIRecommendation | null = null;
    let usedAI = false;

    if (useAI && aiProvider) {
      try {
        aiRecommendation = await aiProvider.arbitrateRecommendation(
          context,
          scoredCandidates
        );
        
        // Validate AI recommendation
        const validated = this.validateAIRecommendation(aiRecommendation, scoredCandidates);
        if (validated) {
          aiRecommendation = validated;
          usedAI = true;
        }
      } catch (error) {
        console.warn('AI arbitration failed, falling back to deterministic:', error);
      }
    }

    // Step 4: Select final recommendation
    let recommendation: Recommendation | null = null;

    if (aiRecommendation && usedAI) {
      // Find the AI-selected candidate
      const selectedCandidate = scoredCandidates.find(
        c => c.task.id === aiRecommendation.selectedTaskId
      );
      
      if (selectedCandidate) {
        recommendation = this.candidateToRecommendation(selectedCandidate, context, 1);
        // Override confidence with AI confidence
        recommendation.confidence = aiRecommendation.confidence;
        recommendation.reasons = [aiRecommendation.reason];
        
        // Add alternative if provided
        if (aiRecommendation.alternativeTaskId) {
          recommendation.alternativeTaskId = aiRecommendation.alternativeTaskId;
        }
      }
    }

    // Fallback to deterministic if AI didn't work
    if (!recommendation) {
      recommendation = this.fallbackToDeterministic(scoredCandidates, context);
    }

    return {
      recommendation,
      candidates: scoredCandidates,
      topCandidates,
      context,
      usedAI,
      aiRecommendation,
    };
  }

  /**
   * Get multiple recommendations
   */
  async recommendMultiple(
    input: RecommendationEngineInput,
    count: number = 3
  ): Promise<Recommendation[]> {
    const result = await this.recommend(input);
    
    if (!result.recommendation) {
      return [];
    }

    // Return recommendations for top N candidates
    const recommendations: Recommendation[] = [];
    
    for (let i = 0; i < Math.min(count, result.topCandidates.length); i++) {
      const candidate = result.topCandidates[i];
      const rec = this.candidateToRecommendation(candidate, result.context, i + 1);
      
      // For non-top recommendations, adjust confidence
      if (i > 0) {
        rec.confidence = rec.confidence * (1 - i * 0.1);
      }
      
      recommendations.push(rec);
    }

    return recommendations;
  }

  /**
   * Check if a recommendation is still valid (task hasn't been completed, etc.)
   */
  isRecommendationValid(
    recommendation: Recommendation,
    currentTasks: Task[]
  ): boolean {
    if (!recommendation.taskId) return false;

    const task = currentTasks.find(t => t.id === recommendation.taskId);
    
    if (!task) return false;
    if (task.status === 'completed') return false;
    if (task.status === 'cancelled') return false;

    return true;
  }
}

export const recommendationEngine = new RecommendationEngine();
