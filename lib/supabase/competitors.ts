import { supabase } from './client';
import { Competitor, Snapshot, Alert, SocialLinks, ChangesSummary } from '../types';

/**
 * Get the current user's profile ID
 */
async function getProfileId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  return profile?.id || null;
}

// ==================== COMPETITORS ====================

export async function getAllCompetitors(): Promise<Competitor[]> {
  const profileId = await getProfileId();
  if (!profileId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('competitors')
    .select('*')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getCompetitorById(id: string): Promise<Competitor | null> {
  const profileId = await getProfileId();
  if (!profileId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('competitors')
    .select('*')
    .eq('id', id)
    .eq('user_id', profileId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

export async function createCompetitor(
  name: string,
  website: string,
  socialLinks?: SocialLinks
): Promise<Competitor> {
  const profileId = await getProfileId();
  if (!profileId) throw new Error('Not authenticated');

  // Check subscription limit
  const { count: currentCount } = await supabase
    .from('competitors')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', profileId);

  // Get active subscription (may not exist if table doesn't exist)
  let subscription = null;
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('plan_type')
      .eq('user_id', profileId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // If table doesn't exist (PGRST116) or no rows, that's fine
    if (!error || error.code === 'PGRST116') {
      subscription = data;
    }
  } catch (err) {
    // Table might not exist yet, that's okay - will default to free plan
    console.warn('Subscriptions table may not exist:', err);
  }

  const planType = subscription?.plan_type || 'free';
  const limits: Record<string, number> = {
    free: 0,
    basic: 10,
    pro: 30,
    enterprise: 100,
  };
  const limit = limits[planType] || 0;

  if (limit === 0) {
    throw new Error('Please upgrade to a paid plan to add competitors');
  }

  if ((currentCount || 0) >= limit) {
    throw new Error(
      `You've reached your plan limit of ${limit} competitors. Please upgrade to add more.`
    );
  }

  // Normalize website URL
  let normalizedWebsite = website.trim();
  if (!normalizedWebsite.startsWith('http://') && !normalizedWebsite.startsWith('https://')) {
    normalizedWebsite = 'https://' + normalizedWebsite;
  }

  const { data, error } = await supabase
    .from('competitors')
    .insert({
      user_id: profileId,
      name: name.trim(),
      website: normalizedWebsite,
      social_links: socialLinks || {},
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCompetitor(
  id: string,
  updates: Partial<{
    name: string;
    website: string;
    social_links: SocialLinks;
  }>
): Promise<Competitor> {
  const profileId = await getProfileId();
  if (!profileId) throw new Error('Not authenticated');

  // Normalize website URL if provided
  if (updates.website) {
    let normalizedWebsite = updates.website.trim();
    if (!normalizedWebsite.startsWith('http://') && !normalizedWebsite.startsWith('https://')) {
      normalizedWebsite = 'https://' + normalizedWebsite;
    }
    updates.website = normalizedWebsite;
  }

  const { data, error } = await supabase
    .from('competitors')
    .update(updates)
    .eq('id', id)
    .eq('user_id', profileId)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Competitor not found');
  return data;
}

export async function deleteCompetitor(id: string): Promise<void> {
  const profileId = await getProfileId();
  if (!profileId) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('competitors')
    .delete()
    .eq('id', id)
    .eq('user_id', profileId);

  if (error) throw error;
}

// ==================== SNAPSHOTS ====================

export async function getSnapshotsByCompetitor(competitorId: string): Promise<Snapshot[]> {
  const profileId = await getProfileId();
  if (!profileId) throw new Error('Not authenticated');

  // Verify competitor belongs to user
  const { data: competitor } = await supabase
    .from('competitors')
    .select('id')
    .eq('id', competitorId)
    .eq('user_id', profileId)
    .single();

  if (!competitor) throw new Error('Competitor not found');

  const { data, error } = await supabase
    .from('snapshots')
    .select('*')
    .eq('competitor_id', competitorId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createSnapshot(
  competitorId: string,
  htmlContent?: string,
  changesSummary?: ChangesSummary
): Promise<Snapshot> {
  const profileId = await getProfileId();
  if (!profileId) throw new Error('Not authenticated');

  // Verify competitor belongs to user
  const { data: competitor } = await supabase
    .from('competitors')
    .select('id')
    .eq('id', competitorId)
    .eq('user_id', profileId)
    .single();

  if (!competitor) throw new Error('Competitor not found');

  const { data, error } = await supabase
    .from('snapshots')
    .insert({
      competitor_id: competitorId,
      html_content: htmlContent,
      changes_summary: changesSummary || {},
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==================== ALERTS ====================

export async function getAlertsByCompetitor(competitorId: string): Promise<Alert[]> {
  const profileId = await getProfileId();
  if (!profileId) throw new Error('Not authenticated');

  // Verify competitor belongs to user
  const { data: competitor } = await supabase
    .from('competitors')
    .select('id')
    .eq('id', competitorId)
    .eq('user_id', profileId)
    .single();

  if (!competitor) throw new Error('Competitor not found');

  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('competitor_id', competitorId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAllAlerts(unreadOnly = false): Promise<Alert[]> {
  const profileId = await getProfileId();
  if (!profileId) throw new Error('Not authenticated');

  // Get all competitors for user
  const { data: competitors } = await supabase
    .from('competitors')
    .select('id')
    .eq('user_id', profileId);

  if (!competitors || competitors.length === 0) return [];

  const competitorIds = competitors.map((c: { id: string }) => c.id);

  let query = supabase
    .from('alerts')
    .select('*')
    .in('competitor_id', competitorIds)
    .order('created_at', { ascending: false });

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function createAlert(
  competitorId: string,
  type: Alert['type'],
  message: string
): Promise<Alert> {
  const profileId = await getProfileId();
  if (!profileId) throw new Error('Not authenticated');

  // Verify competitor belongs to user
  const { data: competitor } = await supabase
    .from('competitors')
    .select('id')
    .eq('id', competitorId)
    .eq('user_id', profileId)
    .single();

  if (!competitor) throw new Error('Competitor not found');

  const { data, error } = await supabase
    .from('alerts')
    .insert({
      competitor_id: competitorId,
      type,
      message: message.trim(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function markAlertAsRead(id: string): Promise<Alert> {
  const profileId = await getProfileId();
  if (!profileId) throw new Error('Not authenticated');

  // Verify alert belongs to user's competitor
  const { data: alert } = await supabase
    .from('alerts')
    .select(`
      *,
      competitor:competitors!inner(user_id)
    `)
    .eq('id', id)
    .single();

  if (!alert || (alert.competitor as any).user_id !== profileId) {
    throw new Error('Alert not found');
  }

  const { data, error } = await supabase
    .from('alerts')
    .update({ is_read: true })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function markAllAlertsAsRead(competitorId?: string): Promise<void> {
  const profileId = await getProfileId();
  if (!profileId) throw new Error('Not authenticated');

  let query = supabase
    .from('alerts')
    .update({ is_read: true })
    .eq('is_read', false);

  if (competitorId) {
    // Verify competitor belongs to user
    const { data: competitor } = await supabase
      .from('competitors')
      .select('id')
      .eq('id', competitorId)
      .eq('user_id', profileId)
      .single();

    if (!competitor) throw new Error('Competitor not found');
    query = query.eq('competitor_id', competitorId);
  } else {
    // Get all competitors for user
    const { data: competitors } = await supabase
      .from('competitors')
      .select('id')
      .eq('user_id', profileId);

    if (!competitors || competitors.length === 0) return;

    const competitorIds = competitors.map((c: { id: string }) => c.id);
    query = query.in('competitor_id', competitorIds);
  }

  const { error } = await query;
  if (error) throw error;
}

