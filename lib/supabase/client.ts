import { createBrowserClient } from '@supabase/ssr';
import {
  getSupabaseUrl,
  getSupabaseAnonKey,
  hasSupabaseConfig,
} from '@/lib/supabase/env';

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  if (!hasSupabaseConfig()) {
    const error =
      'Missing or invalid Supabase environment variables! Please set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY).';
    console.error(error);
    return createBrowserClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder-key'
    );
  }

  if (!supabaseClient) {
    supabaseClient = createBrowserClient(supabaseUrl!, supabaseAnonKey!);
  }

  return supabaseClient;
}

// Export a getter function instead of direct initialization
export function getSupabaseClient() {
  return createClient();
}

// For backward compatibility, export supabase but lazy-load it
export const supabase = getSupabaseClient();
