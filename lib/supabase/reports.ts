/**
 * Supabase helper functions for competitor reports
 */

import { supabase } from './client';
import { CompetitorReport } from '../types';

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

/**
 * Get all competitor reports for the logged-in user
 */
export async function getAllCompetitorReports(
  competitorId?: string,
  dateFrom?: Date,
  dateTo?: Date
): Promise<CompetitorReport[]> {
  const profileId = await getProfileId();
  if (!profileId) throw new Error('Not authenticated');

  let query = supabase
    .from('competitor_reports')
    .select(`
      *,
      competitor:competitors!inner(
        id,
        name,
        user_id
      )
    `)
    .eq('competitor.user_id', profileId)
    .order('created_at', { ascending: false });

  if (competitorId) {
    query = query.eq('competitor_id', competitorId);
  }

  if (dateFrom) {
    query = query.gte('created_at', dateFrom.toISOString());
  }

  if (dateTo) {
    query = query.lte('created_at', dateTo.toISOString());
  }

  const { data, error } = await query;

  if (error) throw error;

  // Transform the data to match CompetitorReport interface
  return (data || []).map((item: any) => ({
    id: item.id,
    competitor_id: item.competitor_id,
    title: item.title,
    content: item.content,
    created_at: item.created_at,
  }));
}

/**
 * Get reports for a specific competitor
 */
export async function getReportsByCompetitor(
  competitorId: string
): Promise<CompetitorReport[]> {
  return getAllCompetitorReports(competitorId);
}

/**
 * Get a single report by ID
 */
export async function getReportById(reportId: string): Promise<CompetitorReport | null> {
  const profileId = await getProfileId();
  if (!profileId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('competitor_reports')
    .select(`
      *,
      competitor:competitors!inner(
        id,
        user_id
      )
    `)
    .eq('id', reportId)
    .eq('competitor.user_id', profileId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return {
    id: data.id,
    competitor_id: data.competitor_id,
    title: data.title,
    content: data.content,
    created_at: data.created_at,
  };
}

/**
 * Create a new competitor report
 */
export async function createCompetitorReport(
  competitorId: string,
  title: string,
  content: string
): Promise<CompetitorReport> {
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
    .from('competitor_reports')
    .insert({
      competitor_id: competitorId,
      title,
      content,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a competitor report
 */
export async function deleteCompetitorReport(reportId: string): Promise<void> {
  const profileId = await getProfileId();
  if (!profileId) throw new Error('Not authenticated');

  // Verify report belongs to user's competitor
  const { data: report } = await supabase
    .from('competitor_reports')
    .select(`
      id,
      competitor:competitors!inner(
        id,
        user_id
      )
    `)
    .eq('id', reportId)
    .single();

  if (!report || (report.competitor as any).user_id !== profileId) {
    throw new Error('Report not found');
  }

  const { error } = await supabase
    .from('competitor_reports')
    .delete()
    .eq('id', reportId);

  if (error) throw error;
}

