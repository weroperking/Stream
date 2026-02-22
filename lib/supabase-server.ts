import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Server-side Supabase client
 * Use this in Server Components, Server Actions, and API routes
 * 
 * @example
 * // In a Server Component:
 * const supabase = createClient();
 * const { data } = await supabase.from('profiles').select('*');
 * 
 * @example
 * // In a Server Action:
 * export async function getUserData() {
 *   const supabase = createClient();
 *   // ...
 * }
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from Server Component - handle the error
          }
        },
      },
    }
  );
}

/**
 * Server client with authenticated user context
 * Use this when you need to perform operations on behalf of the user
 * 
 * @example
 * const { supabase, user } = await createAuthenticatedClient();
 * if (!user) redirect('/login');
 */
export async function createAuthenticatedClient() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { supabase, user: null };
  }
  
  return { supabase, user };
}
