import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "@/lib/env";

export class BackendNotConfiguredError extends Error {
  constructor() {
    super("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }
}

/**
 * A Supabase client for Server Components, Server Actions and Route Handlers,
 * acting as the signed-in user (their session lives in cookies). Create one
 * per request.
 */
export async function createSupabaseServerClient() {
  const config = supabaseConfig();
  if (!config) throw new BackendNotConfiguredError();
  const cookieStore = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components can't set cookies. The proxy refreshes the
          // session on every request, so this is safe to ignore.
        }
      },
    },
  });
}

export type ServerSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;
