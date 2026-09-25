import { useState, useEffect, useCallback } from 'react';
import {
  Task,
  Project,
  Goal,
  TaskDependency,
  InboxItem,
  FocusSession,
  Decision,
  Preference,
  Profile,
} from '@life-os/types';
import { db } from '../lib/db';
import { eq } from 'drizzle-orm';
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

/**
 * Hook for database operations
 */

const USER_ID = 'demo-user'; // In a real app, this would come from auth

export interface UseDatabaseResult {
  profile: Profile | null;
  goals: Goal[];
  projects: Project[];
  tasks: Task[];
  dependencies: TaskDependency[];
  inbox: InboxItem[];
  sessions: FocusSession[];
  decisions: Decision[];
  preferences: Preference[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  // CRUD operations
  createGoal: (goal: Omit<Goal, 'id' | 'created_at' | 'updated_at'>) => Promise<Goal>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<Goal>;
  deleteGoal: (id: string) => Promise<void>;
  createProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  createTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed_at'>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  createInboxItem: (item: Omit<InboxItem, 'id' | 'created_at' | 'processed_at'>) => Promise<InboxItem>;
  updateInboxItem: (id: string, updates: Partial<InboxItem>) => Promise<InboxItem>;
  deleteInboxItem: (id: string) => Promise<void>;
  createFocusSession: (session: Omit<FocusSession, 'id' | 'created_at' | 'ended_at'>) => Promise<FocusSession>;
  updateFocusSession: (id: string, updates: Partial<FocusSession>) => Promise<FocusSession>;
  deleteFocusSession: (id: string) => Promise<void>;
  createDecision: (decision: Omit<Decision, 'id' | 'created_at'>) => Promise<Decision>;
  createPreference: (preference: Omit<Preference, 'id' | 'updated_at'>) => Promise<Preference>;
  updatePreference: (key: string, value: string, confidence?: number) => Promise<Preference>;
}

export function useDatabase(): UseDatabaseResult {
  const [data, setData] = useState({
    profile: null as Profile | null,
    goals: [] as Goal[],
    projects: [] as Project[],
    tasks: [] as Task[],
    dependencies: [] as TaskDependency[],
    inbox: [] as InboxItem[],
    sessions: [] as FocusSession[],
    decisions: [] as Decision[],
    preferences: [] as Preference[],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [profile, goals, projects, tasks, dependencies, inbox, sessions, decisions, preferences] = await Promise.all([
        db.select().from(profiles).where(eq(profiles.id, USER_ID)).get(),
        db.select().from(goals).where(eq(goals.user_id, USER_ID)).all(),
        db.select().from(projects).where(eq(projects.user_id, USER_ID)).all(),
        db.select().from(tasks).where(eq(tasks.user_id, USER_ID)).all(),
        db.select().from(taskDependencies).all(),
        db.select().from(inboxItems).where(eq(inboxItems.user_id, USER_ID)).all(),
        db.select().from(focusSessions).where(eq(focusSessions.user_id, USER_ID)).all(),
        db.select().from(decisions).where(eq(decisions.user_id, USER_ID)).all(),
        db.select().from(preferences).where(eq(preferences.user_id, USER_ID)).all(),
      ]);

      setData({
        profile,
        goals,
        projects,
        tasks,
        dependencies,
        inbox,
        sessions,
        decisions,
        preferences,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // CRUD operations
  const createGoal = useCallback(async (goal: Omit<Goal, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const [newGoal] = await db.insert(goals).values({
      ...goal,
      id: crypto.randomUUID(),
      user_id: USER_ID,
      created_at: now,
      updated_at: now,
    }).returning();
    await fetchAllData();
    return newGoal;
  }, [fetchAllData]);

  const updateGoal = useCallback(async (id: string, updates: Partial<Goal>) => {
    const [updatedGoal] = await db.update(goals)
      .set({ ...updates, updated_at: new Date().toISOString() })
      .where(eq(goals.id, id))
      .returning();
    await fetchAllData();
    return updatedGoal;
  }, [fetchAllData]);

  const deleteGoal = useCallback(async (id: string) => {
    await db.delete(goals).where(eq(goals.id, id));
    await fetchAllData();
  }, [fetchAllData]);

  const createProject = useCallback(async (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const [newProject] = await db.insert(projects).values({
      ...project,
      id: crypto.randomUUID(),
      user_id: USER_ID,
      created_at: now,
      updated_at: now,
    }).returning();
    await fetchAllData();
    return newProject;
  }, [fetchAllData]);

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    const [updatedProject] = await db.update(projects)
      .set({ ...updates, updated_at: new Date().toISOString() })
      .where(eq(projects.id, id))
      .returning();
    await fetchAllData();
    return updatedProject;
  }, [fetchAllData]);

  const deleteProject = useCallback(async (id: string) => {
    await db.delete(projects).where(eq(projects.id, id));
    await fetchAllData();
  }, [fetchAllData]);

  const createTask = useCallback(async (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed_at'>) => {
    const now = new Date().toISOString();
    const [newTask] = await db.insert(tasks).values({
      ...task,
      id: crypto.randomUUID(),
      user_id: USER_ID,
      created_at: now,
      updated_at: now,
      completed_at: null,
    }).returning();
    await fetchAllData();
    return newTask;
  }, [fetchAllData]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    const [updatedTask] = await db.update(tasks)
      .set({ ...updates, updated_at: new Date().toISOString() })
      .where(eq(tasks.id, id))
      .returning();
    await fetchAllData();
    return updatedTask;
  }, [fetchAllData]);

  const deleteTask = useCallback(async (id: string) => {
    await db.delete(tasks).where(eq(tasks.id, id));
    await fetchAllData();
  }, [fetchAllData]);

  const createInboxItem = useCallback(async (item: Omit<InboxItem, 'id' | 'created_at' | 'processed_at'>) => {
    const now = new Date().toISOString();
    const [newItem] = await db.insert(inboxItems).values({
      ...item,
      id: crypto.randomUUID(),
      user_id: USER_ID,
      created_at: now,
      processed_at: null,
    }).returning();
    await fetchAllData();
    return newItem;
  }, [fetchAllData]);

  const updateInboxItem = useCallback(async (id: string, updates: Partial<InboxItem>) => {
    const [updatedItem] = await db.update(inboxItems)
      .set(updates)
      .where(eq(inboxItems.id, id))
      .returning();
    await fetchAllData();
    return updatedItem;
  }, [fetchAllData]);

  const deleteInboxItem = useCallback(async (id: string) => {
    await db.delete(inboxItems).where(eq(inboxItems.id, id));
    await fetchAllData();
  }, [fetchAllData]);

  const createFocusSession = useCallback(async (session: Omit<FocusSession, 'id' | 'created_at' | 'ended_at'>) => {
    const now = new Date().toISOString();
    const [newSession] = await db.insert(focusSessions).values({
      ...session,
      id: crypto.randomUUID(),
      user_id: USER_ID,
      created_at: now,
      ended_at: null,
    }).returning();
    await fetchAllData();
    return newSession;
  }, [fetchAllData]);

  const updateFocusSession = useCallback(async (id: string, updates: Partial<FocusSession>) => {
    const [updatedSession] = await db.update(focusSessions)
      .set(updates)
      .where(eq(focusSessions.id, id))
      .returning();
    await fetchAllData();
    return updatedSession;
  }, [fetchAllData]);

  const deleteFocusSession = useCallback(async (id: string) => {
    await db.delete(focusSessions).where(eq(focusSessions.id, id));
    await fetchAllData();
  }, [fetchAllData]);

  const createDecision = useCallback(async (decision: Omit<Decision, 'id' | 'created_at'>) => {
    const now = new Date().toISOString();
    const [newDecision] = await db.insert(decisions).values({
      ...decision,
      id: crypto.randomUUID(),
      user_id: USER_ID,
      created_at: now,
    }).returning();
    await fetchAllData();
    return newDecision;
  }, [fetchAllData]);

  const createPreference = useCallback(async (preference: Omit<Preference, 'id' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const [newPreference] = await db.insert(preferences).values({
      ...preference,
      id: crypto.randomUUID(),
      user_id: USER_ID,
      updated_at: now,
    }).returning();
    await fetchAllData();
    return newPreference;
  }, [fetchAllData]);

  const updatePreference = useCallback(async (key: string, value: string, confidence: number = 1.0) => {
    const existing = data.preferences.find(p => p.key === key);
    
    if (existing) {
      const [updatedPreference] = await db.update(preferences)
        .set({ value, confidence, updated_at: new Date().toISOString() })
        .where(eq(preferences.id, existing.id))
        .returning();
      await fetchAllData();
      return updatedPreference;
    } else {
      return createPreference({ key, value, confidence, source: 'user' });
    }
  }, [data.preferences, createPreference, fetchAllData]);

  return {
    ...data,
    loading,
    error,
    refresh: fetchAllData,
    createGoal,
    updateGoal,
    deleteGoal,
    createProject,
    updateProject,
    deleteProject,
    createTask,
    updateTask,
    deleteTask,
    createInboxItem,
    updateInboxItem,
    deleteInboxItem,
    createFocusSession,
    updateFocusSession,
    deleteFocusSession,
    createDecision,
    createPreference,
    updatePreference,
  };
}
