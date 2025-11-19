import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-project')) {
    const error = 'Missing or invalid Supabase environment variables! Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.';
    console.error(error);
    // Still create a client to prevent crashes, but it will fail on API calls
    // This allows the app to show proper error messages
    return createBrowserClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder-key'
    );
  }
  
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  
  return supabaseClient;
}

// Export a getter function instead of direct initialization
export function getSupabaseClient() {
  return createClient();
}

// For backward compatibility, export supabase but lazy-load it
export const supabase = getSupabaseClient();
