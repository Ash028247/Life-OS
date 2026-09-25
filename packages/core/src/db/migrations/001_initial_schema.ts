import { db } from '../database';
import { allTables } from '../schema';

// Migration to create all initial tables
export const migrateInitialSchema = async () => {
  try {
    // Create all tables
    for (const [tableName, table] of Object.entries(allTables)) {
      const createTableSQL = `CREATE TABLE IF NOT EXISTS ${tableName} (`;
      // This is handled by drizzle-kit, but we can manually create tables here if needed
    }
    
    // Create indexes for better query performance
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
      CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);
      CREATE INDEX IF NOT EXISTS idx_inbox_items_user_id ON inbox_items(user_id);
      CREATE INDEX IF NOT EXISTS idx_inbox_items_status ON inbox_items(status);
      CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_focus_sessions_task_id ON focus_sessions(task_id);
      CREATE INDEX IF NOT EXISTS idx_decisions_user_id ON decisions(user_id);
      CREATE INDEX IF NOT EXISTS idx_preferences_user_id ON preferences(user_id);
    `);
    
    console.log('Initial schema migration completed');
    return true;
  } catch (error) {
    console.error('Failed to migrate initial schema:', error);
    throw error;
  }
};
