// LOCAL TESTING ONLY. These values are public on purpose: they only work with
// the local stand-in in this folder, never with a hosted Supabase project.

export const LOCAL_SUPABASE_PORT = Number(process.env.LOCAL_SUPABASE_PORT ?? 54321);
export const LOCAL_SUPABASE_URL = `http://127.0.0.1:${LOCAL_SUPABASE_PORT}`;
export const LOCAL_JWT_SECRET = "form-local-only-jwt-secret-never-use-in-production";

/** HS256 JWT with role "anon", signed with LOCAL_JWT_SECRET. */
export const LOCAL_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6ImZvcm0tbG9jYWwiLCJpYXQiOjE3OTI4MDAwMDAsImV4cCI6MjEwODE2MDAwMH0.FUhDiqPWNFlZbIUYf_6t7BmOIBAQKrZV9DQTtbKbGWY";
