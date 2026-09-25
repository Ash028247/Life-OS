import type { Config } from 'drizzle-kit';
import path from 'path';

export default {
  schema: './packages/core/src/db/schema.ts',
  out: './supabase/migrations',
  driver: 'better-sqlite',
  dbCredentials: {
    url: path.join(process.cwd(), 'life-os.db'),
  },
} satisfies Config;
