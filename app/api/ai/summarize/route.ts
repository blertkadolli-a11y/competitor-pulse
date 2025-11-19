import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const { competitorId, days = 7 } = await req.json();

    if (!competitorId) {
      return NextResponse.json(
        { error: 'Competitor ID is required' },
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

    // Verify user owns this competitor
    const { data: competitor } = await supabase
      .from('competitors')
      .select('id, name, website')
      .eq('id', competitorId)
      .eq('user_id', profile.id)
      .single();

    if (!competitor) {
      return NextResponse.json(
        { error: 'Competitor not found' },
        { status: 404 }
      );
    }

    // Get changes in the specified period
    const dateRangeStart = new Date();
    dateRangeStart.setDate(dateRangeStart.getDate() - days);

    const { data: changes } = await supabase
      .from('changes')
      .select('*')
      .eq('competitor_id', competitorId)
      .gte('created_at', dateRangeStart.toISOString())
      .order('created_at', { ascending: false });

    if (!changes || changes.length === 0) {
      return NextResponse.json({
        summary: `No significant changes detected for ${competitor.name} in the last ${days} days.`,
        competitor_id: competitorId,
        period_days: days,
      });
    }

    // Generate AI summary
    const changesText = changes
      .map((change, idx) => {
        return `${idx + 1}. ${change.change_type.toUpperCase()}: ${change.description}
   Date: ${new Date(change.created_at).toLocaleDateString()}`;
      })
      .join('\n\n');

    const prompt = `Analyze the following competitor activity for ${competitor.name} (${competitor.website}) over the last ${days} days:

${changesText}

Provide a concise AI summary that:
1. Highlights the most significant changes
2. Identifies trends or patterns
3. Explains potential implications
4. Suggests what to monitor next

Keep it professional and actionable (200-300 words).`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert competitive intelligence analyst. Provide concise, actionable insights.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 500,
    });

    const summaryText = completion.choices[0]?.message?.content || 'Unable to generate summary.';

    // Save AI summary
    const periodEnd = new Date();
    const { data: aiSummary } = await supabase
      .from('ai_summaries')
      .insert({
        competitor_id: competitorId,
        summary_text: summaryText,
        period_start: dateRangeStart.toISOString(),
        period_end: periodEnd.toISOString(),
      })
      .select()
      .single();

    return NextResponse.json({
      summary: summaryText,
      competitor_id: competitorId,
      period_days: days,
      changes_count: changes.length,
      ai_summary_id: aiSummary?.id,
    });
  } catch (error: any) {
    console.error('Error generating AI summary:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate summary' },
      { status: 500 }
    );
  }
}

