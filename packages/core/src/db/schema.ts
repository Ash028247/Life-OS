import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { 
  GoalStatus, 
  ProjectStatus, 
  Status, 
  EnergyLevel,
  InboxItemType,
  InboxItemStatus,
  FocusSessionStatus,
  DecisionType,
  RecommendationType,
  Source
} from '@life-os/types';

// Profile Table
export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  name: text('name'),
  timezone: text('timezone'),
  created_at: text('created_at').notNull().default(''),
  updated_at: text('updated_at').notNull().default(''),
});

// Goals Table
export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').$type<GoalStatus>().notNull().default('active'),
  priority: integer('priority').notNull().default(3),
  target_date: text('target_date'),
  created_at: text('created_at').notNull().default(''),
  updated_at: text('updated_at').notNull().default(''),
});

// Projects Table
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  goal_id: text('goal_id'),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').$type<ProjectStatus>().notNull().default('idea'),
  target_date: text('target_date'),
  created_at: text('created_at').notNull().default(''),
  updated_at: text('updated_at').notNull().default(''),
});

// Tasks Table
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  project_id: text('project_id'),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').$type<Status>().notNull().default('pending'),
  estimated_minutes: integer('estimated_minutes'),
  deadline: text('deadline'),
  energy_required: text('energy_required').$type<EnergyLevel>(),
  context: text('context'),
  created_at: text('created_at').notNull().default(''),
  updated_at: text('updated_at').notNull().default(''),
  completed_at: text('completed_at'),
});

// Task Dependencies Table
export const taskDependencies = sqliteTable('task_dependencies', {
  id: text('id').primaryKey(),
  task_id: text('task_id').notNull(),
  depends_on_task_id: text('depends_on_task_id').notNull(),
  created_at: text('created_at').notNull().default(''),
});

// Inbox Items Table
export const inboxItems = sqliteTable('inbox_items', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  content: text('content').notNull(),
  type: text('type').$type<InboxItemType>().notNull().default('text'),
  status: text('status').$type<InboxItemStatus>().notNull().default('unprocessed'),
  ai_interpretation: text('ai_interpretation'),
  created_at: text('created_at').notNull().default(''),
  processed_at: text('processed_at'),
});

// Focus Sessions Table
export const focusSessions = sqliteTable('focus_sessions', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  task_id: text('task_id'),
  started_at: text('started_at').notNull(),
  ended_at: text('ended_at'),
  planned_minutes: integer('planned_minutes'),
  actual_minutes: integer('actual_minutes'),
  status: text('status').$type<FocusSessionStatus>().notNull().default('active'),
  created_at: text('created_at').notNull().default(''),
});

// Decisions Table
export const decisions = sqliteTable('decisions', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  task_id: text('task_id'),
  recommendation_type: text('recommendation_type').$type<RecommendationType>().notNull(),
  decision: text('decision').$type<DecisionType>().notNull(),
  reason: text('reason'),
  created_at: text('created_at').notNull().default(''),
});

// Preferences Table
export const preferences = sqliteTable('preferences', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  confidence: real('confidence').notNull().default(0.0),
  source: text('source').$type<Source>().notNull().default('user'),
  updated_at: text('updated_at').notNull().default(''),
});

// Export all tables for migrations
export const allTables = {
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
