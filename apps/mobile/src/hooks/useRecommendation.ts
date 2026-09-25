import { useState, useEffect, useCallback } from 'react';
import {
  Task,
  Project,
  Goal,
  TaskDependency,
  ContextSnapshot,
  Recommendation,
} from '@life-os/types';
import { recommendationEngine } from '@life-os/core';
import { contextEngine, ContextEngineInput } from '@life-os/core';
import { mockAIProvider } from '@life-os/ai';

/**
 * Hook for getting task recommendations
 */

export interface UseRecommendationInput {
  tasks: Task[];
  projects: Project[];
  goals: Goal[];
  dependencies: TaskDependency[];
  context?: Partial<ContextSnapshot>;
  activeProjectId?: string;
  recentProjectIds?: string[];
  useAI?: boolean;
}

export interface UseRecommendationResult {
  recommendation: Recommendation | null;
  candidates: any[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useRecommendation(input: UseRecommendationInput): UseRecommendationResult {
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const generateRecommendation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Create context snapshot
      const contextInput: ContextEngineInput = {
        now: new Date(),
        availableMinutes: input.context?.availableMinutes,
        energy: input.context?.energy,
        device: input.context?.device || 'mobile',
        connectivity: input.context?.connectivity || 'online',
        activeProjectId: input.activeProjectId,
        recentProjectIds: input.recentProjectIds,
        userIntention: input.context?.userIntention,
      };

      const snapshot = contextEngine.createSnapshot(contextInput);

      // Get recommendation
      const result = await recommendationEngine.recommend({
        tasks: input.tasks,
        projects: input.projects,
        goals: input.goals,
        dependencies: input.dependencies,
        context: snapshot,
        activeProjectId: input.activeProjectId,
        recentProjectIds: input.recentProjectIds,
        useAI: input.useAI,
        aiProvider: input.useAI ? mockAIProvider : undefined,
      });

      setRecommendation(result.recommendation);
      setCandidates(result.topCandidates);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to generate recommendation'));
      setRecommendation(null);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [
    input.tasks,
    input.projects,
    input.goals,
    input.dependencies,
    input.context,
    input.activeProjectId,
    input.recentProjectIds,
    input.useAI,
  ]);

  // Refresh on mount
  useEffect(() => {
    generateRecommendation();
  }, [generateRecommendation]);

  return {
    recommendation,
    candidates,
    loading,
    error,
    refresh: generateRecommendation,
  };
}
