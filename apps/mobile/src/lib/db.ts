import { db } from '@life-os/core';
import {
  profiles,
  goals,
  projects,
  tasks,
  taskDependencies,
  inboxItems,
  focusSessions,
  decisions,
  preferences,
} from '@life-os/core';

// Re-export database and tables for mobile app
export {
  db,
  profiles,
  goals,
  projects,
  tasks,
  taskDependencies,
  inboxItems,
  focusSessions,
  decisions,
  preferences,
};

// Mobile-specific database utilities
export const mobileDb = {
  // Get all data for a user
  async getUserData(userId: string) {
    const [userProfile, userGoals, userProjects, userTasks, userDependencies, userInbox, userSessions, userDecisions, userPreferences] = await Promise.all([
      db.select().from(profiles).where(eq(profiles.id, userId)).get(),
      db.select().from(goals).where(eq(goals.user_id, userId)).all(),
      db.select().from(projects).where(eq(projects.user_id, userId)).all(),
      db.select().from(tasks).where(eq(tasks.user_id, userId)).all(),
      db.select().from(taskDependencies).where(eq(taskDependencies.task_id, userId)).all(),
      db.select().from(inboxItems).where(eq(inboxItems.user_id, userId)).all(),
      db.select().from(focusSessions).where(eq(focusSessions.user_id, userId)).all(),
      db.select().from(decisions).where(eq(decisions.user_id, userId)).all(),
      db.select().from(preferences).where(eq(preferences.user_id, userId)).all(),
    ]);

    return {
      profile: userProfile,
      goals: userGoals,
      projects: userProjects,
      tasks: userTasks,
      dependencies: userDependencies,
      inbox: userInbox,
      sessions: userSessions,
      decisions: userDecisions,
      preferences: userPreferences,
    };
  },
};

// Helper for drizzle equality
import { eq } from 'drizzle-orm';
