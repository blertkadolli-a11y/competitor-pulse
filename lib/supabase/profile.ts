import { supabase } from './client';

/**
 * Get the profile for the currently authenticated user
 * @returns Profile if found, null otherwise
 */
export async function getCurrentUserProfile() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  return profile;
}

/**
 * Get profile ID for the currently authenticated user
 * @returns Profile ID if found, null otherwise
 */
export async function getCurrentUserProfileId() {
  const profile = await getCurrentUserProfile();
  return profile?.id || null;
}

