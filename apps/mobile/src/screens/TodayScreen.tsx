import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useDatabase } from '../hooks/useDatabase';
import { useRecommendation } from '../hooks/useRecommendation';
import { EnergyLevel, Task, DecisionType } from '@life-os/types';
import { colors, typography, spacing } from '../utils/theme';
import { formatMinutes, formatDeadline } from '../utils/formatters';

/**
 * Today Screen - Main screen showing the recommended next action
 */

export const TodayScreen: React.FC = () => {
  const db = useDatabase();
  const [availableMinutes, setAvailableMinutes] = useState<number | undefined>(30);
  const [energy, setEnergy] = useState<EnergyLevel | undefined>('medium');
  const [showReasons, setShowReasons] = useState(false);

  // Get recommendation
  const { recommendation, candidates, loading, error, refresh } = useRecommendation({
    tasks: db.tasks,
    projects: db.projects,
    goals: db.goals,
    dependencies: db.dependencies,
    context: { availableMinutes, energy },
    useAI: false, // Disable AI for now
  });

  // Refresh when data changes
  useEffect(() => {
    refresh();
  }, [db.tasks, db.projects, db.goals, db.dependencies, availableMinutes, energy, refresh]);

  const handleStartTask = async (taskId: string) => {
    // Mark task as in progress
    const task = db.tasks.find(t => t.id === taskId);
    if (task) {
      await db.updateTask(taskId, { status: 'in_progress' });
    }
    
    // Record decision
    await db.createDecision({
      task_id: taskId,
      recommendation_type: 'task',
      decision: 'accepted',
      reason: 'User started task',
    });
    
    // TODO: Navigate to focus mode
    console.log('Starting task:', taskId);
  };

  const handleLater = async (taskId: string) => {
    // Record decision
    await db.createDecision({
      task_id: taskId,
      recommendation_type: 'task',
      decision: 'deferred',
      reason: 'User chose to do it later',
    });
    
    // Refresh to get new recommendation
    refresh();
  };

  const handleSkip = async (taskId: string) => {
    // Record decision
    await db.createDecision({
      task_id: taskId,
      recommendation_type: 'task',
      decision: 'skipped',
      reason: 'User skipped task',
    });
    
    // Refresh to get new recommendation
    refresh();
  };

  const handleReject = async (taskId: string) => {
    // Record decision
    await db.createDecision({
      task_id: taskId,
      recommendation_type: 'task',
      decision: 'rejected',
      reason: 'User rejected task',
    });
    
    // Refresh to get new recommendation
    refresh();
  };

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 22) return 'Good evening';
    return 'Good night';
  };

  if (db.loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading recommendation</Text>
          <Text style={styles.errorDetails}>{error.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.question}>What deserves your attention now?</Text>
        </View>

        {/* Context Controls */}
        <View style={styles.contextControls}>
          <View style={styles.contextGroup}>
            <Text style={styles.contextLabel}>Time available:</Text>
            <View style={styles.timeOptions}>
              {[10, 20, 30, 60, 120].map(minutes => (
                <TouchableOpacity
                  key={minutes}
                  style={[
                    styles.timeOption,
                    availableMinutes === minutes && styles.timeOptionActive,
                  ]}
                  onPress={() => setAvailableMinutes(minutes)}
                >
                  <Text
                    style={[
                      styles.timeOptionText,
                      availableMinutes === minutes && styles.timeOptionTextActive,
                    ]}
                  >
                    {minutes} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.contextGroup}>
            <Text style={styles.contextLabel}>Energy level:</Text>
            <View style={styles.energyOptions}>
              {(['low', 'medium', 'high'] as EnergyLevel[]).map(level => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.energyOption,
                    energy === level && styles.energyOptionActive,
                  ]}
                  onPress={() => setEnergy(level)}
                >
                  <Text
                    style={[
                      styles.energyOptionText,
                      energy === level && styles.energyOptionTextActive,
                    ]}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Finding your next action...</Text>
          </View>
        )}

        {/* No recommendation */}
        {!loading && !recommendation && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No good action found</Text>
            <Text style={styles.emptySubtext}>
              {candidates.length === 0
                ? 'You have no active tasks. Try adding some!'
                : 'None of your tasks seem like a good fit right now.'}
            </Text>
          </View>
        )}

        {/* Recommendation */}
        {!loading && recommendation && (
          <View style={styles.recommendationContainer}>
            <View style={styles.taskCard}>
              <Text style={styles.taskTitle}>{recommendation.taskTitle}</Text>
              
              {recommendation.projectTitle && (
                <Text style={styles.taskProject}>
                  Part of: {recommendation.projectTitle}
                </Text>
              )}

              <View style={styles.taskMeta}>
                {recommendation.estimatedMinutes && (
                  <Text style={styles.taskMetaItem}>
                    ~{formatMinutes(recommendation.estimatedMinutes)}
                  </Text>
                )}
                
                {db.tasks.find(t => t.id === recommendation.taskId)?.deadline && (
                  <Text style={styles.taskMetaItem}>
                    Due: {formatDeadline(db.tasks.find(t => t.id === recommendation.taskId)?.deadline)}
                  </Text>
                )}
              </View>

              {/* Why this? */}
              <TouchableOpacity
                style={styles.whyThisButton}
                onPress={() => setShowReasons(!showReasons)}
              >
                <Text style={styles.whyThisText}>
                  Why this? {showReasons ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {showReasons && (
                <View style={styles.reasonsContainer}>
                  {recommendation.reasons.map((reason, index) => (
                    <Text key={index} style={styles.reasonItem}>
                      • {reason}
                    </Text>
                  ))}
                </View>
              )}

              {/* Actions */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.startButton]}
                  onPress={() => handleStartTask(recommendation.taskId)}
                >
                  <Text style={styles.startButtonText}>Start</Text>
                </TouchableOpacity>

                <View style={styles.secondaryActions}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => handleLater(recommendation.taskId)}
                  >
                    <Text style={styles.secondaryButtonText}>Later</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => handleSkip(recommendation.taskId)}
                  >
                    <Text style={styles.secondaryButtonText}>Skip</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Alternative */}
            {recommendation.alternativeTaskId && (
              <View style={styles.alternativeContainer}>
                <Text style={styles.alternativeText}>Not this? Try:</Text>
                <Text style={styles.alternativeTask}>
                  {db.tasks.find(t => t.id === recommendation.alternativeTaskId)?.title || 'Another task'}
                </Text>
              </View>
            )}

            {/* Other candidates */}
            {candidates.length > 1 && (
              <View style={styles.otherCandidates}>
                <Text style={styles.otherCandidatesTitle}>Other options:</Text>
                {candidates.slice(1, 3).map((candidate: any, index) => (
                  <View key={index} style={styles.otherCandidateItem}>
                    <Text style={styles.otherCandidateTitle}>{candidate.task.title}</Text>
                    {candidate.task.estimated_minutes && (
                      <Text style={styles.otherCandidateMeta}>
                        ~{formatMinutes(candidate.task.estimated_minutes)} min
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    marginBottom: spacing.xl,
  },
  greeting: {
    fontSize: typography.xl,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  question: {
    fontSize: typography.lg,
    color: colors.textSecondary,
  },
  contextControls: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  contextGroup: {
    gap: spacing.sm,
  },
  contextLabel: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  timeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timeOption: {
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeOptionText: {
    fontSize: typography.sm,
    color: colors.text,
  },
  timeOptionTextActive: {
    color: colors.background,
  },
  energyOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  energyOption: {
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  energyOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  energyOptionText: {
    fontSize: typography.sm,
    color: colors.text,
    textTransform: 'capitalize',
  },
  energyOptionTextActive: {
    color: colors.background,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: typography.lg,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  errorDetails: {
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  retryButton: {
    padding: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.background,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: typography.lg,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  recommendationContainer: {
    gap: spacing.md,
  },
  taskCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  taskTitle: {
    fontSize: typography.xl,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  taskProject: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  taskMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  taskMetaItem: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  whyThisButton: {
    marginBottom: spacing.md,
  },
  whyThisText: {
    fontSize: typography.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  reasonsContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  reasonItem: {
    fontSize: typography.sm,
    color: colors.text,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  actionsContainer: {
    gap: spacing.md,
  },
  actionButton: {
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: colors.primary,
  },
  startButtonText: {
    color: colors.background,
    fontWeight: '600',
    fontSize: typography.md,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  secondaryButton: {
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '500',
  },
  alternativeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
  },
  alternativeText: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  alternativeTask: {
    color: colors.text,
    fontSize: typography.sm,
    fontWeight: '500',
  },
  otherCandidates: {
    gap: spacing.md,
  },
  otherCandidatesTitle: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  otherCandidateItem: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  otherCandidateTitle: {
    fontSize: typography.md,
    color: colors.text,
  },
  otherCandidateMeta: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
