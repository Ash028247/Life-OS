import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import path from 'path';
import { allTables } from './schema';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'life-os.db');

// Create database instance
const sqlite = new Database(DB_PATH);

export const db = drizzle(sqlite, { schema: allTables });

// Graceful shutdown
export const closeDatabase = () => {
  sqlite.close();
};

// Initialize database (create tables if not exist)
export const initializeDatabase = async () => {
  try {
    // Enable WAL mode for better performance
    sqlite.pragma('journal_mode = WAL');
    
    // All tables are created by drizzle-kit migrations
    // This function ensures the database is ready
    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

// Reset database (for development/testing)
export const resetDatabase = async () => {
  try {
    sqlite.exec('DROP TABLE IF EXISTS profiles');
    sqlite.exec('DROP TABLE IF EXISTS goals');
    sqlite.exec('DROP TABLE IF EXISTS projects');
    sqlite.exec('DROP TABLE IF EXISTS tasks');
    sqlite.exec('DROP TABLE IF EXISTS task_dependencies');
    sqlite.exec('DROP TABLE IF EXISTS inbox_items');
    sqlite.exec('DROP TABLE IF EXISTS focus_sessions');
    sqlite.exec('DROP TABLE IF EXISTS decisions');
    sqlite.exec('DROP TABLE IF EXISTS preferences');
    return true;
  } catch (error) {
    console.error('Failed to reset database:', error);
    throw error;
  }
};
