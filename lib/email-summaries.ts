/**
 * Email summary generation and sending
 */

import { createServiceClient } from '@/lib/supabase/server';
import { sendEmail, generateEmailHTML } from './email';

export interface EmailSummaryData {
  userId: string;
  userEmail: string;
  userName?: string;
  competitorCount: number;
  alerts: Array<{
    id: string;
    competitorName: string;
    type: string;
    message: string;
    createdAt: string;
  }>;
  reports: Array<{
    id: string;
    competitorName: string;
    title: string;
    createdAt: string;
  }>;
  period: 'daily' | 'weekly';
}

/**
 * Generate and send email summary for a user
 */
export async function sendUserEmailSummary(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServiceClient();

    // Get user profile with email preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, name, email_frequency')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return { success: false, error: 'Profile not found' };
    }

    // Skip if email frequency is 'off' or no email
    if (profile.email_frequency === 'off' || !profile.email) {
      return { success: true }; // Not an error, just skipped
    }

    const period = profile.email_frequency as 'daily' | 'weekly';
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - (period === 'daily' ? 1 : 7));

    // Get user's competitors
    const { data: competitors } = await supabase
      .from('competitors')
      .select('id, name')
      .eq('user_id', profile.id);

    if (!competitors || competitors.length === 0) {
      return { success: true }; // No competitors, skip email
    }

    const competitorIds = competitors.map((c) => c.id);
    const competitorMap = new Map(competitors.map((c) => [c.id, c.name]));

    // Get recent alerts
    const { data: alerts } = await supabase
      .from('alerts')
      .select('id, competitor_id, type, message, created_at')
      .in('competitor_id', competitorIds)
      .gte('created_at', dateFrom.toISOString())
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get recent AI reports
    const { data: reports } = await supabase
      .from('competitor_reports')
      .select('id, competitor_id, title, created_at')
      .in('competitor_id', competitorIds)
      .gte('created_at', dateFrom.toISOString())
      .order('created_at', { ascending: false })
      .limit(3);

    // Get competitors with recent snapshots
    const { data: recentSnapshots } = await supabase
      .from('snapshots')
      .select('competitor_id, created_at')
      .in('competitor_id', competitorIds)
      .gte('created_at', dateFrom.toISOString());

    const updatedCompetitorIds = new Set(recentSnapshots?.map((s) => s.competitor_id) || []);
    const updatedCompetitorCount = updatedCompetitorIds.size;

    // Prepare email data
    const emailData: EmailSummaryData = {
      userId: profile.id,
      userEmail: profile.email,
      userName: profile.name || undefined,
      competitorCount: updatedCompetitorCount,
      alerts: (alerts || []).map((alert) => ({
        id: alert.id,
        competitorName: competitorMap.get(alert.competitor_id) || 'Unknown',
        type: alert.type,
        message: alert.message,
        createdAt: alert.created_at,
      })),
      reports: (reports || []).map((report) => ({
        id: report.id,
        competitorName: competitorMap.get(report.competitor_id) || 'Unknown',
        title: report.title,
        createdAt: report.created_at,
      })),
      period,
    };

    // Generate and send email
    const result = await generateAndSendEmailSummary(emailData);

    return result;
  } catch (error: any) {
    console.error('Error sending email summary:', error);
    return { success: false, error: error.message || 'Failed to send email summary' };
  }
}

/**
 * Generate email content and send
 */
async function generateAndSendEmailSummary(data: EmailSummaryData): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const periodLabel = data.period === 'daily' ? '24 hours' : '7 days';
  const greeting = data.userName ? `Hi ${data.userName},` : 'Hi there,';

  // Build alerts list
  let alertsHTML = '';
  if (data.alerts.length > 0) {
    alertsHTML = `
      <h3 style="font-size: 18px; margin-top: 20px; margin-bottom: 10px; color: #1f2937;">🔔 Recent Alerts</h3>
      <ul style="list-style: none; padding: 0;">
        ${data.alerts.slice(0, 5).map((alert) => `
          <li style="margin-bottom: 12px; padding: 12px; background: #f9fafb; border-left: 3px solid #667eea; border-radius: 4px;">
            <strong style="color: #667eea;">${alert.competitorName}</strong>
            <span style="text-transform: capitalize; color: #6b7280; font-size: 12px; margin-left: 8px;">${alert.type}</span>
            <p style="margin: 4px 0 0 0; color: #374151;">${alert.message}</p>
          </li>
        `).join('')}
      </ul>
      ${data.alerts.length > 5 ? `<p style="margin-top: 10px; color: #6b7280; font-size: 14px;">+ ${data.alerts.length - 5} more alerts</p>` : ''}
    `;
  } else {
    alertsHTML = '<p style="color: #6b7280;">No new alerts in the past ' + periodLabel + '.</p>';
  }

  // Build AI insights from reports
  let insightsHTML = '';
  if (data.reports.length > 0) {
    insightsHTML = `
      <h3 style="font-size: 18px; margin-top: 20px; margin-bottom: 10px; color: #1f2937;">🤖 AI Insights</h3>
      <div style="background: #f0f9ff; padding: 16px; border-radius: 6px; border-left: 4px solid #3b82f6;">
        ${data.reports.map((report) => `
          <div style="margin-bottom: 12px;">
            <strong style="color: #1e40af;">${report.competitorName}:</strong>
            <p style="margin: 4px 0; color: #1e3a8a;">${report.title}</p>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Build summary body
  const bodyHTML = `
    <h2 style="font-size: 20px; margin-bottom: 20px; color: #1f2937;">Your ${data.period === 'daily' ? 'Daily' : 'Weekly'} Competitor Summary</h2>
    
    <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 16px;">
        <strong>${data.competitorCount}</strong> competitor${data.competitorCount !== 1 ? 's' : ''} updated in the past ${periodLabel}
      </p>
      <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">
        ${data.alerts.length} new alert${data.alerts.length !== 1 ? 's' : ''} • ${data.reports.length} AI report${data.reports.length !== 1 ? 's' : ''} generated
      </p>
    </div>

    ${alertsHTML}
    ${insightsHTML}
  `;

  const emailHTML = generateEmailHTML({
    title: `${data.period === 'daily' ? 'Daily' : 'Weekly'} Competitor Summary`,
    greeting,
    body: bodyHTML,
    ctaText: 'View Dashboard',
    ctaUrl: `${appUrl}/dashboard`,
    footer: `You're receiving this because your email frequency is set to <strong>${data.period}</strong>.`,
  });

  const result = await sendEmail({
    to: data.userEmail,
    subject: `${data.period === 'daily' ? 'Daily' : 'Weekly'} Summary: ${data.competitorCount} Competitor${data.competitorCount !== 1 ? 's' : ''} Updated`,
    html: emailHTML,
  });

  return result;
}

/**
 * Send email summaries to all users based on their preferences
 */
export async function sendEmailSummariesToAllUsers(): Promise<{
  sent: number;
  skipped: number;
  errors: number;
  details: Array<{ userId: string; success: boolean; error?: string }>;
}> {
  const supabase = await createServiceClient();
  const results = {
    sent: 0,
    skipped: 0,
    errors: 0,
    details: [] as Array<{ userId: string; success: boolean; error?: string }>,
  };

  try {
    // Get all users with email frequency set (not 'off')
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, email_frequency')
      .not('email_frequency', 'eq', 'off')
      .not('email', 'is', null);

    if (error) {
      console.error('Error fetching profiles:', error);
      return results;
    }

    if (!profiles || profiles.length === 0) {
      return results;
    }

    // Determine which users should receive emails based on frequency
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    for (const profile of profiles) {
      // Skip if no email address
      if (!profile.email) {
        results.skipped++;
        results.details.push({ userId: profile.id, success: true });
        continue;
      }

      // For weekly emails, only send on Monday (or configure your preferred day)
      if (profile.email_frequency === 'weekly' && dayOfWeek !== 1) {
        results.skipped++;
        results.details.push({ userId: profile.id, success: true });
        continue;
      }

      // For daily emails, send every day
      // For weekly emails, send on Monday
      if (profile.email_frequency === 'daily' || 
          (profile.email_frequency === 'weekly' && dayOfWeek === 1)) {
        const result = await sendUserEmailSummary(profile.id);
        
        if (result.success) {
          results.sent++;
        } else {
          results.errors++;
        }
        
        results.details.push({
          userId: profile.id,
          success: result.success,
          error: result.error,
        });
      } else {
        results.skipped++;
        results.details.push({ userId: profile.id, success: true });
      }
    }

    return results;
  } catch (error: any) {
    console.error('Error sending email summaries:', error);
    return results;
  }
}

