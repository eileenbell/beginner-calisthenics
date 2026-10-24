// Recreates the local test database: a Supabase-like auth stub, then every
// migration in supabase/migrations in filename order. LOCAL TESTING ONLY.
//
//   npm run db:local:setup
//
// Uses LOCAL_DATABASE_ADMIN_URL (default postgres://postgres:postgres@127.0.0.1:5432/postgres)
// and creates or replaces the database named in LOCAL_DATABASE_NAME (default form_local).

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

const ROOT = join(import.meta.dirname, "..", "..");
export const ADMIN_URL = process.env.LOCAL_DATABASE_ADMIN_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/postgres";
export const DB_NAME = process.env.LOCAL_DATABASE_NAME ?? "form_local";

export function databaseUrl(name = DB_NAME): string {
  const url = new URL(ADMIN_URL);
  url.pathname = `/${name}`;
  return url.toString();
}

export function migrationFiles(): string[] {
  const dir = join(ROOT, "supabase", "migrations");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => join(dir, f));
}

export async function setupDatabase(name = DB_NAME): Promise<void> {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error(`Unsafe database name: ${name}`);
  const admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();
  try {
    await admin.query(
      `select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()`,
      [name],
    );
    await admin.query(`drop database if exists ${name}`);
    await admin.query(`create database ${name}`);
  } finally {
    await admin.end();
  }

  const db = new Client({ connectionString: databaseUrl(name) });
  await db.connect();
  try {
    const files = [join(ROOT, "supabase", "local", "bootstrap.sql"), ...migrationFiles()];
    for (const file of files) {
      try {
        await db.query(readFileSync(file, "utf8"));
      } catch (error) {
        throw new Error(`Failed applying ${file}: ${(error as Error).message}`, { cause: error });
      }
    }
  } finally {
    await db.end();
  }
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  setupDatabase()
    .then(() => console.log(`Database ${DB_NAME} is ready.`))
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}
