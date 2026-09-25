// Life OS Type Definitions

export type EnergyLevel = "low" | "medium" | "high";
export type Status = "pending" | "in_progress" | "completed" | "cancelled" | "deferred";
export type GoalStatus = "active" | "completed" | "paused" | "archived";
export type ProjectStatus = "idea" | "planned" | "active" | "blocked" | "completed" | "paused" | "archived";
export type InboxItemType = "text" | "voice" | "image" | "link";
export type InboxItemStatus = "unprocessed" | "processing" | "processed" | "dismissed";
export type FocusSessionStatus = "active" | "completed" | "abandoned";
export type DecisionType = "accepted" | "skipped" | "deferred" | "rejected";
export type RecommendationType = "task" | "project" | "goal";
export type Period = "morning" | "afternoon" | "evening" | "night";
export type DeviceType = "mobile" | "desktop" | "tablet" | "unknown";
export type Connectivity = "online" | "offline";
export type Source = "user" | "system" | "inference";

// Goal
export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: GoalStatus;
  priority: number; // 1-5
  target_date: string | null;
  created_at: string;
  updated_at: string;
}

// Project
export interface Project {
  id: string;
  user_id: string;
  goal_id: string | null;
  title: string;
  description: string | null;
  status: ProjectStatus;
  target_date: string | null;
  created_at: string;
  updated_at: string;
}

// Task
export interface Task {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: Status;
  estimated_minutes: number | null;
  deadline: string | null;
  energy_required: EnergyLevel | null;
  context: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

// Task Dependency
export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  created_at: string;
}

// Inbox Item
export interface InboxItem {
  id: string;
  user_id: string;
  content: string;
  type: InboxItemType;
  status: InboxItemStatus;
  ai_interpretation: string | null;
  created_at: string;
  processed_at: string | null;
}

// Focus Session
export interface FocusSession {
  id: string;
  user_id: string;
  task_id: string | null;
  started_at: string;
  ended_at: string | null;
  planned_minutes: number | null;
  actual_minutes: number | null;
  status: FocusSessionStatus;
  created_at: string;
}

// Decision
export interface Decision {
  id: string;
  user_id: string;
  task_id: string | null;
  recommendation_type: RecommendationType;
  decision: DecisionType;
  reason: string | null;
  created_at: string;
}

// Preference
export interface Preference {
  id: string;
  user_id: string;
  key: string;
  value: string;
  confidence: number; // 0-1
  source: Source;
  updated_at: string;
}

// Profile
export interface Profile {
  id: string;
  name: string | null;
  timezone: string | null;
  created_at: string;
  updated_at: string;
}

// Context Snapshot
export interface ContextSnapshot {
  now: string;
  availableMinutes?: number;
  energy?: EnergyLevel;
  period: Period;
  device: DeviceType;
  connectivity: Connectivity;
  activeProjectId?: string;
  recentProjectIds?: string[];
  userIntention?: string;
}

// Priority Signals
export interface PrioritySignals {
  goalImpact: number;
  deadlinePressure: number;
  momentum: number;
  dependencyValue: number;
  contextFit: number;
  effort: number;
  switchingCost: number;
  finalScore: number;
}

// Candidate Task
export interface CandidateTask {
  task: Task;
  project?: Project;
  goal?: Goal;
  dependencies: TaskDependency[];
  blockingTasks: TaskDependency[];
  signals: PrioritySignals;
}

// Recommendation
export interface Recommendation {
  taskId: string;
  taskTitle: string;
  projectId?: string;
  projectTitle?: string;
  estimatedMinutes?: number;
  reasons: string[];
  confidence: number;
  alternativeTaskId?: string;
}

// AI Recommendation
export interface AIRecommendation {
  selectedTaskId: string;
  confidence: number;
  reason: string;
  alternativeTaskId?: string;
}

// AI Interpretation
export interface AIInterpretation {
  type: "task" | "project" | "goal" | "unknown";
  title: string;
  description?: string;
  confidence: number;
  additionalInfo?: Record<string, unknown>;
}

// Database Types
export interface Database {
  profile: Profile;
  goal: Goal;
  project: Project;
  task: Task;
  task_dependency: TaskDependency;
  inbox_item: InboxItem;
  focus_session: FocusSession;
  decision: Decision;
  preference: Preference;
}
