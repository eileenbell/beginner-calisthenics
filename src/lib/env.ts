// Public Supabase settings. Both values are safe to expose to the browser:
// row level security, not the key, protects user data. The service role key
// is never read anywhere in this app.

export interface SupabasePublicConfig {
  url: string;
  key: string;
}

export function supabaseConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export function isBackendConfigured(): boolean {
  return supabaseConfig() !== null;
}
