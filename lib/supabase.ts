import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser/client-side Supabase client
 * Use this in client components and hooks
 * 
 * @example
 * // In a client component:
 * const supabase = createClient();
 * const { data, error } = await supabase.from('profiles').select('*');
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Export a default instance for convenience
export const supabase = createClient();
