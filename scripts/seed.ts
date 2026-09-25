import { db } from '../packages/core/src/db/database';
import { 
  goals, 
  projects, 
  tasks, 
  taskDependencies,
  profiles
} from '../packages/core/src/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const USER_ID = 'demo-user';

async function seedDatabase() {
  console.log('Seeding database...');
  
  try {
    // Clear existing data for demo user
    await db.delete(taskDependencies).where(eq(taskDependencies.task_id, USER_ID));
    await db.delete(tasks).where(eq(tasks.user_id, USER_ID));
    await db.delete(projects).where(eq(projects.user_id, USER_ID));
    await db.delete(goals).where(eq(goals.user_id, USER_ID));
    await db.delete(profiles).where(eq(profiles.id, USER_ID));
    
    // Create profile
    const profileId = uuidv4();
    await db.insert(profiles).values({
      id: profileId,
      name: 'Demo User',
      timezone: 'UTC',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    // Create goals
    const buildLifeOSGoalId = uuidv4();
    await db.insert(goals).values({
      id: buildLifeOSGoalId,
      user_id: profileId,
      title: 'Build Life OS',
      description: 'Create a personal life operating system to help people decide what to do next',
      status: 'active',
      priority: 5,
      target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    const learnGoalId = uuidv4();
    await db.insert(goals).values({
      id: learnGoalId,
      user_id: profileId,
      title: 'Learn new skills',
      description: 'Continuously learn and improve skills',
      status: 'active',
      priority: 3,
      target_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    // Create projects
    const mvpProjectId = uuidv4();
    await db.insert(projects).values({
      id: mvpProjectId,
      user_id: profileId,
      goal_id: buildLifeOSGoalId,
      title: 'Life OS MVP',
      description: 'Minimum Viable Product for Life OS',
      status: 'active',
      target_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days from now
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    const personalLearningProjectId = uuidv4();
    await db.insert(projects).values({
      id: personalLearningProjectId,
      user_id: profileId,
      goal_id: learnGoalId,
      title: 'Personal Learning',
      description: 'Self-directed learning projects',
      status: 'active',
      target_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    // Create tasks for Life OS MVP project
    const todayScreenTaskId = uuidv4();
    await db.insert(tasks).values({
      id: todayScreenTaskId,
      user_id: profileId,
      project_id: mvpProjectId,
      title: 'Design Today screen',
      description: 'Create the main screen that shows the recommended next action',
      status: 'pending',
      estimated_minutes: 120,
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
      energy_required: 'high',
      context: 'design',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    });
    
    const authTaskId = uuidv4();
    await db.insert(tasks).values({
      id: authTaskId,
      user_id: profileId,
      project_id: mvpProjectId,
      title: 'Implement authentication',
      description: 'Set up user authentication system',
      status: 'pending',
      estimated_minutes: 180,
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      energy_required: 'high',
      context: 'backend',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    });
    
    const dbTaskId = uuidv4();
    await db.insert(tasks).values({
      id: dbTaskId,
      user_id: profileId,
      project_id: mvpProjectId,
      title: 'Create database schema',
      description: 'Design and implement the database structure',
      status: 'completed',
      estimated_minutes: 90,
      deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      energy_required: 'medium',
      context: 'backend',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });
    
    const captureTaskId = uuidv4();
    await db.insert(tasks).values({
      id: captureTaskId,
      user_id: profileId,
      project_id: mvpProjectId,
      title: 'Build capture functionality',
      description: 'Allow users to quickly capture ideas and tasks',
      status: 'pending',
      estimated_minutes: 60,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      energy_required: 'medium',
      context: 'mobile',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    });
    
    const docsTaskId = uuidv4();
    await db.insert(tasks).values({
      id: docsTaskId,
      user_id: profileId,
      project_id: mvpProjectId,
      title: 'Write documentation',
      description: 'Document the project architecture and features',
      status: 'pending',
      estimated_minutes: 120,
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
      energy_required: 'medium',
      context: 'documentation',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    });
    
    // Create tasks for Personal Learning project
    const reactTaskId = uuidv4();
    await db.insert(tasks).values({
      id: reactTaskId,
      user_id: profileId,
      project_id: personalLearningProjectId,
      title: 'Learn React Native animations',
      description: 'Study and practice React Native animation techniques',
      status: 'pending',
      estimated_minutes: 45,
      deadline: null,
      energy_required: 'medium',
      context: 'learning',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    });
    
    const typescriptTaskId = uuidv4();
    await db.insert(tasks).values({
      id: typescriptTaskId,
      user_id: profileId,
      project_id: personalLearningProjectId,
      title: 'Practice TypeScript patterns',
      description: 'Learn advanced TypeScript patterns and best practices',
      status: 'pending',
      estimated_minutes: 30,
      deadline: null,
      energy_required: 'low',
      context: 'learning',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    });
    
    // Create task dependencies
    // Database must be created before authentication
    await db.insert(taskDependencies).values({
      id: uuidv4(),
      task_id: authTaskId,
      depends_on_task_id: dbTaskId,
      created_at: new Date().toISOString(),
    });
    
    // Today screen depends on authentication
    await db.insert(taskDependencies).values({
      id: uuidv4(),
      task_id: todayScreenTaskId,
      depends_on_task_id: authTaskId,
      created_at: new Date().toISOString(),
    });
    
    // Capture depends on authentication
    await db.insert(taskDependencies).values({
      id: uuidv4(),
      task_id: captureTaskId,
      depends_on_task_id: authTaskId,
      created_at: new Date().toISOString(),
    });
    
    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
