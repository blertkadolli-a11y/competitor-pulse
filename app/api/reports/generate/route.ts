import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Initialize OpenAI only if API key is available
let openai: any = null;
try {
  if (process.env.OPENAI_API_KEY) {
    const OpenAI = require('openai').default;
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
} catch (e) {
  console.log('OpenAI not available, will use fallback summaries');
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const type = body?.type;

    if (!type || (type !== 'daily' && type !== 'weekly')) {
      return NextResponse.json(
        { error: 'Invalid report type. Must be "daily" or "weekly"' },
        { status: 400 }
      );
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Calculate date range
    const now = new Date();
    const dateRangeEnd = new Date(now);
    const dateRangeStart = new Date(now);
    dateRangeStart.setDate(now.getDate() - (type === 'daily' ? 1 : 7));

    // Get all competitors for the user
    const { data: competitors } = await supabase
      .from('competitors')
      .select('id, name')
      .eq('user_id', profile.id);

    if (!competitors || competitors.length === 0) {
      // Create a report even if no competitors
      const content = `No competitors added yet.

Add competitors to start tracking their websites and receive detailed reports.

Date range: ${dateRangeStart.toLocaleDateString()} - ${dateRangeEnd.toLocaleDateString()}`;

      const { data: report, error: insertError } = await supabase
        .from('reports')
        .insert({
          user_id: profile.id,
          report_type: type,
          content,
          date_range_start: dateRangeStart.toISOString(),
          date_range_end: dateRangeEnd.toISOString(),
        })
        .select()
        .single();

      if (insertError || !report) {
        console.error('Error creating report:', insertError);
        return NextResponse.json(
          { error: 'Failed to create report' },
          { status: 500 }
        );
      }

      return NextResponse.json(report);
    }

    const competitorIds = competitors.map((c) => c.id);

    // Get alerts in date range (using new alerts table structure)
    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select('*, competitor:competitors(name)')
      .in('competitor_id', competitorIds)
      .gte('created_at', dateRangeStart.toISOString())
      .lte('created_at', dateRangeEnd.toISOString())
      .order('created_at', { ascending: false });

    if (alertsError) {
      console.error('Error fetching alerts:', alertsError);
    }

    // Get snapshots in date range
    const { data: snapshots, error: snapshotsError } = await supabase
      .from('snapshots')
      .select('*, competitor:competitors(name)')
      .in('competitor_id', competitorIds)
      .gte('created_at', dateRangeStart.toISOString())
      .lte('created_at', dateRangeEnd.toISOString())
      .order('created_at', { ascending: false });

    if (snapshotsError) {
      console.error('Error fetching snapshots:', snapshotsError);
    }

    // Also check for old changes table if it exists (for backward compatibility)
    let changes: any[] = [];
    try {
      const { data: changesData } = await supabase
        .from('changes')
        .select('*, competitor:competitors(name)')
        .in('competitor_id', competitorIds)
        .gte('created_at', dateRangeStart.toISOString())
        .lte('created_at', dateRangeEnd.toISOString())
        .order('created_at', { ascending: false });
      changes = changesData || [];
    } catch (e) {
      // Changes table might not exist, that's okay
      console.log('Changes table not available, using alerts and snapshots');
    }

    // Combine all activity
    const allActivity: any[] = [];
    
    // Add alerts
    if (alerts && Array.isArray(alerts) && alerts.length > 0) {
      alerts.forEach((alert: any) => {
        if (alert && alert.message && alert.type && alert.created_at) {
          allActivity.push({
            type: 'alert',
            competitor: alert.competitor?.name || 'Unknown',
            description: alert.message || 'No description',
            change_type: alert.type || 'other',
            created_at: alert.created_at,
          });
        }
      });
    }

    // Add changes (if available)
    if (changes && Array.isArray(changes) && changes.length > 0) {
      changes.forEach((change: any) => {
        if (change && change.description && change.change_type && change.created_at) {
          allActivity.push({
            type: 'change',
            competitor: change.competitor?.name || 'Unknown',
            description: change.description || 'No description',
            change_type: change.change_type || 'other',
            created_at: change.created_at,
          });
        }
      });
    }

    if (allActivity.length === 0) {
      // Create a simple report
      const content = `No changes detected for your competitors during this ${type} period.

Competitors monitored: ${competitors.length}
Snapshots created: ${snapshots?.length || 0}
Date range: ${dateRangeStart.toLocaleDateString()} - ${dateRangeEnd.toLocaleDateString()}

All competitors are being monitored regularly. Check back soon for updates!`;

      const { data: report, error: insertError } = await supabase
        .from('reports')
        .insert({
          user_id: profile.id,
          report_type: type,
          content,
          date_range_start: dateRangeStart.toISOString(),
          date_range_end: dateRangeEnd.toISOString(),
        })
        .select()
        .single();

      if (insertError || !report) {
        console.error('Error creating report:', insertError);
        return NextResponse.json(
          { error: 'Failed to create report' },
          { status: 500 }
        );
      }

      return NextResponse.json(report);
    }

    // Generate AI summary
    const changesSummary = allActivity
      .map((activity: any) => {
        if (!activity || !activity.competitor || !activity.description) {
          return null;
        }
        return `- ${activity.competitor}: ${activity.description} (${activity.change_type || 'other'})`;
      })
      .filter((item: any) => item !== null)
      .join('\n');

    const prompt = `You are an expert competitive intelligence analyst. Generate a concise ${type} report based on the following competitor changes:

${changesSummary}

Please provide:
1. An executive summary (2-3 sentences)
2. Key insights and trends
3. Notable changes by competitor
4. Recommendations

Format the report in a clear, professional manner.`;

    let aiSummary = '';
    
    // Try to generate AI summary if OpenAI is available
    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content:
                'You are an expert competitive intelligence analyst. Generate concise, actionable reports.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 1000,
        });

        if (completion && completion.choices && completion.choices.length > 0) {
          const message = completion.choices[0]?.message;
          if (message && message.content) {
            aiSummary = message.content;
          }
        }
      } catch (aiError: any) {
        console.error('Error generating AI summary:', aiError);
      }
    }

    // Fallback to manual summary (works even without OpenAI API key)
    if (!aiSummary) {
      aiSummary = `This ${type} report covers ${allActivity.length} activity item${allActivity.length !== 1 ? 's' : ''} across ${competitors.length} competitor${competitors.length > 1 ? 's' : ''}.

Key Activity:
${changesSummary}

For more details, please visit your dashboard.`;
    }

    const content = `${aiSummary}

---

Detailed Activity:
${allActivity
  .filter((activity: any) => activity && activity.competitor && activity.description)
  .map((activity: any, idx: number) => {
    try {
      return `${idx + 1}. ${activity.competitor}: ${activity.description}
   Type: ${activity.change_type || 'other'}
   Date: ${activity.created_at ? new Date(activity.created_at).toLocaleDateString() : 'Unknown'}`;
    } catch (e) {
      return null;
    }
  })
  .filter((item: any) => item !== null)
  .join('\n\n')}

---

Report generated: ${new Date().toLocaleString()}
Date range: ${dateRangeStart.toLocaleDateString()} - ${dateRangeEnd.toLocaleDateString()}
Competitors monitored: ${competitors.length}
Total activity items: ${allActivity.length}`;

    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        user_id: profile.id,
        report_type: type,
        content,
        date_range_start: dateRangeStart.toISOString(),
        date_range_end: dateRangeEnd.toISOString(),
      })
      .select()
      .single();

    if (reportError) {
      console.error('Error creating report:', reportError);
      return NextResponse.json(
        { error: reportError.message || 'Failed to create report' },
        { status: 500 }
      );
    }

    if (!report) {
      console.error('Report insert returned null');
      return NextResponse.json(
        { error: 'Failed to create report - no data returned' },
        { status: 500 }
      );
    }

    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate report' },
      { status: 500 }
    );
  }
}

