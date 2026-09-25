import { db } from '../packages/core/src/db/database';
import { allTables } from '../packages/core/src/db/schema';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'life-os.db');

async function runMigrations() {
  console.log('Running migrations...');
  
  const sqlite = new Database(DB_PATH);
  const migrationDb = drizzle(sqlite);
  
  try {
    // Check if migrations table exists
    const migrationsCheck = sqlite.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'
    `).get();
    
    if (!migrationsCheck) {
      sqlite.exec(`
        CREATE TABLE migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          executed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
    
    // List of migrations to run
    const migrations = [
      {
        name: '001_initial_schema',
        sql: `
          CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            name TEXT,
            timezone TEXT,
            created_at TEXT NOT NULL DEFAULT '',
            updated_at TEXT NOT NULL DEFAULT ''
          );
          
          CREATE TABLE IF NOT EXISTS goals (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            priority INTEGER NOT NULL DEFAULT 3,
            target_date TEXT,
            created_at TEXT NOT NULL DEFAULT '',
            updated_at TEXT NOT NULL DEFAULT ''
          );
          
          CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            goal_id TEXT,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'idea',
            target_date TEXT,
            created_at TEXT NOT NULL DEFAULT '',
            updated_at TEXT NOT NULL DEFAULT ''
          );
          
          CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            project_id TEXT,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            estimated_minutes INTEGER,
            deadline TEXT,
            energy_required TEXT,
            context TEXT,
            created_at TEXT NOT NULL DEFAULT '',
            updated_at TEXT NOT NULL DEFAULT '',
            completed_at TEXT
          );
          
          CREATE TABLE IF NOT EXISTS task_dependencies (
            id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL,
            depends_on_task_id TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT '',
            UNIQUE(task_id, depends_on_task_id),
            CHECK(task_id != depends_on_task_id)
          );
          
          CREATE TABLE IF NOT EXISTS inbox_items (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            content TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'text',
            status TEXT NOT NULL DEFAULT 'unprocessed',
            ai_interpretation TEXT,
            created_at TEXT NOT NULL DEFAULT '',
            processed_at TEXT
          );
          
          CREATE TABLE IF NOT EXISTS focus_sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            task_id TEXT,
            started_at TEXT NOT NULL,
            ended_at TEXT,
            planned_minutes INTEGER,
            actual_minutes INTEGER,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL DEFAULT ''
          );
          
          CREATE TABLE IF NOT EXISTS decisions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            task_id TEXT,
            recommendation_type TEXT NOT NULL,
            decision TEXT NOT NULL,
            reason TEXT,
            created_at TEXT NOT NULL DEFAULT ''
          );
          
          CREATE TABLE IF NOT EXISTS preferences (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            confidence REAL NOT NULL DEFAULT 0.0,
            source TEXT NOT NULL DEFAULT 'user',
            updated_at TEXT NOT NULL DEFAULT ''
          );
          
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
        `,
      },
    ];
    
    // Run each migration
    for (const migration of migrations) {
      const existing = sqlite.prepare(`
        SELECT * FROM migrations WHERE name = ?
      `).get(migration.name);
      
      if (!existing) {
        console.log(`Running migration: ${migration.name}`);
        sqlite.exec(migration.sql);
        sqlite.prepare(`
          INSERT INTO migrations (name) VALUES (?)
        `).run(migration.name);
      } else {
        console.log(`Migration already executed: ${migration.name}`);
      }
    }
    
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    sqlite.close();
  }
}

runMigrations();
