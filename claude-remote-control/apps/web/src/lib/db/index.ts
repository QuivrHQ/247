import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Lazy initialization to avoid errors during build when env vars aren't available
let _sql: NeonQueryFunction<false, false> | null = null;
let _db: NeonHttpDatabase<typeof schema> | null = null;

function getSQL() {
  if (!_sql) {
    _sql = neon(process.env.DATABASE_URL!);
  }
  return _sql;
}

export function getDb() {
  if (!_db) {
    _db = drizzle(getSQL(), { schema });
  }
  return _db;
}

// For backwards compatibility - will throw at runtime if env vars missing
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop) {
    return getDb()[prop as keyof NeonHttpDatabase<typeof schema>];
  },
});

export * from './schema';
