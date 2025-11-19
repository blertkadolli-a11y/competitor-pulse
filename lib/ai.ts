/**
 * AI abstraction layer for generating competitor reports
 * Supports OpenAI and can be extended to support other AI providers
 */

export interface AIReportRequest {
  competitorName: string;
  competitorWebsite: string;
  snapshots: Array<{
    id: string;
    createdAt: string;
    changesSummary: {
      text_changes?: string[];
      pricing_changes?: Array<{ old_price?: string; new_price?: string; description: string }>;
      feature_changes?: Array<{ type: string; feature: string; description?: string }>;
      new_sections?: string[];
      removed_sections?: string[];
    };
  }>;
}

export interface AIReportResponse {
  title: string;
  summary: string;
  keyChanges: string[];
  impact: {
    pricing?: string;
    features?: string;
    messaging?: string;
  };
  recommendations: string[];
}

/**
 * Generate an AI report for a competitor based on recent snapshots
 */
export async function generateCompetitorReport(
  request: AIReportRequest
): Promise<AIReportResponse> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    // Fallback to manual summary if OpenAI is not configured
    return generateFallbackReport(request);
  }

  try {
    const OpenAI = require('openai').default;
    const openai = new OpenAI({ apiKey });

    // Prepare snapshot data for AI
    const snapshotData = request.snapshots.map((snapshot, index) => {
      const changes: string[] = [];
      
      if (snapshot.changesSummary.text_changes?.length) {
        changes.push(`Text changes: ${snapshot.changesSummary.text_changes.join(', ')}`);
      }
      
      if (snapshot.changesSummary.pricing_changes?.length) {
        const pricing = snapshot.changesSummary.pricing_changes
          .map(p => `${p.description} (${p.old_price || 'N/A'} → ${p.new_price || 'N/A'})`)
          .join(', ');
        changes.push(`Pricing changes: ${pricing}`);
      }
      
      if (snapshot.changesSummary.feature_changes?.length) {
        const features = snapshot.changesSummary.feature_changes
          .map(f => `${f.type}: ${f.feature}${f.description ? ` - ${f.description}` : ''}`)
          .join(', ');
        changes.push(`Feature changes: ${features}`);
      }
      
      if (snapshot.changesSummary.new_sections?.length) {
        changes.push(`New sections: ${snapshot.changesSummary.new_sections.join(', ')}`);
      }
      
      if (snapshot.changesSummary.removed_sections?.length) {
        changes.push(`Removed sections: ${snapshot.changesSummary.removed_sections.join(', ')}`);
      }

      return {
        date: new Date(snapshot.createdAt).toLocaleDateString(),
        changes: changes.length > 0 ? changes.join('; ') : 'No significant changes detected',
      };
    });

    const prompt = `You are an expert competitive intelligence analyst. Analyze the following competitor website changes and generate a comprehensive report.

Competitor: ${request.competitorName}
Website: ${request.competitorWebsite}

Recent Snapshots:
${snapshotData.map((s, i) => `Snapshot ${i + 1} (${s.date}): ${s.changes}`).join('\n')}

Please provide a structured report in JSON format with the following structure:
{
  "title": "A concise, descriptive title for this report (max 100 characters)",
  "summary": "A 2-3 sentence executive summary of the key changes observed",
  "keyChanges": ["Change 1", "Change 2", "Change 3"],
  "impact": {
    "pricing": "Analysis of pricing impact (if applicable)",
    "features": "Analysis of feature/product impact (if applicable)",
    "messaging": "Analysis of messaging/positioning changes (if applicable)"
  },
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"]
}

Focus on actionable insights and strategic implications. If a category doesn't apply, use an empty string.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert competitive intelligence analyst. Generate concise, actionable reports in JSON format.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1500,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from AI');
    }

    const parsed = JSON.parse(responseText);
    
    // Validate and structure the response
    return {
      title: parsed.title || `Report for ${request.competitorName}`,
      summary: parsed.summary || 'Analysis of recent changes.',
      keyChanges: Array.isArray(parsed.keyChanges) ? parsed.keyChanges : [],
      impact: {
        pricing: parsed.impact?.pricing || '',
        features: parsed.impact?.features || '',
        messaging: parsed.impact?.messaging || '',
      },
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    };
  } catch (error: any) {
    console.error('Error generating AI report:', error);
    // Fallback to manual summary on error
    return generateFallbackReport(request);
  }
}

/**
 * Generate a fallback report when AI is not available
 */
function generateFallbackReport(request: AIReportRequest): AIReportResponse {
  const changesCount = request.snapshots.reduce((count, snapshot) => {
    const summary = snapshot.changesSummary;
    return (
      count +
      (summary.text_changes?.length || 0) +
      (summary.pricing_changes?.length || 0) +
      (summary.feature_changes?.length || 0) +
      (summary.new_sections?.length || 0) +
      (summary.removed_sections?.length || 0)
    );
  }, 0);

  const keyChanges: string[] = [];
  request.snapshots.forEach((snapshot) => {
    if (snapshot.changesSummary.text_changes?.length) {
      keyChanges.push(...snapshot.changesSummary.text_changes.slice(0, 3));
    }
    if (snapshot.changesSummary.pricing_changes?.length) {
      snapshot.changesSummary.pricing_changes.forEach((p) => {
        keyChanges.push(p.description);
      });
    }
    if (snapshot.changesSummary.feature_changes?.length) {
      snapshot.changesSummary.feature_changes.forEach((f) => {
        keyChanges.push(`${f.type}: ${f.feature}`);
      });
    }
  });

  return {
    title: `Activity Report: ${request.competitorName}`,
    summary: `Analyzed ${request.snapshots.length} recent snapshots and detected ${changesCount} total changes across the competitor's website.`,
    keyChanges: keyChanges.slice(0, 5),
    impact: {
      pricing: changesCount > 0 ? 'Monitor pricing changes closely for competitive positioning.' : '',
      features: changesCount > 0 ? 'Review feature changes to understand product direction.' : '',
      messaging: changesCount > 0 ? 'Analyze messaging shifts to identify market positioning changes.' : '',
    },
    recommendations: [
      'Continue monitoring this competitor regularly.',
      changesCount > 0 ? 'Review detailed changes in the snapshots section.' : 'No significant changes detected yet.',
      'Set up alerts for specific change types you care about.',
    ],
  };
}

/**
 * Format AI report response into readable content
 */
export function formatReportContent(report: AIReportResponse): string {
  let content = `# ${report.title}\n\n`;
  content += `## Executive Summary\n\n${report.summary}\n\n`;

  if (report.keyChanges.length > 0) {
    content += `## Key Changes\n\n`;
    report.keyChanges.forEach((change, index) => {
      content += `${index + 1}. ${change}\n`;
    });
    content += `\n`;
  }

  if (report.impact.pricing || report.impact.features || report.impact.messaging) {
    content += `## Impact Analysis\n\n`;
    if (report.impact.pricing) {
      content += `### Pricing Impact\n${report.impact.pricing}\n\n`;
    }
    if (report.impact.features) {
      content += `### Feature/Product Impact\n${report.impact.features}\n\n`;
    }
    if (report.impact.messaging) {
      content += `### Messaging/Positioning Impact\n${report.impact.messaging}\n\n`;
    }
  }

  if (report.recommendations.length > 0) {
    content += `## Recommendations\n\n`;
    report.recommendations.forEach((rec, index) => {
      content += `${index + 1}. ${rec}\n`;
    });
  }

  return content;
}

