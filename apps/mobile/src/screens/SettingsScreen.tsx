import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useDatabase } from '../hooks/useDatabase';
import { colors, typography, spacing } from '../utils/theme';

/**
 * Settings Screen - User settings and profile
 */

export const SettingsScreen: React.FC = () => {
  const db = useDatabase();

  const handleResetData = () => {
    Alert.alert(
      'Reset Data',
      'Are you sure you want to reset all your data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement data reset
            Alert.alert('Not implemented', 'Data reset is not yet implemented');
          },
        },
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert('Not implemented', 'Data export is not yet implemented');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This will permanently delete all your data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement account deletion
            Alert.alert('Not implemented', 'Account deletion is not yet implemented');
          },
        },
      ]
    );
  };

  // Calculate stats
  const totalTasks = db.tasks.length;
  const completedTasks = db.tasks.filter(t => t.status === 'completed').length;
  const activeProjects = db.projects.filter(p => p.status === 'active').length;
  const totalFocusTime = db.sessions
    .filter(s => s.actual_minutes)
    .reduce((sum, s) => sum + (s.actual_minutes || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Profile section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          
          {db.profile ? (
            <View style={styles.profileCard}>
              <Text style={styles.profileName}>{db.profile.name || 'Unknown'}</Text>
              {db.profile.timezone && (
                <Text style={styles.profileTimezone}>
                  Timezone: {db.profile.timezone}
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.profileCard}>
              <Text style={styles.profileName}>No profile</Text>
            </View>
          )}
        </View>

        {/* Stats section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Activity</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalTasks}</Text>
              <Text style={styles.statLabel}>Total Tasks</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{completedTasks}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{activeProjects}</Text>
              <Text style={styles.statLabel}>Active Projects</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalFocusTime} min</Text>
              <Text style={styles.statLabel}>Focus Time</Text>
            </View>
          </View>
        </View>

        {/* Preferences section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          {db.preferences.length === 0 ? (
            <Text style={styles.emptyText}>No preferences set</Text>
          ) : (
            db.preferences.map(pref => (
              <View key={pref.id} style={styles.preferenceItem}>
                <Text style={styles.preferenceKey}>{pref.key}</Text>
                <Text style={styles.preferenceValue}>{pref.value}</Text>
              </View>
            ))
          )}
        </View>

        {/* Data section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          
          <TouchableOpacity style={styles.dataAction} onPress={handleExportData}>
            <Text style={styles.dataActionText}>Export Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.dataAction} onPress={handleResetData}>
            <Text style={[styles.dataActionText, styles.destructiveText]}>
              Reset Data
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.dataAction} onPress={handleDeleteAccount}>
            <Text style={[styles.dataActionText, styles.destructiveText]}>
              Delete Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* App info section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>Life OS</Text>
            <Text style={styles.infoSubtext}>Version 1.0.0</Text>
          </View>
        </View>
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
  },
  section: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.text,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileName: {
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  profileTimezone: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: typography.xxl,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  preferenceItem: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  preferenceKey: {
    fontSize: typography.sm,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  preferenceValue: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  dataAction: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dataActionText: {
    fontSize: typography.md,
    color: colors.text,
  },
  destructiveText: {
    color: colors.error,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoText: {
    fontSize: typography.md,
    fontWeight: '600',
    color: colors.text,
  },
  infoSubtext: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
});
