import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useDatabase } from '../hooks/useDatabase';
import { Task, FocusSession, FocusSessionStatus } from '@life-os/types';
import { colors, typography, spacing } from '../utils/theme';
import { formatMinutes } from '../utils/formatters';

/**
 * Focus Screen - Minimalist focus mode for a task
 */

export interface FocusScreenProps {
  taskId: string;
  onComplete?: () => void;
  onAbandon?: () => void;
}

export const FocusScreen: React.FC<FocusScreenProps> = ({ taskId, onComplete, onAbandon }) => {
  const db = useDatabase();
  const [task, setTask] = useState<Task | null>(null);
  const [session, setSession] = useState<FocusSession | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Get task
  useEffect(() => {
    const foundTask = db.tasks.find(t => t.id === taskId);
    if (foundTask) {
      setTask(foundTask);
    }
  }, [taskId, db.tasks]);

  // Start focus session
  useEffect(() => {
    if (task && !session) {
      const now = new Date().toISOString();
      db.createFocusSession({
        task_id: taskId,
        started_at: now,
        status: 'active',
        planned_minutes: task.estimated_minutes || null,
        actual_minutes: null,
      }).then(newSession => {
        setSession(newSession);
        setStartTime(Date.now());
      });
    }
  }, [task, session, taskId, db]);

  // Timer
  useEffect(() => {
    if (!isRunning || isPaused || !startTime) return;

    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isPaused, startTime]);

  // Format elapsed time
  const formatElapsedTime = () => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePause = useCallback(() => {
    setIsPaused(!isPaused);
  }, [isPaused]);

  const handleStuck = useCallback(() => {
    Alert.alert(
      'Stuck?',
      'What\'s blocking you?',
      [
        { text: 'Break it down', onPress: () => {} },
        { text: 'Find what\'s missing', onPress: () => {} },
        { text: 'Create smaller step', onPress: () => {} },
        { text: 'Switch task', onPress: () => {} },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, []);

  const handleFinish = useCallback(async () => {
    if (!session) return;

    setIsRunning(false);

    // Update session
    await db.updateFocusSession(session.id, {
      ended_at: new Date().toISOString(),
      actual_minutes: Math.floor(elapsedSeconds / 60),
      status: 'completed',
    });

    // Mark task as completed if it was the full estimated time
    if (task && task.estimated_minutes && elapsedSeconds >= task.estimated_minutes * 60) {
      await db.updateTask(task.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
    }

    onComplete?.();
  }, [session, elapsedSeconds, task, db, onComplete]);

  const handleAbandon = useCallback(async () => {
    if (!session) return;

    setIsRunning(false);

    // Update session
    await db.updateFocusSession(session.id, {
      ended_at: new Date().toISOString(),
      actual_minutes: Math.floor(elapsedSeconds / 60),
      status: 'abandoned',
    });

    onAbandon?.();
  }, [session, elapsedSeconds, db, onAbandon]);

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Task not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={onAbandon}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Task title */}
        <Text style={styles.taskTitle}>{task.title}</Text>

        {/* Timer */}
        <Text style={styles.timer}>
          {formatElapsedTime()}
        </Text>

        {/* Estimated time indicator */}
        {task.estimated_minutes && (
          <Text style={styles.estimatedTime}>
            Target: {formatMinutes(task.estimated_minutes)}
          </Text>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handlePause}>
            <Text style={styles.actionButtonText}>
              {isPaused ? 'Resume' : 'Pause'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleStuck}>
            <Text style={styles.actionButtonText}>I'm stuck</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.finishButton]}
            onPress={handleFinish}
          >
            <Text style={styles.finishButtonText}>Finish</Text>
          </TouchableOpacity>
        </View>

        {/* Abandon button */}
        <TouchableOpacity style={styles.abandonButton} onPress={handleAbandon}>
          <Text style={styles.abandonButtonText}>Abandon</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: typography.lg,
    color: colors.error,
    marginBottom: spacing.md,
  },
  backButton: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  backButtonText: {
    color: colors.text,
    fontWeight: '500',
  },
  taskTitle: {
    fontSize: typography.xxl,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xxl * 2,
  },
  timer: {
    fontSize: typography.xxxl,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.md,
  },
  estimatedTime: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xxl * 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  actionButton: {
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    color: colors.text,
    fontWeight: '500',
  },
  finishButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  finishButtonText: {
    color: colors.background,
    fontWeight: '600',
  },
  abandonButton: {
    padding: spacing.md,
  },
  abandonButtonText: {
    color: colors.error,
    fontSize: typography.sm,
    fontWeight: '500',
  },
});
