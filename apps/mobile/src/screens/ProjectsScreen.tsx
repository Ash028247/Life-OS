import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { useDatabase } from '../hooks/useDatabase';
import { Project, ProjectStatus } from '@life-os/types';
import { colors, typography, spacing } from '../utils/theme';
import { formatStatus } from '../utils/formatters';

/**
 * Projects Screen - List all user projects
 */

export const ProjectsScreen: React.FC = () => {
  const db = useDatabase();
  const [activeFilter, setActiveFilter] = useState<ProjectStatus | 'all'>('all');

  // Filter projects
  const filteredProjects = activeFilter === 'all'
    ? db.projects
    : db.projects.filter(p => p.status === activeFilter);

  // Group projects by status
  const projectsByStatus: Record<ProjectStatus, Project[]> = {
    idea: [],
    planned: [],
    active: [],
    blocked: [],
    completed: [],
    paused: [],
    archived: [],
  };

  db.projects.forEach(project => {
    projectsByStatus[project.status].push(project);
  });

  // Get task count for each project
  const getTaskCount = (projectId: string) => {
    return db.tasks.filter(t => t.project_id === projectId).length;
  };

  // Get completed task count for each project
  const getCompletedTaskCount = (projectId: string) => {
    return db.tasks.filter(t => t.project_id === projectId && t.status === 'completed').length;
  };

  // Get goal title for project
  const getGoalTitle = (goalId: string | null) => {
    if (!goalId) return 'No goal';
    const goal = db.goals.find(g => g.id === goalId);
    return goal?.title || 'Unknown goal';
  };

  const renderProjectItem = ({ item }: { item: Project }) => {
    const taskCount = getTaskCount(item.id);
    const completedCount = getCompletedTaskCount(item.id);
    const progress = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

    return (
      <TouchableOpacity style={styles.projectCard}>
        <View style={styles.projectHeader}>
          <Text style={styles.projectTitle}>{item.title}</Text>
          <Text style={[styles.projectStatus, getStatusColor(item.status)]}>
            {formatStatus(item.status)}
          </Text>
        </View>
        
        {item.description && (
          <Text style={styles.projectDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.projectMeta}>
          <Text style={styles.projectMetaItem}>
            Goal: {getGoalTitle(item.goal_id)}
          </Text>
          <Text style={styles.projectMetaItem}>
            {taskCount} tasks • {progress}% complete
          </Text>
        </View>

        {item.target_date && (
          <Text style={styles.projectDeadline}>
            Target: {new Date(item.target_date).toLocaleDateString()}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const getStatusColor = (status: ProjectStatus) => {
    const statusColors: Record<ProjectStatus, { color: string; backgroundColor: string }> = {
      idea: { color: colors.textSecondary, backgroundColor: colors.backgroundSecondary },
      planned: { color: colors.info, backgroundColor: colors.info + '20' },
      active: { color: colors.primary, backgroundColor: colors.primary + '20' },
      blocked: { color: colors.error, backgroundColor: colors.error + '20' },
      completed: { color: colors.success, backgroundColor: colors.success + '20' },
      paused: { color: colors.warning, backgroundColor: colors.warning + '20' },
      archived: { color: colors.textSecondary, backgroundColor: colors.backgroundSecondary },
    };
    return { color: statusColors[status].color };
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Projects</Text>
          <Text style={styles.subtitle}>
            {db.projects.length} projects total
          </Text>
        </View>

        {/* Filter tabs */}
        <View style={styles.filterTabs}>
          {(['all', 'active', 'planned', 'blocked', 'completed', 'paused', 'archived'] as const).map(filter => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterTab,
                activeFilter === filter && styles.filterTabActive,
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  activeFilter === filter && styles.filterTabTextActive,
                ]}
              >
                {formatStatus(filter)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Project count by status */}
        <View style={styles.statusSummary}>
          {(['active', 'planned', 'blocked', 'completed'] as ProjectStatus[]).map(status => {
            const count = projectsByStatus[status].length;
            if (count === 0) return null;
            return (
              <View key={status} style={styles.statusSummaryItem}>
                <Text style={[styles.statusSummaryText, getStatusColor(status).color]}>
                  {formatStatus(status)}: {count}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Projects list */}
        {filteredProjects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeFilter === 'all'
                ? 'No projects yet'
                : `No projects with status "${formatStatus(activeFilter)}"`}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeFilter === 'all'
                ? 'Start by creating your first project'
                : 'Try changing the filter'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredProjects}
            renderItem={renderProjectItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
          />
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
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.xxl,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.md,
    color: colors.textSecondary,
  },
  filterTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  filterTab: {
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: typography.sm,
    color: colors.text,
  },
  filterTabTextActive: {
    color: colors.background,
  },
  statusSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statusSummaryItem: {
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
  },
  statusSummaryText: {
    fontSize: typography.sm,
    color: colors.text,
  },
  listContainer: {
    gap: spacing.md,
  },
  listSeparator: {
    height: spacing.md,
  },
  projectCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  projectTitle: {
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  projectStatus: {
    fontSize: typography.xs,
    padding: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 4,
    textTransform: 'capitalize',
  },
  projectDescription: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  projectMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  projectMetaItem: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  projectDeadline: {
    fontSize: typography.xs,
    color: colors.textTertiary,
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
});
